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
        :class="currentPageIndex === i ? 'bg-blue-100 font-bold' : ''"
      >
        {{ p.name }}
      </div>

      <button @click="addPage" class="w-full mt-2 bg-green-500 text-white p-2 rounded">
        + Page
      </button>

      <hr class="my-4" />

      <!-- 🔥 SELECT SECTIONS -->
      <h2 class="font-bold mb-2">🧱 Ajouter section</h2>

      <select
        v-model="selectedSectionType"
        class="w-full border p-2 mb-2 rounded"
      >
        <option disabled value="">Choisir une section</option>
        <option
          v-for="name in filteredSections"
          :key="name"
          :value="name"
        >
          {{ name }}
        </option>
      </select>

      <button
        @click="addSelectedSection"
        class="w-full bg-blue-500 text-white p-2 rounded"
      >
        Ajouter
      </button>

    </div>

    <!-- CENTER -->
    <div class="flex-1 flex flex-col">

      <!-- TOP BAR -->
      <div v-if="mode === 'edit'" class="bg-white border-b p-3 flex gap-2">

        <button @click="saveData" class="bg-green-500 text-white px-3 py-1 rounded">
          💾 Save
        </button>

        <button @click="mode='preview'" class="bg-blue-500 text-white px-3 py-1 rounded">
          👁 Preview
        </button>

      </div>

      <!-- CANVAS -->
      <div class="flex-1 overflow-y-auto p-6">

        <div class="max-w-4xl mx-auto bg-white shadow rounded p-6">

          <!-- STRUCTURE -->
          <LogoSection />
          <HeaderSection />
          <MenuSection />

          <!-- MAIN -->
          <textarea
            v-if="mode==='edit'"
            v-model="pages[currentPageIndex].content"
            class="w-full min-h-[40vh] border p-3 mb-4"
            placeholder="Votre contenu ici..."
          />

          <div v-else v-html="pages[currentPageIndex].content"></div>

          <!-- SECTIONS -->
          <div
            v-for="section in pages[currentPageIndex].sections"
            :key="section.id"
            class="border mb-3 p-3 relative rounded"
          >

            <!-- DELETE -->
            <button
              v-if="mode==='edit'"
              @click.stop="deleteSection(section.id)"
              class="absolute top-1 right-1 text-red-500"
            >
              ✕
            </button>

            <!-- IMAGE SECTION -->
            <div v-if="section.type==='ImageSection'">

              <div v-if="mode==='edit'" class="mb-2">
                <input type="file" @change="uploadImage($event, section)" />
              </div>

              <img
                v-if="section.props.src"
                :src="section.props.src"
                class="w-full rounded"
              />

            </div>

            <!-- OTHER SECTIONS -->
            <div v-else>

              <textarea
                v-if="mode==='edit'"
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

      <!-- CODE VIEW -->
      <div v-if="mode==='edit'" class="h-48 bg-black text-green-400 p-2 text-xs overflow-auto">
        <pre>{{ selectedFile?.content }}</pre>
      </div>

    </div>

    <!-- RIGHT PANEL -->
    <div v-if="mode==='edit'" class="w-72 bg-white border-l p-4">

      <h2 class="font-bold mb-3">📁 Arborescence</h2>

      <div
        v-for="file in files"
        :key="file.name"
        @click="selectedFile=file"
        class="p-2 cursor-pointer hover:bg-gray-100"
        :class="selectedFile?.name===file.name && 'bg-blue-100'"
      >
        📄 {{ file.name }}

        <button
          v-if="file.sectionId"
          @click.stop="deleteSection(file.sectionId)"
          class="text-red-500 float-right"
        >
          ✕
        </button>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"

import LogoSection from "../components/sections/LogoSection.vue"
import HeaderSection from "../components/sections/HeaderSection.vue"
import MenuSection from "../components/sections/MenuSection.vue"
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
const pages = ref([])
const currentPageIndex = ref(0)
const selectedFile = ref(null)
const selectedSectionType = ref("")

/* LOAD */
onMounted(() => {
  const saved = localStorage.getItem("builderData")
  pages.value = saved ? JSON.parse(saved) : [{
    id: 1,
    name: "Accueil",
    content: "",
    sections: []
  }]
})

/* SAVE */
const saveData = () => {
  localStorage.setItem("builderData", JSON.stringify(pages.value))
  alert("✅ Sauvegardé")
}

/* ADD PAGE */
const addPage = () => {
  pages.value.push({
    id: Date.now(),
    name: "Nouvelle page",
    content: "",
    sections: []
  })
}

/* FILTER */
const filteredSections = computed(() => {
  return Object.keys(sectionRegistry).filter(
    s => !["LogoSection","HeaderSection","MenuSection","FooterSection"].includes(s)
  )
})

/* ADD SELECTED */
const addSelectedSection = () => {
  if (!selectedSectionType.value) return

  pages.value[currentPageIndex.value].sections.push({
    id: Date.now(),
    type: selectedSectionType.value,
    props: {}
  })

  selectedSectionType.value = ""
}

/* DELETE */
const deleteSection = (id) => {
  const page = pages.value[currentPageIndex.value]
  page.sections = page.sections.filter(s => s.id !== id)
}

/* IMAGE */
const uploadImage = (e, section) => {
  const file = e.target.files[0]
  const reader = new FileReader()

  reader.onload = () => {
    section.props.src = reader.result
  }

  reader.readAsDataURL(file)
}

/* FILE TREE */
const files = computed(() => {
  return [
    { name: "LogoSection.vue", content: "<Logo />" },
    { name: "HeaderSection.vue", content: "<Header />" },
    { name: "MenuSection.vue", content: "<Menu />" },
    ...pages.value[currentPageIndex.value].sections.map((s,i)=>({
      name: `${s.type}${i+1}.vue`,
      content: `<template>${s.props.content||''}</template>`,
      sectionId: s.id
    })),
    { name: "FooterSection.vue", content: "<Footer />" }
  ]
})
</script>
