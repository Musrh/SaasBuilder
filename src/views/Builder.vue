<template>
  <div class="flex flex-col min-h-screen">

    <!-- 🔹 TOP BAR -->
    <div class="bg-white shadow p-3 flex flex-wrap gap-2">
      <button
        v-for="sec in availableSections"
        :key="sec.name"
        @click="addSection(sec)"
        class="bg-blue-500 text-white px-3 py-1 rounded"
      >
        + {{ sec.name }}
      </button>
    </div>

    <div class="flex flex-1">

      <!-- 🔹 MAIN -->
      <div class="flex-1 flex flex-col bg-gray-100 p-4">

        <!-- 🔹 PREVIEW -->
        <div class="bg-white rounded shadow p-4 flex-1 overflow-auto">

          <!-- HEADER -->
          <HeaderSection>
            <LogoSection />
          </HeaderSection>

          <!-- 🔥 MAIN SECTION (ENCADRÉE) -->
          <MainSection class="border-2 border-dashed border-blue-400 p-3 rounded-lg">

            <div
              v-for="section in sections"
              :key="section.id"
              draggable="true"
              @dragstart="dragStart(section.id)"
              @dragover.prevent
              @drop="drop(section.id)"
              @click="selectSection(section)"
              class="border mb-3 p-3 rounded cursor-move hover:bg-gray-50 transition"
              :class="selectedSection?.id === section.id ? 'border-blue-500 bg-blue-50' : ''"
            >

              <!-- 🔹 MODE ÉDITION -->
              <div v-if="selectedSection?.id === section.id" class="mb-2">
                
                <!-- TOOLBAR -->
                <div class="flex gap-2 mb-2 border-b pb-2 bg-gray-100 p-2 rounded">
                  <button @click="makeBold" class="px-2 py-1 border rounded">B</button>
                  <button @click="makeUppercase" class="px-2 py-1 border rounded">Aa</button>
                  <button @click="addEmoji" class="px-2 py-1 border rounded">😊</button>
                </div>

                <!-- INPUTS -->
                <div
                  v-for="(val, key) in section.props"
                  :key="key"
                  class="mb-2"
                >
                  <label class="text-xs font-bold">{{ key }}</label>
                  <input
                    v-model="section.props[key]"
                    class="border p-2 w-full rounded"
                    @input="autoSave"
                  />
                </div>

              </div>

              <!-- 🔹 RENDER SECTION -->
              <component
                :is="safeGetComponent(section.type)"
                v-bind="section.props"
              />

            </div>

          </MainSection>

          <!-- FOOTER -->
          <FooterSection />

        </div>

      </div>

      <!-- 🔹 FILE TREE -->
      <div class="w-72 bg-white border-l p-4">

        <h3 class="font-bold mb-3">📁 Fichiers</h3>

        <ul class="space-y-1 text-sm">

          <li @click="selectFile('index.html')" :class="fileClass('index.html')">
            index.html
          </li>

          <li @click="selectFile('App.vue')" :class="fileClass('App.vue')">
            App.vue
          </li>

          <li @click="selectFile('main.js')" :class="fileClass('main.js')">
            main.js
          </li>

          <li class="mt-3 font-semibold">Sections</li>

          <li
            v-for="(sec, i) in sections"
            :key="sec.id"
            @click="selectFile(sec.id)"
            :class="fileClass(sec.id)"
          >
            {{ sec.type }}{{ i + 1 }}.vue
          </li>

        </ul>

      </div>

    </div>

    <!-- 🔥 CODE VIEW EN BAS -->
    <div class="bg-black text-green-400 p-4 h-64 overflow-auto text-xs">

      <div class="flex justify-between mb-2 text-white">
        <span>📄 Arborescence & Code</span>
        <span>{{ selectedFile }}</span>
      </div>

      <pre>{{ generatedCode }}</pre>

    </div>

  </div>
</template>

<script setup>
import { ref, reactive } from "vue"

/* 🔹 COMPONENTS */
import HeaderSection from "@/sections/HeaderSection.vue"
import FooterSection from "@/sections/FooterSection.vue"
import MainSection from "@/sections/MainSection.vue"
import LogoSection from "@/sections/LogoSection.vue"

/* 🔹 DATA */
const availableSections = [
  { name: "Header", type: "Header" },
  { name: "Footer", type: "Footer" },
  { name: "Logo", type: "Logo" }
]

const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref("App.vue")
const generatedCode = ref("")

/* 🔹 COMPONENT MAP */
const componentMap = {
  Header: HeaderSection,
  Footer: FooterSection,
  Logo: LogoSection
}

const safeGetComponent = (type) => componentMap[type] || null

/* 🔹 ADD SECTION */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now() + Math.random(),
    type: sec.type,
    props: reactive({})
  })
}

/* 🔹 SELECT SECTION */
const selectSection = (section) => {
  selectedSection.value = section
}

/* 🔹 DRAG & DROP */
let draggedId = null

const dragStart = (id) => {
  draggedId = id
}

const drop = (targetId) => {
  const from = sections.value.findIndex(s => s.id === draggedId)
  const to = sections.value.findIndex(s => s.id === targetId)

  if (from < 0 || to < 0) return

  const moved = sections.value.splice(from, 1)[0]
  sections.value.splice(to, 0, moved)
}

/* 🔹 FILE TREE */
const selectFile = (id) => {
  selectedFile.value = id
}

const fileClass = (id) => {
  return selectedFile.value === id
    ? "text-blue-500 font-bold cursor-pointer"
    : "cursor-pointer"
}

/* 🔹 EDITOR ACTIONS */
const makeBold = () => {}
const makeUppercase = () => {}
const addEmoji = () => {}
const autoSave = () => {}
</script>

<style scoped>
</style>
