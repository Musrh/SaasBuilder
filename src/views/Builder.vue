<template>
  <div class="p-6">

    <h1 class="text-2xl font-bold mb-4">
      Builder
    </h1>

    <!-- 🔥 MODE SWITCH -->
    <div class="mb-4 flex items-center gap-3">

      <button
        v-if="mode === 'edit'"
        @click="saveAndPreview"
        class="bg-green-500 text-white px-4 py-2 rounded"
      >
        💾 Sauvegarder → Preview
      </button>

      <button
        v-else
        @click="mode = 'edit'"
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        ✏️ Revenir au mode Édition
      </button>

      <span class="text-sm text-gray-500">
        Mode actuel: <b>{{ mode }}</b>
      </span>

    </div>

    <!-- LOADING -->
    <div v-if="loading">
      Chargement...
    </div>

    <div v-else class="flex gap-4">

      <!-- ================= LEFT ================= -->
      <div class="flex-1">

        <!-- MAIN CONTAINER -->
        <div class="border-4 border-dashed border-blue-400 p-4 rounded-lg min-h-[400px] bg-gray-50">

          <div class="text-xs text-gray-500 mb-3">
            ✏️ MainSection Builder Zone
          </div>

          <div
            v-for="section in sections"
            :key="section.id"
            class="border p-4 mb-3 rounded transition"
            :class="selectedSection?.id === section.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'"
            @click="selectSection(section)"
          >

            <!-- 🔥 HEADER -->
            <div class="flex justify-between items-center mb-2">

              <strong>{{ section.type }}</strong>

              <button
                v-if="mode === 'edit'"
                @click.stop="deleteSection(section.id)"
                class="text-red-500 text-xs border px-2 py-1 rounded"
              >
                🗑
              </button>

            </div>

            <!-- ================= EDIT MODE ================= -->
            <div v-if="mode === 'edit' && selectedSection?.id === section.id">

              <!-- 🔥 TOOLBAR FIXÉE -->
              <div class="flex gap-2 mb-3 border-b pb-2">

                <button @click="applyBold(section)" class="px-2 border rounded font-bold">
                  B
                </button>

                <button @click="applyUppercase(section)" class="px-2 border rounded">
                  Aa
                </button>

                <button @click="applyEmoji(section)" class="px-2 border rounded">
                  😊
                </button>

                <!-- 🎨 COLOR -->
                <input
                  type="color"
                  v-model="section.props.color"
                  class="w-8 h-8"
                />

              </div>

              <!-- INPUT -->
              <input
                v-model="section.props.title"
                class="border p-2 w-full rounded"
              />

            </div>

            <!-- ================= PREVIEW MODE ================= -->
            <div v-else>
              <div :style="{ color: section.props.color }">
                {{ section.props.title }}
              </div>
            </div>

          </div>

        </div>

      </div>

      <!-- ================= RIGHT ================= -->
      <div class="w-80 border-l pl-4">

        <h3 class="font-bold mb-2">📁 Arborescence</h3>

        <div class="space-y-2 text-sm">

          <div
            v-for="file in files"
            :key="file.name"
            @click="selectFile(file.name)"
            class="p-2 rounded cursor-pointer"
            :class="selectedFile === file.name ? 'bg-blue-100 font-bold' : ''"
          >
            📄 {{ file.name }}
          </div>

        </div>

        <div class="mt-4 bg-black text-green-400 p-3 h-64 overflow-auto text-xs rounded">

          <div class="text-white mb-2 font-bold">
            {{ selectedFile }}
          </div>

          <pre class="whitespace-pre-wrap">
{{ getFileContent(selectedFile) }}
          </pre>

        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { auth, db } from "../firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

/* 🔹 STATE */
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref("App.vue")
const loading = ref(true)
const mode = ref("edit")

let userId = null

/* 🔹 FILES */
const files = ref([
  {
    name: "App.vue",
    content: `<template>
  <div>App</div>
</template>`
  },
  {
    name: "MainSection.vue",
    content: `<template>
  <section>Main Section</section>
</template>`
  }
])

/* 🔥 LOAD */
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return

    userId = user.uid
    const snap = await getDoc(doc(db, "users", user.uid))

    if (snap.exists()) {
      sections.value = snap.data().sections || []
    }

    loading.value = false
  })
})

/* ================== MODE ================== */

const saveAndPreview = async () => {
  await saveSections()
  mode.value = "preview"
}

/* ================== SECTION ================== */

const selectSection = (section) => {
  if (mode.value === "preview") return
  selectedSection.value = section
}

const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)
}

/* ================== TOOLS ================== */

const applyBold = (section) => {
  section.props.title = `**${section.props.title}**`
}

const applyUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const applyEmoji = (section) => {
  section.props.title += " 😊"
}

/* ================== FILES ================== */

const selectFile = (name) => {
  selectedFile.value = name
}

const getFileContent = (name) => {
  return files.value.find(f => f.name === name)?.content || "// vide"
}

/* ================== SAVE ================== */

const saveSections = async () => {
  if (!userId) return

  await updateDoc(doc(db, "users", userId), {
    sections: sections.value
  })
}
</script>

<style scoped>
</style>
