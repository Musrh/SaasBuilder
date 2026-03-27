<template>
  <div class="p-6 bg-gray-100 min-h-screen">

    <!-- 🔥 MODE SWITCH -->
    <div class="mb-4 flex gap-2">
      <button
        v-if="mode === 'edit'"
        @click="saveAndPreview"
        class="bg-green-500 text-white px-4 py-2 rounded"
      >
        💾 Preview
      </button>

      <button
        v-else"
        @click="mode = 'edit'"
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        ✏️ Edit
      </button>
    </div>

    <div class="flex gap-6">

      <!-- ================= LEFT ================= -->
      <div class="flex-1">

        <!-- 🔥 SECTIONS -->
        <div v-if="mode === 'edit'" class="mb-4 flex gap-2 flex-wrap">
          <button
            v-for="sec in availableSections"
            :key="sec.type"
            @click="addSection(sec)"
            class="bg-blue-500 text-white px-3 py-1 rounded"
          >
            + {{ sec.name }}
          </button>
        </div>

        <!-- 🔥 PAGE -->
        <div class="flex justify-center">

          <div class="w-full max-w-3xl bg-white shadow-xl rounded-lg overflow-hidden">

            <!-- HEADER -->
            <div class="border-b bg-gray-50 p-4">
              <HeaderSection />
            </div>

            <!-- MAIN -->
            <div class="border-4 border-dashed border-blue-400 min-h-[400px] p-6">

              <div class="text-xs text-gray-400 mb-4 text-center">
                🧱 MainSection (zone éditable)
              </div>

              <div
                v-for="section in sections"
                :key="section.id"
                class="border p-4 mb-3 rounded cursor-pointer"
                :class="selectedSection?.id === section.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'"
                @click="selectSection(section)"
              >

                <!-- 🔥 EDIT MODE -->
                <div v-if="mode === 'edit' && selectedSection?.id === section.id">

                  <div class="flex gap-2 mb-2">
                    <button @click="applyBold(section)" class="border px-2 rounded font-bold">B</button>
                    <button @click="applyUppercase(section)" class="border px-2 rounded">Aa</button>
                    <button @click="applyEmoji(section)" class="border px-2 rounded">😊</button>
                    <input type="color" v-model="section.props.color" />
                  </div>

                  <input
                    v-model="section.props.title"
                    class="border p-2 w-full rounded"
                  />

                  <button
                    @click.stop="deleteSection(section.id)"
                    class="text-red-500 text-xs mt-2"
                  >
                    🗑 Supprimer
                  </button>

                </div>

                <!-- 🔥 PREVIEW -->
                <div v-else :style="{ color: section.props.color }">
                  {{ section.props.title }}
                </div>

              </div>

            </div>

            <!-- FOOTER -->
            <div class="border-t bg-gray-50 p-4">
              <FooterSection />
            </div>

          </div>

        </div>

      </div>

      <!-- ================= RIGHT (FILES) ================= -->
      <div class="w-80 bg-white border rounded p-3">

        <h3 class="font-bold mb-3">📁 Fichiers</h3>

        <div class="space-y-1 text-sm">

          <div
            v-for="file in computedFiles"
            :key="file.name"
            @click="selectFile(file)"
            class="p-2 rounded cursor-pointer flex justify-between"
            :class="selectedFile?.name === file.name ? 'bg-blue-100 font-bold' : ''"
          >

            <span>📄 {{ file.name }}</span>

            <button
              v-if="file.deletable"
              @click.stop="deleteSection(file.sectionId)"
              class="text-red-500 text-xs"
            >
              ✕
            </button>

          </div>

        </div>

        <!-- CODE -->
        <div class="mt-4 bg-black text-green-400 p-3 h-64 overflow-auto text-xs rounded">

          <div class="text-white mb-2 font-bold">
            {{ selectedFile?.name }}
          </div>

          <pre>{{ selectedFile?.content }}</pre>

        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import { auth, db } from "../firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

import HeaderSection from "../components/sections/HeaderSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"

/* STATE */
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref(null)
const mode = ref("edit")

let userId = null

/* SECTIONS DISPONIBLES */
const availableSections = [
  { name: "Texte", type: "Text" },
  { name: "Header", type: "Header" }
]

/* LOAD */
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return

    userId = user.uid
    const snap = await getDoc(doc(db, "users", user.uid))

    if (snap.exists()) {
      sections.value = snap.data().sections || []
    }
  })
})

/* ADD */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now(),
    type: sec.type,
    props: {
      title: "Nouveau texte",
      color: "#000000"
    }
  })
}

/* SELECT */
const selectSection = (section) => {
  if (mode.value === "preview") return
  selectedSection.value = section
}

/* DELETE */
const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)
}

/* TOOLS */
const applyBold = (section) => {
  section.props.title = `**${section.props.title}**`
}

const applyUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const applyEmoji = (section) => {
  section.props.title += " 😊"
}

/* SAVE */
const saveAndPreview = async () => {
  if (!userId) return

  await updateDoc(doc(db, "users", userId), {
    sections: sections.value
  })

  mode.value = "preview"
}

/* FILES */
const computedFiles = computed(() => {
  const base = [
    { name: "App.vue", content: "<template>App</template>" },
    { name: "MainSection.vue", content: "<template>Main</template>" }
  ]

  const dynamic = sections.value.map((s, i) => ({
    name: `${s.type}${i + 1}.vue`,
    content: `<template>\n  <div>${s.props.title}</div>\n</template>`,
    deletable: true,
    sectionId: s.id
  }))

  return [...base, ...dynamic]
})

const selectFile = (file) => {
  selectedFile.value = file
}
</script>
