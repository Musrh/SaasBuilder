<template>
  <div
    class="p-6 bg-gray-100 min-h-screen flex flex-col items-center"
    @click.self="selectedSection = null"
  >

    <!-- 🔥 MODE SWITCH -->
    <div class="mb-4 flex gap-2">
      <button
        v-if="mode === 'edit'"
        @click="saveAndPreview"
        class="bg-green-500 text-white px-4 py-2 rounded-lg shadow"
      >
        💾 Preview
      </button>

      <button
        v-else
        @click="mode = 'edit'"
        class="bg-blue-500 text-white px-4 py-2 rounded-lg shadow"
      >
        ✏️ Edit
      </button>
    </div>

    <!-- 🔥 SECTIONS -->
    <div v-if="mode === 'edit'" class="mb-4 flex gap-2 flex-wrap justify-center">
      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec)"
        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg"
      >
        + {{ sec.name }}
      </button>
    </div>

    <!-- ================= PAGE ================= -->
    <div class="w-full max-w-[900px] bg-white shadow-xl rounded-2xl p-6">

      <!-- LOGO -->
      <div class="mb-4 text-center">
        <LogoSection />
      </div>

      <!-- TITLE -->
      <div class="mb-6 text-center">
        <input
          v-if="mode === 'edit'"
          v-model="pageTitle"
          class="text-3xl font-bold border p-2 w-full text-center rounded"
        />
        <h1 v-else class="text-3xl font-bold">
          {{ pageTitle }}
        </h1>
      </div>

      <!-- MAIN -->
      <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 min-h-[300px]">

        <div class="text-center text-gray-400 text-sm mb-4">
          🧱 MainSection (zone éditable)
        </div>

        <!-- CONTENU GLOBAL -->
        <textarea
          v-if="mode === 'edit'"
          v-model="mainContent"
          class="w-full border p-4 rounded-lg mb-6"
        />

        <div
          v-else
          class="mb-6"
          v-html="mainContent"
        ></div>

        <!-- SECTIONS -->
        <div
          v-for="section in sections"
          :key="section.id"
          @click.stop="selectSection(section)"
          class="relative border rounded-lg mb-4 transition"
          :class="selectedSection?.id === section.id
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200'"
        >

          <!-- DELETE -->
          <button
            v-if="mode === 'edit'"
            @click.stop="deleteSection(section.id)"
            class="absolute top-2 right-2 text-red-500 text-xs bg-white border px-2 py-1 rounded"
          >
            🗑
          </button>

          <!-- EDIT -->
          <div v-if="mode === 'edit' && selectedSection?.id === section.id" class="p-4">

            <!-- TOOLBAR -->
            <div class="flex gap-2 mb-3 border-b pb-2">
              <button @click="applyBold(section)" class="tool">B</button>
              <button @click="applyUppercase(section)" class="tool">Aa</button>
              <button @click="applyEmoji(section)" class="tool">😊</button>
              <input type="color" v-model="section.props.color" />
            </div>

            <!-- TEXT -->
            <textarea
              v-model="section.props.title"
              class="w-full border p-3 rounded-lg min-h-[120px]"
            />

          </div>

          <!-- PREVIEW -->
          <div
            v-else
            class="p-4"
            :style="{ color: section.props.color }"
            v-html="section.props.title"
          />

        </div>

      </div>

      <!-- FOOTER -->
      <div class="mt-6 text-center">
        <FooterSection />
      </div>

    </div>

    <!-- ================= FILES ================= -->
    <div class="w-full max-w-[900px] mt-6 bg-white p-4 border rounded-xl shadow">

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
      <div class="mt-4 bg-black text-green-400 p-3 h-64 overflow-auto text-xs rounded-lg">
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
const mainContent = ref("Mon site créé avec mon builder")

/* SECTIONS */
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

  if (selectedSection.value?.id === id) {
    selectedSection.value = null
  }
}

/* TOOLS */
const applyBold = (section) => {
  section.props.title = `<b>${section.props.title}</b>`
}

const applyUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const applyEmoji = (section) => {
  section.props.title += " 😊"
}

/* MODE */
const saveAndPreview = () => {
  selectedSection.value = null
  mode.value = "preview"
}

/* FILES */
const computedFiles = computed(() => {
  const base = [
    {
      name: "index.html",
      content: `<body>\n<h1>${pageTitle.value}</h1>\n${mainContent.value}\n</body>`
    },
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

<style>
.tool {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}

.tool:hover {
  background: #eee;
}
</style>
