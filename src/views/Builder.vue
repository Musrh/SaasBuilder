<script setup>
import { ref, onMounted, watch } from "vue";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// =====================
// STATE
// =====================
const mode = ref("edit");
const pageTitle = ref("Ma page SaaS");
const sections = ref([]);
const loading = ref(true);

let userRef = null;

// =====================
// LOAD USER DATA
// =====================
onMounted(async () => {
  const user = auth.currentUser;
  if (!user) return;

  userRef = doc(db, "users", user.uid);

  const snap = await getDoc(userRef);
  const data = snap.data();

  if (data) {
    sections.value = data.sections || [];
    pageTitle.value = data.pageTitle || "Ma page SaaS";
  }

  loading.value = false;
});

// =====================
// AUTO SAVE FIRESTORE
// =====================
watch(
  [sections, pageTitle],
  async () => {
    if (!userRef) return;

    await updateDoc(userRef, {
      sections: sections.value,
      pageTitle: pageTitle.value,
      updatedAt: Date.now(),
    });
  },
  { deep: true }
);

// =====================
// METHODS
// =====================
function addSection(type) {
  sections.value.push({
    id: Date.now(),
    type,
    content: "",
  });
}

function removeSection(id) {
  sections.value = sections.value.filter((s) => s.id !== id);
}

function toggleMode() {
  mode.value = mode.value === "edit" ? "preview" : "edit";
}
</script>

<template>
  <div class="w-full min-h-screen bg-[#f6f7fb] flex flex-col">

    <!-- TOP BAR -->
    <div class="w-full flex items-center justify-between p-3 bg-white shadow-sm sticky top-0 z-20">
      <h1 class="font-bold text-lg">Builder SaaS</h1>

      <div class="flex gap-2">
        <button
          @click="toggleMode"
          class="px-3 py-1 rounded bg-gray-200 text-sm"
        >
          {{ mode === "edit" ? "Preview" : "Edit" }}
        </button>

        <button
          class="px-3 py-1 rounded bg-blue-500 text-white text-sm"
        >
          Save ✓
        </button>
      </div>
    </div>

    <!-- MAIN CONTAINER -->
    <div class="w-full flex-1 p-3 md:p-8">

      <!-- TITLE -->
      <input
        v-if="mode === 'edit'"
        v-model="pageTitle"
        class="w-full text-3xl md:text-4xl font-bold border-b p-3 bg-transparent outline-none"
        placeholder="Titre de ta page"
      />

      <h1
        v-else
        class="w-full text-3xl md:text-4xl font-bold p-3"
      >
        {{ pageTitle }}
      </h1>

      <!-- ADD SECTION -->
      <div v-if="mode === 'edit'" class="flex gap-2 mt-4 mb-6 flex-wrap">
        <button
          class="px-3 py-2 bg-blue-500 text-white rounded"
          @click="addSection('text')"
        >
          + Texte
        </button>

        <button
          class="px-3 py-2 bg-green-500 text-white rounded"
          @click="addSection('main')"
        >
          + Main
        </button>
      </div>

      <!-- SECTIONS -->
      <div
        v-for="section in sections"
        :key="section.id"
        class="bg-white rounded-xl shadow-sm border mb-4 p-4"
      >

        <!-- HEADER SECTION -->
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-500">
            {{ section.type }}
          </span>

          <button
            v-if="mode === 'edit'"
            @click="removeSection(section.id)"
            class="text-red-500 text-sm"
          >
            delete
          </button>
        </div>

        <!-- TEXT SECTION -->
        <textarea
          v-if="mode === 'edit'"
          v-model="section.content"
          class="w-full min-h-[120px] p-3 border rounded outline-none"
          placeholder="Écris ici..."
        />

        <div
          v-else
          class="w-full min-h-[120px] p-3 text-gray-700"
        >
          {{ section.content }}
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="sections.length === 0"
        class="text-center text-gray-400 mt-10"
      >
        Aucune section — clique sur “+ Texte”
      </div>
    </div>
  </div>
</template>

<style scoped>
button {
  transition: 0.2s ease;
}

button:hover {
  transform: scale(1.02);
}
</style>
