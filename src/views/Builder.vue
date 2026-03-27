<template>
  <div class="h-screen flex bg-gray-100">

    <!-- LEFT PANEL -->
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

      <button @click="addPage" class="w-full mt-2 bg-green-500 text-white p-2 rounded">
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

      <!-- 🔥 IMAGE SECTION -->
      <button
        @click="addSection('ImageSection')"
        class="w-full text-left px-3 py-2 mb-2 rounded border bg-yellow-50 hover:bg-yellow-100"
      >
        + Image
      </button>

    </div>

    <!-- CENTER -->
    <div class="flex-1 flex flex-col">

      <!-- TOP BAR -->
      <div v-if="mode === 'edit'" class="bg-white border-b p-3 flex justify-between items-center">

        <div class="flex gap-2">
          <button @click="saveData" class="bg-green-500 text-white px-3 py-1 rounded">
            💾 Sauvegarder
          </button>

          <button @click="mode = 'preview'" class="bg-blue-500 text-white px-3 py-1 rounded">
            👁 Preview
          </button>
        </div>

        <div class="font-bold">Builder</div>

      </div>

      <!-- CANVAS -->
      <div class="flex-1 overflow-y-auto" :class="mode === 'preview' ? 'p-0' : 'p-6'">

        <div :class="mode === 'preview'
          ? 'w-full min-h-screen bg-white'
          : 'max-w-4xl mx-auto bg-white rounded-xl shadow p-6'">

          <!-- HEADER -->
          <div class="flex items-center justify-center gap-3 mb-6">
            <LogoSection />

            <input
              v-if="mode === 'edit'"
              v-model="pages[currentPageIndex].title"
              class="text-2xl font-bold border-b"
            />

            <h1 v-else>{{ pages[currentPageIndex].title }}</h1>
          </div>

          <!-- MENU -->
          <div class="flex gap-2 justify-center mb-6">
            <button
              v-for="(p, i) in pages"
              :key="p.id"
              @click="currentPageIndex = i"
              class="px-3 py-1 border rounded"
              :class="i === currentPageIndex && 'bg-blue-500 text-white'"
            >
              {{ p.name }}
            </button>
          </div>

          <!-- MAIN -->
          <textarea
            v-if="mode === 'edit'"
            v-model="pages[currentPageIndex].content"
            class="w-full min-h-[50vh] border p-3 mb-4"
          />

          <div v-else v-html="pages[currentPageIndex].content"></div>

          <!-- SECTIONS -->
          <div
            v-for="section in pages[currentPageIndex].sections"
            :key="section.id"
            class="border mb-3 p-3 relative"
            @click="selectSection(section)"
          >

            <button
              v-if="mode === 'edit'"
              @click.stop="deleteSection(section.id)"
              class="absolute top-1 right-1 text-red-500"
            >
              ✕
            </button>

            <!-- IMAGE SECTION -->
            <div v-if="section.type === 'ImageSection'">

              <input
                v-if="mode === 'edit'"
                type="file"
                @change="uploadImage($event, section)"
              />

              <img
                v-if="section.props.src"
                :src="section.props.src"
                class="w-full rounded mt-2"
              />

            </div>

            <!-- NORMAL SECTION -->
            <div v-else>

              <textarea
                v-if="mode === 'edit'"
                v-model="section.props.content"
                class="w-full border p-2"
              />

              <component
                v-else
                :is="sectionRegistry[section.type]"
                v-bind="section.props"
              />

            </div>

          </div>

          <FooterSection />

        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import LogoSection from "../components/sections/LogoSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"

/* AUTO LOAD */
const modules = import.meta.glob("../components/sections/*.vue", { eager: true })
const sectionRegistry = {}

for (const path in modules) {
  const name = path.split("/").pop().replace(".vue", "")
  sectionRegistry[name] = modules[path].default
}

/* STATE */
const mode = ref("edit")
const currentPageIndex = ref(0)
const selectedSection = ref(null)

const pages = ref([])

/* LOAD */
onMounted(() => {
  const saved = localStorage.getItem("builderData")
  if (saved) pages.value = JSON.parse(saved)
  else {
    pages.value = [
      {
        id: 1,
        name: "Accueil",
        title: "Mon site",
        content: "",
        sections: []
      }
    ]
  }
})

/* SAVE */
const saveData = () => {
  localStorage.setItem("builderData", JSON.stringify(pages.value))
  alert("✅ Sauvegardé !")
}

/* PAGE */
const addPage = () => {
  pages.value.push({
    id: Date.now(),
    name: "Nouvelle page",
    title: "Titre",
    content: "",
    sections: []
  })
}

/* SECTION */
const addSection = (type) => {
  pages.value[currentPageIndex.value].sections.push({
    id: Date.now(),
    type,
    props: {}
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

/* IMAGE UPLOAD */
const uploadImage = (e, section) => {
  const file = e.target.files[0]
  const reader = new FileReader()

  reader.onload = () => {
    section.props.src = reader.result
  }

  reader.readAsDataURL(file)
}
</script>
