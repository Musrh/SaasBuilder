<template>
  <div class="h-screen w-full flex bg-[#f6f7fb]">

    <!-- ================= LEFT ================= -->
    <div class="w-64 bg-white border-r p-4">

      <h2 class="font-bold text-lg mb-4">🧱 Sections</h2>

      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec)"
        class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg mb-2"
      >
        + {{ sec.name }}
      </button>

    </div>

    <!-- ================= CENTER ================= -->
    <div class="flex-1 p-4 overflow-auto">

      <div class="bg-white rounded-xl shadow min-h-full p-4">

        <!-- TITLE -->
        <input
          v-model="pageTitle"
          class="w-full text-2xl font-bold border-b p-2 mb-4"
          placeholder="Titre de la page..."
          @input="autoSave"
        />

        <!-- 🔥 DRAG ZONE NATIVE -->
        <div>

          <div
            v-for="(section, index) in sections"
            :key="section.id"
            class="border rounded-lg p-3 mb-3 bg-white shadow-sm cursor-move"
            draggable="true"

            @dragstart="dragStart(index)"
            @dragover.prevent
            @drop="drop(index)"
            @click="selectSection(section)"
          >

            <!-- TEXT EDIT -->
            <textarea
              v-model="section.props.title"
              class="w-full min-h-[100px] border p-2 rounded"
              @input="autoSave"
            />

            <!-- ACTIONS -->
            <div class="flex justify-between mt-2">

              <input
                type="color"
                v-model="section.props.color"
                @input="autoSave"
              />

              <button
                @click.stop="deleteSection(section.id)"
                class="text-red-500 text-sm"
              >
                🗑 Delete
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>

    <!-- ================= RIGHT ================= -->
    <div class="w-72 bg-white border-l p-4">

      <h2 class="font-bold mb-4">⚙ Settings</h2>

      <div v-if="selectedSection">

        <p class="text-sm text-gray-500">Section ID</p>

        <div class="text-xs bg-gray-100 p-2 rounded mb-3">
          {{ selectedSection.id }}
        </div>

        <p class="text-sm mb-1">Color</p>

        <input
          type="color"
          v-model="selectedSection.props.color"
          @input="autoSave"
          class="w-full h-10"
        />

      </div>

      <div v-else class="text-gray-400 text-sm">
        Select a section
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"

/* ================= STATE ================= */
const sections = ref([])
const selectedSection = ref(null)
const pageTitle = ref("My SaaS Builder")

let dragIndex = null

/* ================= AVAILABLE SECTIONS ================= */
const availableSections = [
  { name: "Text Block", type: "text" },
  { name: "Heading", type: "heading" },
  { name: "Paragraph", type: "paragraph" }
]

/* ================= ADD ================= */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now(),
    type: sec.type,
    props: {
      title: "New section",
      color: "#000000"
    }
  })

  autoSave()
}

/* ================= SELECT ================= */
const selectSection = (section) => {
  selectedSection.value = section
}

/* ================= DELETE ================= */
const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)

  if (selectedSection.value?.id === id) {
    selectedSection.value = null
  }

  autoSave()
}

/* ================= DRAG START ================= */
const dragStart = (index) => {
  dragIndex = index
}

/* ================= DROP ================= */
const drop = (index) => {
  if (dragIndex === null) return

  const draggedItem = sections.value[dragIndex]

  sections.value.splice(dragIndex, 1)
  sections.value.splice(index, 0, draggedItem)

  dragIndex = null

  autoSave()
}

/* ================= AUTOSAVE ================= */
let timeout = null

const autoSave = () => {
  clearTimeout(timeout)

  timeout = setTimeout(() => {
    console.log("💾 Saving SaaS Builder...", {
      pageTitle: pageTitle.value,
      sections: sections.value
    })

    // 👉 Firestore ici plus tard

  }, 500)
}
</script>
