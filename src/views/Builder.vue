<template>
  <div class="flex min-h-screen bg-gray-100">

    <!-- ================= LEFT SIDEBAR ================= -->
    <div class="w-64 bg-white shadow-lg p-4 hidden md:block">

      <h2 class="text-lg font-bold mb-4">🧩 Sections</h2>

      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec)"
        class="w-full mb-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
      >
        + {{ sec.name }}
      </button>

      <hr class="my-4" />

      <button
        v-if="mode === 'edit'"
        @click="saveAndPreview"
        class="w-full bg-green-500 text-white py-2 rounded-lg"
      >
        💾 Preview
      </button>

      <button
        v-else
        @click="mode = 'edit'"
        class="w-full bg-blue-500 text-white py-2 rounded-lg mt-2"
      >
        ✏️ Edit
      </button>

    </div>

    <!-- ================= MAIN AREA ================= -->
    <div class="flex-1 flex flex-col items-center p-4">

      <!-- ================= PAGE CONTAINER ================= -->
      <div class="w-full max-w-[950px] bg-white rounded-2xl shadow-xl p-6">

        <!-- 🔥 LOGO -->
        <div class="text-center mb-4">
          <LogoSection />
        </div>

        <!-- 🔥 TITLE -->
        <div class="text-center mb-6">
          <input
            v-if="mode === 'edit'"
            v-model="pageTitle"
            class="text-3xl font-bold text-center w-full border rounded-lg p-2"
          />
          <h1 v-else class="text-3xl font-bold">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- ================= MAIN SECTION (LWS COLLECTION STYLE) ================= -->
        <div class="bg-gray-50 border rounded-xl p-6 min-h-[300px]">

          <div class="text-center text-gray-400 text-sm mb-4">
            🧱 MainSection (Collection LWS Style)
          </div>

          <!-- MAIN CONTENT -->
          <textarea
            v-if="mode === 'edit'"
            v-model="mainContent"
            class="w-full border rounded-lg p-4 mb-6 min-h-[120px] focus:ring-2 focus:ring-blue-300"
          />

          <div
            v-else
            class="mb-6 text-gray-700"
            v-html="mainContent"
          ></div>

          <!-- ================= SECTIONS GRID ================= -->
          <div class="grid gap-4">

            <div
              v-for="section in sections"
              :key="section.id"
              @click.stop="selectSection(section)"
              class="relative bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition"
              :class="selectedSection?.id === section.id
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200'"
            >

              <!-- DELETE -->
              <button
                v-if="mode === 'edit'"
                @click.stop="deleteSection(section.id)"
                class="absolute top-2 right-2 text-xs bg-red-500 text-white px-2 py-1 rounded"
              >
                ✕
              </button>

              <!-- EDIT MODE -->
              <div v-if="mode === 'edit' && selectedSection?.id === section.id">

                <!-- TOOLBAR -->
                <div class="flex gap-2 mb-3 border-b pb-2">
                  <button @click="applyBold(section)" class="tool">B</button>
                  <button @click="applyUppercase(section)" class="tool">AA</button>
                  <button @click="applyEmoji(section)" class="tool">😊</button>
                  <input type="color" v-model="section.props.color" />
                </div>

                <!-- EDIT TEXT -->
                <textarea
                  v-model="section.props.title"
                  class="w-full border rounded-lg p-3 min-h-[100px]"
                />

              </div>

              <!-- PREVIEW -->
              <div
                v-else
                class="text-sm"
                :style="{ color: section.props.color }"
                v-html="section.props.title"
              />

            </div>

          </div>

        </div>

        <!-- ================= FOOTER ================= -->
        <div class="text-center mt-6 text-gray-500">
          <FooterSection />
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"

import LogoSection from "../components/sections/LogoSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"

/* ================= STATE ================= */
const mode = ref("edit")
const sections = ref([])
const selectedSection = ref(null)

const pageTitle = ref("Collection LWS Builder")
const mainContent = ref("Créer votre site SaaS moderne ici")

/* ================= SECTIONS ================= */
const availableSections = [
  { name: "Texte", type: "Text" },
  { name: "Titre", type: "Heading" },
  { name: "Paragraphe", type: "Paragraph" }
]

/* ================= ADD SECTION ================= */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now(),
    type: sec.type,
    props: {
      title: "Nouveau bloc LWS",
      color: "#111111"
    }
  })
}

/* ================= SELECT ================= */
const selectSection = (section) => {
  if (mode.value !== "edit") return
  selectedSection.value = section
}

/* ================= DELETE ================= */
const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)
  if (selectedSection.value?.id === id) selectedSection.value = null
}

/* ================= TOOLS ================= */
const applyBold = (section) => {
  section.props.title = `<b>${section.props.title}</b>`
}

const applyUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const applyEmoji = (section) => {
  section.props.title += " 😊"
}

/* ================= MODE ================= */
const saveAndPreview = () => {
  selectedSection.value = null
  mode.value = "preview"
}
</script>

<style>
.tool {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  background: white;
}

.tool:hover {
  background: #f3f4f6;
}
</style>
