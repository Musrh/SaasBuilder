<template>
  <div class="h-screen flex bg-gray-100">

    <!-- 🧭 LEFT PANEL (SECTIONS) -->
    <div
      v-if="mode === 'edit'"
      class="w-64 bg-white border-r p-4 overflow-y-auto"
    >
      <h2 class="text-lg font-bold mb-4">🧱 Sections</h2>

      <button
        v-for="(comp, name) in sectionRegistry"
        :key="name"
        @click="addSection(name)"
        class="w-full text-left px-3 py-2 mb-2 rounded-lg border hover:bg-blue-50 hover:border-blue-400 transition"
      >
        + {{ name }}
      </button>
    </div>

    <!-- 🖥 CENTER -->
    <div class="flex-1 flex flex-col">

      <!-- TOP BAR -->
      <div
        v-if="mode === 'edit'"
        class="bg-white border-b p-3 flex justify-between items-center shadow-sm"
      >
        <div class="flex gap-2">
          <button @click="mode = 'edit'" :class="modeBtn('edit')">
            ✏️ Edit
          </button>
          <button @click="mode = 'preview'" :class="modeBtn('preview')">
            👁 Preview
          </button>
        </div>

        <div class="font-semibold text-gray-600">
          Builder SaaS
        </div>
      </div>

      <!-- CANVAS -->
      <div
        class="flex-1 overflow-y-auto"
        :class="mode === 'preview' ? 'p-0' : 'p-6'"
      >
        <div
          :class="mode === 'preview'
            ? 'w-full min-h-screen bg-white'
            : 'max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6'"
        >

          <!-- TITLE -->
          <input
            v-if="mode === 'edit'"
            v-model="pageTitle"
            class="text-3xl font-bold w-full border-b mb-6 outline-none"
          />

          <h1 v-else class="text-3xl font-bold mb-6">
            {{ pageTitle }}
          </h1>

          <!-- MAIN CONTENT -->
          <textarea
            v-if="mode === 'edit'"
            v-model="mainContent"
            class="w-full min-h-[60vh] border p-4 rounded-lg mb-6 resize-none"
          />

          <div
            v-else
            v-html="mainContent"
            class="w-full min-h-[60vh]"
          ></div>

          <!-- SECTIONS -->
          <div
            v-for="section in sections"
            :key="section.id"
            class="relative group border rounded-xl mb-4 overflow-hidden"
            @click="selectSection(section)"
          >

            <!-- DELETE -->
            <div
              v-if="mode === 'edit'"
              class="absolute top-2 right-2 hidden group-hover:flex gap-2"
            >
              <button
                @click.stop="deleteSection(section.id)"
                class="bg-white shadow px-2 py-1 text-xs rounded text-red-500"
              >
                🗑
              </button>
            </div>

            <!-- EDIT -->
            <div
              v-if="mode === 'edit' && selectedSection?.id === section.id"
              class="p-4 bg-blue-50"
            >
              <!-- TOOLBAR -->
              <div class="flex gap-2 mb-3">
                <button @click="bold(section)" class="tool">B</button>
                <button @click="upper(section)" class="tool">Aa</button>
                <button @click="emoji(section)" class="tool">😊</button>
                <input type="color" v-model="section.props.color" />
              </div>

              <textarea
                v-model="section.props.content"
                class="w-full border p-3 rounded-lg"
              />
            </div>

            <!-- PREVIEW -->
            <component
              v-else
              :is="sectionRegistry[section.type]"
              v-bind="section.props"
            />

          </div>

        </div>
      </div>

      <!-- CODE (EDIT ONLY) -->
      <div
        v-if="mode === 'edit'"
        class="h-56 bg-black text-green-400 text-xs p-3 overflow-auto"
      >
        <pre>{{ generatedCode }}</pre>
      </div>

    </div>

    <!-- 📁 RIGHT PANEL (FILES) -->
    <div
      v-if="mode === 'edit'"
      class="w-72 bg-white border-l p-4 overflow-y-auto"
    >
      <h2 class="text-lg font-bold mb-4">📁 Fichiers</h2>

      <div
        v-for="file in files"
        :key="file.name"
        @click="selectedFile = file"
        class="p-2 rounded cursor-pointer hover:bg-gray-100"
        :class="selectedFile?.name === file.name && 'bg-blue-100 font-bold'"
      >
        📄 {{ file.name }}
      </div>

      <div class="mt-4 bg-gray-900 text-green-400 p-3 text-xs h-40 overflow-auto rounded">
        <pre>{{ selectedFile?.content }}</pre>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from "vue"

/* 🔥 AUTO LOAD SECTIONS */
const modules = import.meta.glob("../components/sections/*.vue", { eager: true })

const sectionRegistry = {}

for (const path in modules) {
  const name = path.split("/").pop().replace(".vue", "")
  sectionRegistry[name] = modules[path].default
}

/* STATE */
const mode = ref("edit")
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref(null)

const pageTitle = ref("Mon site")
const mainContent = ref("<p>Bienvenue sur mon site</p>")

/* ADD */
const addSection = (type) => {
  sections.value.push({
    id: Date.now(),
    type,
    props: {
      content: "Nouveau contenu",
      color: "#000000"
    }
  })
}

/* SELECT */
const selectSection = (s) => {
  if (mode.value === "preview") return
  selectedSection.value = s
}

/* DELETE */
const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)
  if (selectedSection.value?.id === id) selectedSection.value = null
}

/* TOOLS */
const bold = (s) => s.props.content = `<b>${s.props.content}</b>`
const upper = (s) => s.props.content = s.props.content.toUpperCase()
const emoji = (s) => s.props.content += " 🚀"

/* UI */
const modeBtn = (m) =>
  `px-3 py-1 rounded ${mode.value === m ? "bg-blue-500 text-white" : "bg-gray-200"}`

/* FILES */
const files = computed(() => {
  return [
    { name: "index.html", content: generatedCode.value },
    ...sections.value.map((s, i) => ({
      name: `${s.type}${i + 1}.vue`,
      content: `<template><div>${s.props.content}</div></template>`
    }))
  ]
})

/* GENERATED CODE */
const generatedCode = computed(() => {
  return `
<html>
  <body>
    <h1>${pageTitle.value}</h1>
    ${mainContent.value}
    ${sections.value.map(s => `<div>${s.props.content}</div>`).join("")}
  </body>
</html>
  `
})
</script>

<style>
.tool {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
}
.tool:hover {
  background: #eee;
}
</style>
