<template>
  <div class="p-6">

    <h1 class="text-2xl font-bold mb-4">
      Builder
    </h1>

    <!-- 🔥 LOADING -->
    <div v-if="loading">
      Chargement...
    </div>

    <div v-else class="flex gap-4">

      <!-- ================= LEFT (BUILDER) ================= -->
      <div class="flex-1">

        <!-- ACTIONS -->
        <div class="mb-4">
          <button
            @click="addSection"
            class="bg-blue-500 text-white px-4 py-2 rounded"
          >
            + Ajouter Header
          </button>

          <button
            @click="saveSections"
            class="ml-2 bg-green-500 text-white px-4 py-2 rounded"
          >
            Sauvegarder
          </button>
        </div>

        <!-- 🔥 MAIN SECTION CONTAINER -->
        <div class="border-4 border-dashed border-blue-400 p-4 rounded-lg min-h-[400px] bg-gray-50">

          <div class="text-xs text-gray-500 mb-3">
            ✏️ Mode Édition actif - clique une section pour modifier
          </div>

          <!-- LISTE SECTIONS -->
          <div
            v-for="section in sections"
            :key="section.id"
            @click="selectSection(section)"
            class="border p-4 mb-3 rounded cursor-pointer transition"
            :class="selectedSection?.id === section.id
              ? 'border-blue-500 bg-blue-50 shadow'
              : 'border-gray-200'"
          >

            <!-- 🔥 HEADER SECTION ITEM -->
            <div class="flex justify-between items-center mb-2">

              <strong>{{ section.type }}</strong>

              <!-- DELETE -->
              <button
                @click.stop="deleteSection(section.id)"
                class="text-red-500 text-xs border px-2 py-1 rounded"
              >
                🗑
              </button>

            </div>

            <!-- 🔥 MODE ÉDITION (TON ANCIEN LOGIC AMÉLIORÉ) -->
            <div v-if="selectedSection?.id === section.id">

              <div class="flex gap-2 mb-2">
                <button @click="makeBold(section)" class="px-2 border rounded font-bold">B</button>
                <button @click="makeUppercase(section)" class="px-2 border rounded">Aa</button>
                <button @click="addEmoji(section)" class="px-2 border rounded">😊</button>
              </div>

              <input
                v-model="section.props.title"
                class="border p-2 w-full mt-2 rounded"
                @input="autoSave"
              />

              <div class="text-xs text-gray-500 mt-2">
                ID: {{ section.id }}
              </div>

            </div>

          </div>

        </div>

      </div>

      <!-- ================= RIGHT (ARBORESCENCE + CODE) ================= -->
      <div class="w-80 border-l pl-4">

        <h3 class="font-bold mb-2">📁 Arborescence</h3>

        <div class="space-y-2 text-sm">

          <div
            v-for="file in files"
            :key="file.name"
            @click="selectFile(file.name)"
            class="p-2 rounded cursor-pointer"
            :class="selectedFile === file.name ? 'bg-blue-100 font-bold' : ''"
          >
            📄 {{ file.name }}
          </div>

        </div>

        <!-- 🔥 CODE VIEW -->
        <div class="mt-4 bg-black text-green-400 p-3 h-64 overflow-auto text-xs rounded">

          <div class="text-white mb-2 font-bold">
            {{ selectedFile }}
          </div>

          <pre class="whitespace-pre-wrap">
{{ getFileContent(selectedFile) }}
          </pre>

        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

import { auth, db } from "../firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

/* 🔹 STATE */
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref("App.vue")
const loading = ref(true)

let userId = null

/* 🔹 FILES (ARBORESCENCE) */
const files = ref([
  {
    name: "App.vue",
    content: `<template>
  <div>App</div>
</template>`
  },
  {
    name: "MainSection.vue",
    content: `<template>
  <section>Main Section</section>
</template>`
  }
])

/* 🔥 LOAD FIRESTORE */
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {

    if (!user) {
      alert("Non connecté")
      return
    }

    userId = user.uid

    const snap = await getDoc(doc(db, "users", user.uid))

    if (snap.exists()) {
      sections.value = snap.data().sections || []
    }

    loading.value = false
  })
})

/* ================== SECTION ACTIONS ================== */

// ➕ ADD SECTION
const addSection = () => {
  sections.value.push({
    id: Date.now(),
    type: "Header",
    props: {
      title: "Titre ici"
    }
  })
}

// 🗑 DELETE SECTION
const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)

  if (selectedSection.value?.id === id) {
    selectedSection.value = null
  }

  autoSave()
}

// 🎯 SELECT
const selectSection = (section) => {
  selectedSection.value = section
}

/* ================== EDIT ACTIONS ================== */

const makeBold = (section) => {
  section.props.title = `**${section.props.title}**`
}

const makeUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const addEmoji = (section) => {
  section.props.title += " 😊"
}

/* ================== ARBORESCENCE ================== */

const selectFile = (name) => {
  selectedFile.value = name
}

const getFileContent = (name) => {
  return files.value.find(f => f.name === name)?.content || "// vide"
}

/* ================== SAVE ================== */

const autoSave = async () => {
  await saveSections()
}

const saveSections = async () => {
  if (!userId) return

  try {
    await updateDoc(doc(db, "users", userId), {
      sections: sections.value
    })
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
</style>
