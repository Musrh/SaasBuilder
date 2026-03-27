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

      <!-- 🔹 MAIN AREA -->
      <div class="flex-1 flex flex-col bg-gray-100 p-4">

        <!-- 🔹 PREVIEW -->
        <div class="bg-white rounded shadow p-4 flex-1 overflow-auto">

          <!-- HEADER -->
          <HeaderSection>
            <LogoSection />
          </HeaderSection>

          <!-- MAIN -->
          <MainSection>

            <div
              v-for="section in sections"
              :key="section.id"
              draggable="true"
              @dragstart="dragStart(section.id)"
              @dragover.prevent
              @drop="drop(section.id)"
              @click="selectSection(section)"
              class="border mb-3 p-3 rounded cursor-move hover:bg-gray-50 transition"
              :class="selectedSection?.id === section.id ? 'border-blue-500' : ''"
            >
              <component
                :is="safeGetComponent(section.type)"
                v-bind="section.props"
              />
            </div>

          </MainSection>

          <!-- FOOTER -->
          <FooterSection />

        </div>

        <!-- 🔹 EDITOR -->
        <div v-if="selectedSection" class="bg-white p-4 mt-4 rounded shadow">

          <!-- TOOLBAR -->
          <div class="flex gap-2 mb-3 border-b pb-2">
            <button @click="makeBold" class="tool">B</button>
            <button @click="makeUppercase" class="tool">Aa</button>
            <button @click="addEmoji" class="tool">😊</button>
          </div>

          <!-- INPUTS -->
          <div v-for="(val, key) in selectedSection.props" :key="key" class="mb-2">
            <label class="text-sm font-medium block">{{ key }}</label>
            <input
              v-model="selectedSection.props[key]"
              class="border p-2 w-full rounded"
              @input="autoSave"
              @blur="closeEditor"
              @keyup.enter="closeEditor"
            />
          </div>

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

        <button
          v-if="selectedSectionFromFile"
          @click="deleteFromTree"
          class="w-full bg-red-500 text-white mt-4 py-2 rounded hover:bg-red-600"
        >
          Supprimer section
        </button>

      </div>

    </div>

    <!-- 🔹 CODE VIEW -->
    <div class="bg-black text-green-400 p-4 h-52 overflow-auto text-xs">
      <pre>{{ generatedCode }}</pre>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive } from "vue"

/* 🔹 COMPONENTS */
import HeaderSection from "../components/sections/HeaderSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"
import MainSection from "../components/sections/MainSection.vue"
import LogoSection from "../components/sections/LogoSection.vue"

/* 🔹 AVAILABLE SECTIONS */
const availableSections = [
  { name: "Header", type: "Header" },
  { name: "Footer", type: "Footer" },
  { name: "Logo", type: "Logo" }
]

/* 🔹 STATE */
const sections = ref([])
const selectedSection = ref(null)
const selectedSectionFromFile = ref(null)
const generatedCode = ref("")

/* 🔹 COMPONENT MAP SAFE */
const componentMap = {
  Header: HeaderSection,
  Footer: FooterSection,
  Logo: LogoSection
}

const safeGetComponent = (type) => {
  return componentMap[type] || null
}

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

/* 🔹 DRAG & DROP (BY ID SAFE) */
let draggedId = null

const dragStart = (id) => {
  draggedId = id
}

const drop = (targetId) => {
  const fromIndex = sections.value.findIndex(s => s.id === draggedId)
  const toIndex = sections.value.findIndex(s => s.id === targetId)

  if (fromIndex === -1 || toIndex === -1) return

  const moved = sections.value.splice(fromIndex, 1)[0]
  sections.value.splice(toIndex, 0, moved)
}

/* 🔹 FILE TREE */
const selectFile = (id) => {
  selectedSectionFromFile.value = id
}

const fileClass = (id) => {
  return selectedSectionFromFile.value === id
    ? "text-blue-500 font-bold cursor-pointer"
    : "cursor-pointer"
}

/* 🔹 DELETE */
const deleteFromTree = () => {
  sections.value = sections.value.filter(s => s.id !== selectedSectionFromFile.value)
  selectedSectionFromFile.value = null
}

/* 🔹 EDITOR ACTIONS */
const makeBold = () => {}
const makeUppercase = () => {}
const addEmoji = () => {}

const autoSave = () => {}
const closeEditor = () => {}
</script>

<style scoped>
.tool {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
