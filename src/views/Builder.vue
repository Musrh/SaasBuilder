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

      <h2 class="font-bold mb-3">🧱 Sections</h2>

      <button
        v-for="(comp, name) in filteredSections"
        :key="name"
        @click="addSection(name)"
        class="w-full text-left px-3 py-2 mb-2 rounded border hover:bg-blue-50"
      >
        + {{ name }}
      </button>

    </div>

    <!-- CENTER -->
    <div class="flex-1 flex flex-col">

      <!-- TOP BAR -->
      <div v-if="mode === 'edit'" class="bg-white border-b p-3 flex justify-between">

        <div class="flex gap-2">
          <button @click="saveData" class="bg-green-500 text-white px-3 py-1 rounded">
            💾 Save
          </button>

          <button @click="mode='preview'" class="bg-blue-500 text-white px-3 py-1 rounded">
            👁 Preview
          </button>
        </div>

      </div>

      <!-- CANVAS -->
      <div class="flex-1 overflow-y-auto" :class="mode==='preview' ? 'p-0' : 'p-6'">

        <div :class="mode==='preview'
          ? 'w-full min-h-screen bg-white'
          : 'max-w-4xl mx-auto bg-white shadow rounded p-6'">

          <!-- 🔝 STRUCTURE FIXE -->

          <LogoSection />
          <HeaderSection />
          <MenuSection />

          <!-- MAIN -->
          <div class="mt-6">

            <!-- NAV PAGES -->
            <div class="flex gap-2 mb-4">
              <button
                v-for="(p,i) in pages"
                :key="p.id"
                @click="currentPageIndex=i"
                class="px-3 py-1 border rounded"
                :class="i===currentPageIndex && 'bg-blue-500 text-white'"
              >
                {{ p.name }}
              </button>
            </div>

            <!-- CONTENT -->
            <textarea
              v-if="mode==='edit'"
              v-model="pages[currentPageIndex].content"
              class="w-full min-h-[40vh] border p-3 mb-4"
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
                v-if="mode==='edit'"
                @click.stop="deleteSection(section.id)"
                class="absolute top-1 right-1 text-red-500"
              >
                ✕
              </button>

              <!-- IMAGE -->
              <div v-if="section.type==='ImageSection'">

                <input
                  v-if="mode==='edit'"
                  type="file"
                  @change="uploadImage($event, section)"
                />

                <img v-if="section.props.src" :src="section.props.src" class="w-full" />

              </div>

              <!-- TEXT -->
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

          </div>

          <FooterSection />

        </div>
      </div>

      <!-- CODE VIEW -->
      <div v-if="mode==='edit'" class="h-56 bg-black text-green-400 p-2 text-xs overflow-auto">
        <pre>{{ selectedFile?.content }}</pre>
      </div>

    </div>

    <!-- RIGHT PANEL FILES -->
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
const selectedSection = ref(null)
const selectedFile = ref(null)

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
  alert("Sauvegardé")
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

/* FILTER sections */
const filteredSections = computed(() => {
  return Object.keys(sectionRegistry).filter(
    s => !["LogoSection","HeaderSection","MenuSection","FooterSection"].includes(s)
  )
})

/* ADD SECTION */
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
  selectedSection.value = s
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
