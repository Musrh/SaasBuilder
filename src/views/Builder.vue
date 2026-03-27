<template>
  <div class="p-6">

    <!-- 🔥 MODE SWITCH -->
    <div class="mb-4 flex items-center gap-3">

      <button
        v-if="mode === 'edit'"
        @click="saveAndPreview"
        class="bg-green-500 text-white px-4 py-2 rounded"
      >
        💾 Sauvegarder → Preview
      </button>

      <button
        v-else
        @click="mode = 'edit'"
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        ✏️ Revenir au mode Édition
      </button>

      <span class="text-sm text-gray-500">
        Mode: <b>{{ mode }}</b>
      </span>

    </div>

    <div v-if="loading">Chargement...</div>

    <div v-else class="flex justify-center">

      <!-- ================= PAGE CANVAS ================= -->
      <div class="w-full max-w-4xl">

        <!-- 🔥 HEADER FIXE -->
        <div class="border-b">
          <HeaderSection />
        </div>

        <!-- 🔥 MAIN PAGE (RECTANGLE CADRÉ) -->
        <div
          class="border-4 border-dashed border-blue-400 bg-white min-h-[500px] p-6 my-4 rounded-lg"
        >

          <div class="text-xs text-gray-400 mb-3">
            📄 MainSection (Page Canvas)
          </div>

          <!-- 🔥 SECTIONS INSIDE MAIN -->
          <div
            v-for="section in sections"
            :key="section.id"
            class="border p-4 mb-3 rounded transition cursor-pointer"
            :class="selectedSection?.id === section.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'"
            @click="selectSection(section)"
          >

            <!-- ================= EDIT MODE ================= -->
            <div v-if="mode === 'edit' && selectedSection?.id === section.id">

              <!-- TOOLBAR -->
              <div class="flex gap-2 mb-3 border-b pb-2">

                <button @click="applyBold(section)" class="font-bold px-2 border rounded">B</button>
                <button @click="applyUppercase(section)" class="px-2 border rounded">Aa</button>
                <button @click="applyEmoji(section)" class="px-2 border rounded">😊</button>

                <!-- 🎨 COLOR -->
                <input type="color" v-model="section.props.color" />

              </div>

              <!-- INPUT -->
              <input
                v-model="section.props.title"
                class="border p-2 w-full rounded"
              />

            </div>

            <!-- ================= PREVIEW ================= -->
            <div v-else :style="{ color: section.props.color }">
              {{ section.props.title }}
            </div>

          </div>

        </div>

        <!-- 🔥 FOOTER FIXE -->
        <div class="border-t">
          <FooterSection />
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { auth, db } from "../firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

import HeaderSection from "../components/sections/HeaderSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"

/* 🔹 STATE */
const sections = ref([])
const selectedSection = ref(null)
const loading = ref(true)
const mode = ref("edit")

let userId = null

/* 🔥 LOAD */
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return

    userId = user.uid
    const snap = await getDoc(doc(db, "users", user.uid))

    if (snap.exists()) {
      sections.value = snap.data().sections || []
    }

    loading.value = false
  })
})

/* ================= MODE ================= */

const saveAndPreview = async () => {
  await saveSections()
  mode.value = "preview"
}

/* ================= SELECTION ================= */

const selectSection = (section) => {
  if (mode.value === "preview") return
  selectedSection.value = section
}

/* ================= TOOLS ================= */

const applyBold = (section) => {
  section.props.title = `**${section.props.title}**`
}

const applyUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const applyEmoji = (section) => {
  section.props.title += " 😊"
}

/* ================= SAVE ================= */

const saveSections = async () => {
  if (!userId) return

  await updateDoc(doc(db, "users", userId), {
    sections: sections.value
  })
}
</script>

<style scoped>
</style>
