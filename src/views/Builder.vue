<template>
  <div
    class="min-h-screen w-full bg-gray-100 flex flex-col"
    @click.self="selectedSection = null"
  >

    <!-- 🔥 TOP BAR -->
    <div class="flex justify-center gap-2 p-3 bg-white shadow">

      <button
        v-if="mode === 'edit'"
        @click="saveAndPreview"
        class="bg-green-500 text-white px-4 py-2 rounded-lg shadow"
      >
        💾 Preview
      </button>

      <button
        v-else
        @click="mode = 'edit'"
        class="bg-blue-500 text-white px-4 py-2 rounded-lg shadow"
      >
        ✏️ Edit
      </button>

    </div>

    <!-- 🔥 SECTION BUTTONS -->
    <div
      v-if="mode === 'edit'"
      class="p-2 flex gap-2 flex-wrap justify-center bg-white"
    >
      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec)"
        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg"
      >
        + {{ sec.name }}
      </button>
    </div>

    <!-- ================= FULL BUILDER ================= -->
    <div class="flex-1 w-full">

      <div class="w-full min-h-screen bg-white flex flex-col">

        <!-- TITLE FULL WIDTH -->
        <div class="w-full p-4 border-b">
          <input
            v-if="mode === 'edit'"
            v-model="pageTitle"
            class="w-full text-3xl font-bold p-3 border rounded-lg"
            placeholder="Titre du site..."
          />

          <h1 v-else class="text-3xl font-bold text-center">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- MAIN AREA -->
        <div class="flex-1 w-full p-4">

          <!-- MAIN CONTENT FULL SCREEN -->
          <textarea
            v-if="mode === 'edit'"
            v-model="mainContent"
            class="w-full h-[70vh] p-4 border rounded-lg text-lg resize-none"
            placeholder="Écris ton contenu principal..."
          />

          <div
            v-else
            class="w-full min-h-[70vh] p-4"
            v-html="mainContent"
          />

          <!-- ================= SECTIONS ================= -->
          <div
            v-for="section in sections"
            :key="section.id"
            @click.stop="selectSection(section)"
            class="relative border rounded-lg my-4 p-4 transition"
            :class="selectedSection?.id === section.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'"
          >

            <!-- DELETE -->
            <button
              v-if="mode === 'edit'"
              @click.stop="deleteSection(section.id)"
              class="absolute top-2 right-2 text-red-500 text-xs bg-white border px-2 py-1 rounded"
            >
              🗑
            </button>

            <!-- TOOLBAR -->
            <div
              v-if="mode === 'edit' && selectedSection?.id === section.id"
              class="flex gap-2 mb-3 border-b pb-2"
            >
              <button @click="applyBold(section)" class="tool">B</button>
              <button @click="applyUppercase(section)" class="tool">Aa</button>
              <button @click="applyEmoji(section)" class="tool">😊</button>

              <input type="color" v-model="section.props.color" />
            </div>

            <!-- TEXTAREA EDIT -->
            <textarea
              v-if="mode === 'edit' && selectedSection?.id === section.id"
              v-model="section.props.title"
              class="w-full min-h-[200px] p-3 border rounded-lg text-lg"
            />

            <!-- PREVIEW -->
            <div
              v-else
              class="w-full"
              :style="{ color: section.props.color }"
              v-html="section.props.title"
            />

          </div>

        </div>

        <!-- FOOTER -->
        <div class="p-4 text-center border-t bg-white">
          <FooterSection />
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"

import FooterSection from "../components/sections/FooterSection.vue"

/* STATE */
const mode = ref("edit")
const sections = ref([])
const selectedSection = ref(null)

const pageTitle = ref("Titre par défaut")
const mainContent = ref("Mon site créé avec mon builder")

/* SECTIONS */
const availableSections = [
  { name: "Texte", type: "Text" },
  { name: "Titre", type: "Heading" },
  { name: "Paragraphe", type: "Paragraph" }
]

/* ADD SECTION */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now(),
    type: sec.type,
    props: {
      title: "Nouveau contenu",
      color: "#000000"
    }
  })
}

/* SELECT */
const selectSection = (section) => {
  if (mode.value === "preview") return
  selectedSection.value = section
}

/* DELETE */
const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)

  if (selectedSection.value?.id === id) {
    selectedSection.value = null
  }
}

/* TOOLS */
const applyBold = (section) => {
  section.props.title = `<b>${section.props.title}</b>`
}

const applyUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const applyEmoji = (section) => {
  section.props.title += " 😊"
}

/* MODE SWITCH */
const saveAndPreview = () => {
  selectedSection.value = null
  mode.value = "preview"
}
</script>

<style>
.tool {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}

.tool:hover {
  background: #eee;
}
</style>
