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
          <MainSection class="border-4 border-dashed border-blue-400 bg-white p-4 rounded-xl min-h-[300px]">

            <div class="text-xs text-gray-500 mb-3">
              ✏️ Mode Builder actif - Clique une section pour l’éditer
            </div>

            <!-- 🔹 SECTIONS -->
            <div
              v-for="section in filteredSections"
              :key="section.id"
              draggable="true"
              @dragstart="dragStart(section.id)"
              @dragover.prevent
              @drop="drop(section.id)"
              @click="selectSection(section)"
              class="p-3 mb-3 rounded border cursor-move transition relative"
              :class="selectedSection?.id === section.id
                ? 'border-blue-500 bg-blue-50 shadow'
                : 'border-gray-200'"
            >

              <!-- 🔥 EDIT MODE -->
              <div
                v-if="selectedSection?.id === section.id"
                class="mb-3 bg-white p-2 border rounded"
              >

                <!-- Toolbar -->
                <div class="flex justify-between items-center mb-2 border-b pb-2">

                  <div class="flex gap-2">
                    <button @click="makeBold" class="px-2 border rounded font-bold">B</button>
                    <button @click="makeUppercase" class="px-2 border rounded">Aa</button>
                    <button @click="addEmoji" class="px-2 border rounded">😊</button>
                  </div>

                  <button
                    @click="deleteSection(section.id)"
                    class="text-red-500 text-xs border px-2 py-1 rounded"
                  >
                    🗑 Delete
                  </button>

                </div>

                <!-- Props editor -->
                <div v-for="(val, key) in section.props" :key="key" class="mb-2">
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

      <!-- 🔹 ARBORESCENCE -->
      <div class="w-80 bg-white border-l p-3">

        <h3 class="font-bold mb-2">📁 Arborescence</h3>

        <div class="space-y-1 text-sm">

          <div
            v-for="file in files"
            :key="file.name"
            @click="selectFile(file.name)"
            class="cursor-pointer p-2 rounded flex justify-between items-center"
            :class="selectedFile === file.name ? 'bg-blue-100 font-bold' : ''"
          >
            <span>📄 {{ file.name }}</span>

            <button
              v-if="file.deletable"
              @click.stop="deleteFile(file.name)"
              class="text-red-500 text-xs"
            >
              ✕
            </button>

          </div>

        </div>

        <!-- 🔥 CODE VIEW -->
        <div class="mt-4 bg-black text-green-400 p-2 h-64 overflow-auto text-xs rounded">

          <div class="text-white mb-2 font-bold">
            {{ selectedFile }}
          </div>

          <pre class="whitespace-pre-wrap">{{ getFileContent(selectedFile) }}</pre>

        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue"

/* 🔥 IMPORTS */
import HeaderSection from "../components/sections/HeaderSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"
import MainSection from "../components/sections/MainSection.vue"
import LogoSection from "../components/sections/LogoSection.vue"
import MenuSection from "../components/sections/MenuSection.vue"


/* 🔹 STATE */
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref("App.vue")

/* 🔹 SECTIONS */
const availableSections = [
  { name: "Menu", type: "Menu" },
  { name: "Logo", type: "Logo" }
]

/* 🔹 FILTER */
const excludedInMain = ["HeaderSearch", "Footer"]

const filteredSections = computed(() =>
  sections.value.filter(s => !excludedInMain.includes(s.type))
)

/* 🔹 COMPONENT MAP */
const componentMap = {
  Menu: MenuSection,
  Logo: LogoSection
}

const safeGetComponent = (type) => componentMap[type] || "div"

/* 🔹 FILES */
const files = ref([
  {
    name: "App.vue",
    content: `<template>
  <div>App.vue</div>
</template>`,
    deletable: false
  },
  {
    name: "MainSection.vue",
    content: `<template>
  <section>Main Section</section>
</template>`,
    deletable: false
  },
  {
    name: "MenuSection.vue",
    content: `<template>
  <nav>Menu</nav>
</template>`,
    deletable: true
  }
])

const getFileContent = (name) =>
  files.value.find(f => f.name === name)?.content || "// vide"

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

/* 🔹 DELETE SECTION */
const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)

  if (selectedSection.value?.id === id) {
    selectedSection.value = null
  }
}

/* 🔹 DELETE FILE */
const deleteFile = (name) => {
  files.value = files.value.filter(f => f.name !== name)

  if (selectedFile.value === name) {
    selectedFile.value = "App.vue"
  }
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
const makeBold = () => {
  if (!selectedSection.value) return
  for (const k in selectedSection.value.props) {
    selectedSection.value.props[k] = `**${selectedSection.value.props[k]}**`
  }
}

const makeUppercase = () => {
  if (!selectedSection.value) return
  for (const k in selectedSection.value.props) {
    selectedSection.value.props[k] =
      selectedSection.value.props[k].toUpperCase()
  }
}

const addEmoji = () => {
  if (!selectedSection.value) return
  for (const k in selectedSection.value.props) {
    selectedSection.value.props[k] += " 😊"
  }
}

const autoSave = () => {
  console.log("autosave:", sections.value)
}
</script>

<style scoped>
</style>
