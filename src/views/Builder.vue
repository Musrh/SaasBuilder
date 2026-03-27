<template>
  <div class="h-screen flex bg-gray-100">

    <!-- 🧭 LEFT PANEL (SECTIONS PRO) -->
    <div v-if="mode === 'edit'" class="w-64 bg-white border-r p-4 overflow-y-auto">

      <h2 class="font-bold mb-4">🧱 Ajouter une section</h2>

      <div class="space-y-2">

        <button
          v-for="name in filteredSections"
          :key="name"
          @click="addSection(name)"
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-blue-50 transition"
        >
          <span>{{ sectionLabels[name] || name }}</span>
          <span class="text-gray-400">＋</span>
        </button>

      </div>

    </div>

    <!-- 🖥 CENTER -->
    <div class="flex-1 flex flex-col">

      <!-- 🔝 TOP BAR -->
      <div v-if="mode === 'edit'" class="bg-white border-b p-3 flex justify-between">

        <div class="flex gap-2">
          <button @click="saveData" class="bg-green-500 text-white px-3 py-1 rounded">
            💾 Sauvegarder
          </button>

          <button @click="mode='preview'" class="bg-blue-500 text-white px-3 py-1 rounded">
            👁 Preview
          </button>
        </div>

      </div>

      <!-- 🧱 CANVAS -->
      <div class="flex-1 overflow-y-auto" :class="mode==='preview' ? 'p-0' : 'p-6'">

        <div :class="mode==='preview'
          ? 'w-full min-h-screen bg-white'
          : 'max-w-4xl mx-auto bg-white shadow rounded p-6'">

          <!-- 🔝 STRUCTURE FIXE -->
          <LogoSection />
          <HeaderSection />
          <MenuSection />

          <!-- 🧱 MAIN -->
          <div class="mt-6">

            <!-- CONTENT -->
            <textarea
              v-if="mode==='edit'"
              v-model="pages[currentPageIndex].content"
              class="w-full min-h-[50vh] border p-3 mb-4"
              placeholder="Votre contenu ici..."
            />

            <div
              v-else
              v-html="pages[currentPageIndex].content"
              class="mb-4"
            ></div>

            <!-- 🔥 SECTIONS -->
            <div
              v-for="section in pages[currentPageIndex].sections"
              :key="section.id"
              class="border mb-3 p-3 relative rounded"
              @click="selectSection(section)"
            >

              <!-- DELETE -->
              <button
                v-if="mode==='edit'"
                @click.stop="deleteSection(section.id)"
                class="absolute top-1 right-1 text-red-500 text-xs"
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

                <img
                  v-if="section.props.src"
                  :src="section.props.src"
                  class="w-full rounded mt-2"
                />

              </div>

              <!-- AUTRES -->
              <div v-else>

                <textarea
                  v-if="mode==='edit'"
                  v-model="section.props.content"
                  class="w-full border p-2 rounded"
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

      <!-- 🧾 CODE VIEW -->
      <div v-if="mode==='edit'" class="h-56 bg-black text-green-400 p-2 text-xs overflow-auto">
        <pre>{{ selectedFile?.content }}</pre>
      </div>

    </div>

    <!-- 📁 RIGHT PANEL (ARBORESCENCE) -->
    <div v-if="mode==='edit'" class="w-72 bg-white border-l p-4 overflow-y-auto">

      <h2 class="font-bold mb-3">📁 Arborescence</h2>

      <div
        v-for="file in files"
        :key="file.name"
        @click="selectedFile=file"
        class="p-2 cursor-pointer hover:bg-gray-100 rounded flex justify-between"
        :class="selectedFile?.name===file.name && 'bg-blue-100 font-bold'"
      >
        <span>📄 {{ file.name }}</span>

        <button
          v-if="file.sectionId"
          @click.stop="deleteSection(file.sectionId)"
          class="text-red-500 text-xs"
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

/* 🔥 AUTO LOAD */
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

/* LABELS */
const sectionLabels = {
  HeroSection: "Hero (Accueil)",
  ImageSection: "Image",
  TextSection: "Texte",
  FeatureSection: "Fonctionnalités",
  ContactSection: "Contact"
}

/* LOAD */
onMounted(() => {
  const saved = localStorage.getItem("builderData")
  pages.value = saved
    ? JSON.parse(saved)
    : [{
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

/* FILTER */
const filteredSections = computed(() => {
  return Object.keys(sectionRegistry).filter(
    s => !["LogoSection","HeaderSection","MenuSection","FooterSection"].includes(s)
  )
})

/* ADD */
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
    { name: "LogoSection.vue", content: "<LogoSection />" },
    { name: "HeaderSection.vue", content: "<HeaderSection />" },
    { name: "MenuSection.vue", content: "<MenuSection />" },

    ...pages.value[currentPageIndex.value].sections.map((s, i) => ({
      name: `${s.type}${i + 1}.vue`,
      content: `<template>\n  <div>${s.props.content || ''}</div>\n</template>`,
      sectionId: s.id
    })),

    { name: "FooterSection.vue", content: "<FooterSection />" }
  ]
})
</script>

<style>
body {
  font-family: system-ui;
}
</style>
