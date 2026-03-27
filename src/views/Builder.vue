<template>
  <div class="p-6 bg-gray-100 min-h-screen flex flex-col items-center">

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
        v-else
        @click="mode = 'edit'"
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        ✏️ Edit
      </button>
    </div>

    <!-- 🔥 SECTIONS DISPONIBLES -->
    <div v-if="mode === 'edit'" class="mb-4 flex gap-2 flex-wrap justify-center">
      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec)"
        class="bg-blue-500 text-white px-3 py-1 rounded"
      >
        + {{ sec.name }}
      </button>
    </div>

    <!-- ================= PAGE ================= -->
    <div class="w-full max-w-[900px] bg-white shadow-lg rounded p-6">

      <!-- 🔝 LOGO -->
      <div class="mb-4 text-center">
        <LogoSection />
      </div>

      <!-- 📝 TITRE -->
      <div class="mb-6 text-center">
        <input
          v-if="mode === 'edit'"
          v-model="pageTitle"
          class="text-3xl font-bold border p-2 w-full text-center"
        />
        <h1 v-else class="text-3xl font-bold">
          {{ pageTitle }}
        </h1>
      </div>

      <!-- 🧱 MAIN SECTION -->
      <div class="w-full border-2 border-gray-300 bg-white rounded p-6 min-h-[80vh]">

        <div class="text-center text-xs text-gray-400 mb-4">
          🧱 MainSection (zone éditable)
        </div>

        <!-- 🔥 SECTIONS -->
        <div
          v-for="section in sections"
          :key="section.id"
          class="w-full border mb-4 rounded transition relative"
          :class="selectedSection?.id === section.id
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200'"
          @click="selectSection(section)"
        >

          <!-- 🔴 DELETE -->
          <button
            v-if="mode === 'edit'"
            @click.stop="deleteSection(section.id)"
            class="absolute top-2 right-2 text-red-500 text-xs border px-2 py-1 rounded bg-white"
          >
            🗑
          </button>

          <!-- ✏️ EDIT MODE -->
          <div v-if="mode === 'edit' && selectedSection?.id === section.id" class="p-4">

            <!-- TOOLBAR -->
            <div class="flex gap-2 mb-3 border-b pb-2">
              <button @click="applyBold(section)" class="px-2 border rounded font-bold">B</button>
              <button @click="applyUppercase(section)" class="px-2 border rounded">Aa</button>
              <button @click="applyEmoji(section)" class="px-2 border rounded">😊</button>
              <input type="color" v-model="section.props.color" />
            </div>

            <!-- TEXTAREA -->
            <textarea
              v-model="section.props.title"
              class="w-full border p-3 rounded min-h-[120px]"
              placeholder="Écris ton contenu ici..."
            />

          </div>

          <!-- 👁 PREVIEW -->
          <div v-else class="p-4 whitespace-pre-line" :style="{ color: section.props.color }">
            {{ section.props.title }}
          </div>

        </div>

      </div>

      <!-- 🔻 FOOTER -->
      <div class="mt-6 text-center">
        <FooterSection />
      </div>

    </div>

    <!-- ================= FILES ================= -->
    <div class="w-full max-w-[900px] mt-6 bg-white p-4 border rounded">

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

      <!-- CODE VIEW -->
      <div class="mt-4 bg-black text-green-400 p-3 h-64 overflow-auto text-xs rounded">
        <div class="text-white mb-2 font-bold">
          {{ selectedFile?.name }}
        </div>

        <pre>{{ selectedFile?.content }}</pre>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed } from "vue"

import LogoSection from "../components/sections/LogoSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"

/* STATE */
const mode = ref("edit")
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref(null)
const pageTitle = ref("Titre par défaut")

/* SECTIONS DISPONIBLES */
const availableSections = [
  { name: "Texte", type: "Text" },
  { name: "Titre", type: "Heading" },
  { name: "Paragraphe", type: "Paragraph" }
]

/* ADD */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now(),
    type: sec.type,
    props: {
      title: "Nouveau contenu",
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

/* MODE */
const saveAndPreview = () => {
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
