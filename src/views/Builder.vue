<template>
  <div class="h-screen flex bg-gray-100">

    <!-- 🧭 LEFT PANEL -->
    <div v-if="mode === 'edit'" class="w-64 bg-white border-r p-4 overflow-y-auto">

      <h2 class="font-bold mb-3">📄 Pages</h2>

      <div
        v-for="(p, i) in pages"
        :key="p.id"
        @click="currentPageIndex = i"
        class="p-2 rounded cursor-pointer mb-1"
        :class="currentPageIndex === i ? 'bg-blue-100 font-bold' : 'hover:bg-gray-100'"
      >
        {{ p.name }}
      </div>

      <button
        @click="addPage"
        class="w-full mt-2 bg-green-500 text-white p-2 rounded"
      >
        + Nouvelle page
      </button>

      <hr class="my-4" />

      <h2 class="font-bold mb-3">🧱 Sections</h2>

      <button
        v-for="(comp, name) in sectionRegistry"
        :key="name"
        @click="addSection(name)"
        class="w-full text-left px-3 py-2 mb-2 rounded border hover:bg-blue-50"
      >
        + {{ name }}
      </button>

    </div>

    <!-- 🖥 CENTER -->
    <div class="flex-1 flex flex-col">

      <!-- TOP BAR -->
      <div v-if="mode === 'edit'" class="bg-white border-b p-3 flex justify-between">

        <div class="flex gap-2">
          <button @click="mode = 'edit'" :class="modeBtn('edit')">Edit</button>
          <button @click="mode = 'preview'" :class="modeBtn('preview')">Preview</button>
        </div>

        <div class="font-bold">Builder</div>

      </div>

      <!-- CANVAS -->
      <div class="flex-1 overflow-y-auto" :class="mode === 'preview' ? 'p-0' : 'p-6'">

        <div :class="mode === 'preview'
          ? 'w-full min-h-screen bg-white'
          : 'max-w-4xl mx-auto bg-white rounded-xl shadow p-6'">

          <!-- 🔝 HEADER -->
          <div class="flex items-center justify-center gap-3 mb-6">

            <LogoSection />

            <input
              v-if="mode === 'edit'"
              v-model="pages[currentPageIndex].title"
              class="text-2xl font-bold border-b outline-none"
            />

            <h1 v-else class="text-2xl font-bold">
              {{ pages[currentPageIndex].title }}
            </h1>

          </div>

          <!-- 🧭 MENU PAGES -->
          <div class="flex gap-3 justify-center mb-6">
            <button
              v-for="(p, i) in pages"
              :key="p.id"
              @click="currentPageIndex = i"
              class="px-3 py-1 rounded border"
              :class="i === currentPageIndex ? 'bg-blue-500 text-white' : ''"
            >
              {{ p.name }}
            </button>
          </div>

          <!-- 🧱 MAIN CONTENT -->
          <textarea
            v-if="mode === 'edit'"
            v-model="pages[currentPageIndex].content"
            class="w-full min-h-[50vh] border p-3 rounded mb-4"
          />

          <div
            v-else
            v-html="pages[currentPageIndex].content"
            class="mb-4"
          ></div>

          <!-- 🔥 SECTIONS PAR PAGE -->
          <div
            v-for="section in pages[currentPageIndex].sections"
            :key="section.id"
            class="relative border rounded mb-3"
            @click="selectSection(section)"
          >

            <button
              v-if="mode === 'edit'"
              @click.stop="deleteSection(section.id)"
              class="absolute top-1 right-1 text-red-500 text-xs"
            >
              ✕
            </button>

            <!-- EDIT -->
            <div v-if="mode === 'edit' && selectedSection?.id === section.id" class="p-3 bg-blue-50">

              <div class="flex gap-2 mb-2">
                <button @click="bold(section)">B</button>
                <button @click="emoji(section)">😊</button>
                <input type="color" v-model="section.props.color" />
              </div>

              <textarea v-model="section.props.content" class="w-full border p-2" />

            </div>

            <!-- PREVIEW -->
            <component
              v-else
              :is="sectionRegistry[section.type]"
              v-bind="section.props"
            />

          </div>

          <!-- 🔻 FOOTER -->
          <FooterSection />

        </div>
      </div>

      <!-- CODE -->
      <div v-if="mode === 'edit'" class="h-56 bg-black text-green-400 p-2 text-xs overflow-auto">
        <pre>{{ generatedCode }}</pre>
      </div>

    </div>

    <!-- 📁 FILES -->
    <div v-if="mode === 'edit'" class="w-72 bg-white border-l p-4">

      <h2 class="font-bold mb-3">📁 Fichiers</h2>

      <div
        v-for="file in files"
        :key="file.name"
        @click="selectedFile = file"
        class="p-2 cursor-pointer hover:bg-gray-100"
      >
        {{ file.name }}
      </div>

      <pre class="mt-3 bg-gray-900 text-green-400 p-2 text-xs h-40 overflow-auto">
{{ selectedFile?.content }}
      </pre>

    </div>

  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import LogoSection from "../components/sections/LogoSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"

/* 🔥 AUTO IMPORT */
const modules = import.meta.glob("../components/sections/*.vue", { eager: true })
const sectionRegistry = {}

for (const path in modules) {
  const name = path.split("/").pop().replace(".vue", "")
  sectionRegistry[name] = modules[path].default
}

/* STATE */
const mode = ref("edit")
const selectedSection = ref(null)
const selectedFile = ref(null)

const currentPageIndex = ref(0)

/* 🆕 PAGES */
const pages = ref([
  {
    id: 1,
    name: "Accueil",
    title: "Mon site",
    content: "<p>Bienvenue</p>",
    sections: []
  }
])

/* ADD PAGE */
const addPage = () => {
  pages.value.push({
    id: Date.now(),
    name: "Nouvelle page",
    title: "Titre",
    content: "",
    sections: []
  })
}

/* ADD SECTION */
const addSection = (type) => {
  pages.value[currentPageIndex.value].sections.push({
    id: Date.now(),
    type,
    props: {
      content: "Nouveau contenu",
      color: "#000"
    }
  })
}

/* DELETE */
const deleteSection = (id) => {
  const page = pages.value[currentPageIndex.value]
  page.sections = page.sections.filter(s => s.id !== id)
}

/* SELECT */
const selectSection = (s) => {
  if (mode.value === "preview") return
  selectedSection.value = s
}

/* TOOLS */
const bold = (s) => s.props.content = `<b>${s.props.content}</b>`
const emoji = (s) => s.props.content += " 🚀"

/* UI */
const modeBtn = (m) =>
  `px-3 py-1 rounded ${mode.value === m ? "bg-blue-500 text-white" : "bg-gray-200"}`

/* FILES */
const files = computed(() => {
  return pages.value.map(p => ({
    name: `${p.name}.html`,
    content: `<h1>${p.title}</h1>${p.content}`
  }))
})

/* CODE */
const generatedCode = computed(() => {
  return pages.value.map(p => `
<h1>${p.title}</h1>
${p.content}
${p.sections.map(s => `<div>${s.props.content}</div>`).join("")}
`).join("\n")
})
</script>
