<template>
  <div class="flex flex-col min-h-screen">

    <!-- 🔹 TOP BAR -->
    <div class="bg-white shadow p-3 flex gap-2 flex-wrap">
      <button
        v-for="sec in availableSections"
        :key="sec.type"
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

          <HeaderSection />

          <!-- 🔥 MAIN BUILDER ZONE -->
          <MainSection class="border-4 border-dashed border-blue-400 p-4 rounded-lg min-h-[300px]">

            <div
              v-for="section in filteredSections"
              :key="section.id"
              draggable="true"
              @dragstart="dragStart(section.id)"
              @dragover.prevent
              @drop="drop(section.id)"
              @click="selectSection(section)"
              class="p-3 mb-3 rounded border cursor-move transition"
              :class="selectedSection?.id === section.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'"
            >

              <!-- 🔥 MODE ÉDITION -->
              <div v-if="selectedSection?.id === section.id" class="mb-3 bg-white p-2 border rounded">

                <div class="flex gap-2 mb-2 border-b pb-2">
                  <button @click="makeBold" class="px-2 border rounded">B</button>
                  <button @click="makeUppercase" class="px-2 border rounded">Aa</button>
                  <button @click="addEmoji" class="px-2 border rounded">😊</button>
                </div>

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

          <FooterSection />

        </div>

      </div>

      <!-- 🔹 ARBORESCENCE INTERACTIVE -->
      <div class="w-80 bg-white border-l p-3">

        <h3 class="font-bold mb-2">📁 Arborescence</h3>

        <div class="space-y-1 text-sm">

          <div
            v-for="file in files"
            :key="file.name"
            @click="selectFile(file.name)"
            class="cursor-pointer p-2 rounded"
            :class="selectedFile === file.name ? 'bg-blue-100 font-bold' : ''"
          >
            📄 {{ file.name }}
          </div>

        </div>

        <!-- 🔥 CODE VIEW -->
        <div class="mt-4 bg-black text-green-400 p-2 h-64 overflow-auto text-xs rounded">

          <div class="text-white mb-2">
            {{ selectedFile }}
          </div>

          <pre>{{ getFileContent(selectedFile) }}</pre>

        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue"

/* 🔥 IMPORT DES SECTIONS (CHEMIN CORRIGÉ) */
import HeaderSection from "../components/sections/HeaderSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"
import MainSection from "../components/sections/MainSection.vue"
import LogoSection from "../components/sections/LogoSection.vue"
import MenuSection from "../components/sections/MenuSection.vue"
import HeaderSearch from "../components/sections/HeaderSearch.vue"

/* 🔹 STATE */
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref("App.vue")

/* 🔹 SECTIONS DISPONIBLES */
const availableSections = [
  { name: "Menu", type: "Menu" },
  { name: "Logo", type: "Logo" }
]

/* ❌ EXCLUSIONS DANS MAINSECTION */
const excludedInMain = ["HeaderSearch", "Footer"]

const filteredSections = computed(() =>
  sections.value.filter(s => !excludedInMain.includes(s.type))
)

/* 🔹 COMPONENT MAP */
const componentMap = {
  Menu: MenuSection,
  Logo: LogoSection
}

const safeGetComponent = (type) => componentMap[type] || null

/* 🔹 FILES ARBORESCENCE */
const files = ref([
  {
    name: "App.vue",
    content: "<template>\n  <div>App</div>\n</template>"
  },
  {
    name: "MainSection.vue",
    content: "<template>\n  <section>Main Section</section>\n</template>"
  },
  {
    name: "MenuSection.vue",
    content: "<template>\n  <nav>Menu</nav>\n</template>"
  }
])

const getFileContent = (name) => {
  return files.value.find(f => f.name === name)?.content || "// vide"
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

/* 🔹 FILE SELECT */
const selectFile = (name) => {
  selectedFile.value = name
}

/* 🔹 DRAG DROP */
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

/* 🔹 EDITOR ACTIONS */
const makeBold = () => {}
const makeUppercase = () => {}
const addEmoji = () => {}
const autoSave = () => {}
</script>

<style scoped>
</style>
