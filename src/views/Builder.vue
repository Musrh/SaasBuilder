<template>
  <div class="flex min-h-screen bg-gray-100">

    <!-- ================= SIDEBAR ================= -->
    <div class="w-64 bg-white shadow-lg p-4 hidden md:block">

      <h2 class="text-lg font-bold mb-4">🧩 Sections</h2>

      <!-- LISTE DYNAMIQUE -->
      <button
        v-for="sec in availableSections"
        :key="sec.name"
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

    <!-- ================= MAIN ================= -->
    <div class="flex-1 flex flex-col items-center p-4">

      <div class="w-full max-w-[950px] bg-white rounded-2xl shadow-xl p-6">

        <!-- LOGO -->
        <div class="text-center mb-4">
          <LogoSection />
        </div>

        <!-- TITLE -->
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

        <!-- MAIN SECTION -->
        <div class="bg-gray-50 border rounded-xl p-6 min-h-[250px]">

          <div class="text-center text-gray-400 text-sm mb-4">
            🧱 MainSection
          </div>

          <textarea
            v-if="mode === 'edit'"
            v-model="mainContent"
            class="w-full border rounded-lg p-4 min-h-[120px]"
          />

          <div v-else v-html="mainContent" class="text-gray-700"></div>

        </div>

        <!-- ================= SECTIONS ================= -->
        <div class="grid gap-4 mt-6">

          <div
            v-for="section in sections"
            :key="section.id"
            class="relative bg-white border rounded-xl p-4 shadow-sm"
            @click="selectSection(section)"
          >

            <!-- DELETE -->
            <button
              v-if="mode === 'edit'"
              @click.stop="deleteSection(section.id)"
              class="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded"
            >
              ✕
            </button>

            <!-- EDIT -->
            <div v-if="mode === 'edit' && selectedSection?.id === section.id">

              <textarea
                v-model="section.props.content"
                class="w-full border rounded-lg p-3 min-h-[100px]"
              />

            </div>

            <!-- PREVIEW -->
            <div
              v-else
              v-html="section.props.content"
            ></div>

          </div>

        </div>

        <!-- FOOTER -->
        <div class="text-center mt-6 text-gray-500">
          <FooterSection />
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"

/* ================= IMPORT AUTO SECTIONS ================= */
import * as Sections from "../components/sections"

/* ================= FIXED SECTIONS LIST ================= */
const availableSections = Object.entries(Sections).map(([name, comp]) => ({
  name,
  component: comp
}))

/* ================= STATE ================= */
const mode = ref("edit")
const sections = ref([])
const selectedSection = ref(null)

const pageTitle = ref("SaaS Builder")
const mainContent = ref("Bienvenue dans ton builder")

/* ================= ADD SECTION ================= */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now(),
    name: sec.name,
    component: sec.component,
    props: {
      content: `Section ${sec.name}`
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
}

/* ================= SAVE ================= */
const saveAndPreview = () => {
  selectedSection.value = null
  mode.value = "preview"
}
</script>
