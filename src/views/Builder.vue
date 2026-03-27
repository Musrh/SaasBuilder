<template>
  <div class="h-screen w-full flex bg-[#f6f7fb]">

    <!-- ================= LEFT SIDEBAR ================= -->
    <div class="w-64 bg-white border-r p-4">

      <h2 class="font-bold text-lg mb-4">🧱 Sections</h2>

      <div class="space-y-2">

        <button
          v-for="sec in availableSections"
          :key="sec.type"
          @click="addSection(sec)"
          class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg"
        >
          + {{ sec.name }}
        </button>

      </div>

    </div>

    <!-- ================= CENTER CANVAS ================= -->
    <div class="flex-1 p-6 overflow-auto">

      <!-- PAGE -->
      <div class="bg-white shadow-xl rounded-2xl min-h-full p-6">

        <!-- TITLE -->
        <input
          v-model="pageTitle"
          class="w-full text-3xl font-bold border-b p-3 mb-6"
          placeholder="Page title..."
          @input="autoSave"
        />

        <!-- DRAG AREA -->
        <draggable
          v-model="sections"
          item-key="id"
          class="space-y-4"
          @change="autoSave"
        >

          <template #item="{ element }">

            <div
              class="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition cursor-move"
              @click="selectSection(element)"
            >

              <textarea
                v-model="element.props.title"
                class="w-full min-h-[120px] border p-3 rounded-lg"
                @input="autoSave"
              />

              <div class="flex justify-between mt-2">

                <input type="color" v-model="element.props.color" @input="autoSave" />

                <button
                  @click.stop="deleteSection(element.id)"
                  class="text-red-500 text-sm"
                >
                  🗑 Delete
                </button>

              </div>

            </div>

          </template>

        </draggable>

      </div>

    </div>

    <!-- ================= RIGHT PANEL ================= -->
    <div class="w-72 bg-white border-l p-4">

      <h2 class="font-bold mb-4">⚙ Settings</h2>

      <div v-if="selectedSection">

        <p class="text-sm text-gray-500 mb-2">Section ID</p>
        <div class="text-xs bg-gray-100 p-2 rounded">
          {{ selectedSection.id }}
        </div>

        <p class="mt-4 text-sm">Text color</p>

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
import { ref, watch } from "vue"
import draggable from "vuedraggable"

/* ================= STATE ================= */
const sections = ref([])
const selectedSection = ref(null)
const pageTitle = ref("My Wix Builder")

/* ================= SECTIONS ================= */
const availableSections = [
  { name: "Text Block", type: "text" },
  { name: "Heading", type: "heading" },
  { name: "Paragraph", type: "paragraph" }
]

/* ================= ADD SECTION ================= */
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
  selectedSection.value = null
  autoSave()
}

/* ================= AUTOSAVE FIRESTORE ================= */
let timeout = null

const autoSave = () => {
  clearTimeout(timeout)

  timeout = setTimeout(async () => {

    // 🔥 ici tu branches Firestore
    console.log("Saving...", {
      pageTitle: pageTitle.value,
      sections: sections.value
    })

    // EXEMPLE FIRESTORE :
    // await updateDoc(doc(db, "users", userId), {...})

  }, 500)
}

/* ================= WATCH GLOBAL ================= */
watch(pageTitle, autoSave)
</script>
