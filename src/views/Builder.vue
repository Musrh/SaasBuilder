<script setup>
import { ref, onMounted, watch } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// =====================
// STATE
// =====================
const mode = ref("edit");
const pageTitle = ref("Mon site SaaS");
const sections = ref([]);
const template = ref("blank");

let userRef = null;

// =====================
// LOAD USER
// =====================
onMounted(async () => {
  const user = auth.currentUser;
  if (!user) return;

  userRef = doc(db, "users", user.uid);

  const snap = await getDoc(userRef);
  const data = snap.data();

  if (data) {
    pageTitle.value = data.pageTitle || "Mon site SaaS";
    sections.value = data.sections || [];
    template.value = data.template || "blank";

    // si nouveau user → inject template
    if (sections.value.length === 0) {
      applyTemplate(template.value);
    }
  }
});

// =====================
// FIRESTORE AUTO SAVE
// =====================
watch(
  [sections, pageTitle, template],
  async () => {
    if (!userRef) return;

    await updateDoc(userRef, {
      sections: sections.value,
      pageTitle: pageTitle.value,
      template: template.value,
      updatedAt: Date.now(),
    });
  },
  { deep: true }
);

// =====================
// TEMPLATES SYSTEM
// =====================
function applyTemplate(type) {
  template.value = type;

  if (type === "blank") {
    sections.value = [];
  }

  if (type === "landing") {
    sections.value = [
      {
        id: Date.now(),
        type: "hero",
        content: "🔥 Bienvenue sur mon SaaS",
      },
      {
        id: Date.now() + 1,
        type: "text",
        content: "Ceci est une landing page prête à convertir.",
      },
      {
        id: Date.now() + 2,
        type: "cta",
        content: "Clique ici pour commencer",
      },
    ];
  }

  if (type === "portfolio") {
    sections.value = [
      {
        id: Date.now(),
        type: "hero",
        content: "Portfolio Creator",
      },
      {
        id: Date.now() + 1,
        type: "text",
        content: "Mes projets et réalisations",
      },
    ];
  }
}

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
    <div class="flex items-center justify-between p-3 bg-white shadow-sm sticky top-0 z-20">

      <h1 class="font-bold">SaaS Builder</h1>

      <div class="flex gap-2">
        <button @click="toggleMode" class="px-3 py-1 bg-gray-200 rounded text-sm">
          {{ mode === "edit" ? "Preview" : "Edit" }}
        </button>
      </div>
    </div>

    <!-- TEMPLATE SELECTOR -->
    <div v-if="mode === 'edit'" class="p-3 flex gap-2 flex-wrap bg-white border-b">

      <button @click="applyTemplate('blank')" class="px-3 py-2 bg-gray-200 rounded">
        Blank
      </button>

      <button @click="applyTemplate('landing')" class="px-3 py-2 bg-blue-500 text-white rounded">
        Landing
      </button>

      <button @click="applyTemplate('portfolio')" class="px-3 py-2 bg-green-500 text-white rounded">
        Portfolio
      </button>

    </div>

    <!-- CONTENT -->
    <div class="p-4 md:p-10 w-full flex-1">

      <!-- TITLE -->
      <input
        v-if="mode === 'edit'"
        v-model="pageTitle"
        class="w-full text-3xl font-bold border-b p-3 bg-transparent outline-none"
      />

      <h1 v-else class="text-3xl font-bold p-3">
        {{ pageTitle }}
      </h1>

      <!-- ADD SECTION -->
      <div v-if="mode === 'edit'" class="flex gap-2 mt-4 mb-6 flex-wrap">

        <button @click="addSection('text')" class="bg-blue-500 text-white px-3 py-2 rounded">
          + Text
        </button>

        <button @click="addSection('cta')" class="bg-green-500 text-white px-3 py-2 rounded">
          + CTA
        </button>

      </div>

      <!-- SECTIONS -->
      <div
        v-for="section in sections"
        :key="section.id"
        class="bg-white border rounded-xl p-4 mb-4 shadow-sm"
      >

        <div class="flex justify-between mb-2">
          <span class="text-gray-500 text-sm">
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

        <!-- EDIT MODE -->
        <textarea
          v-if="mode === 'edit'"
          v-model="section.content"
          class="w-full min-h-[120px] border p-3 rounded"
        />

        <!-- PREVIEW MODE -->
        <div v-else class="p-3 text-gray-700">
          <h3 v-if="section.type === 'hero'" class="text-2xl font-bold">
            {{ section.content }}
          </h3>

          <p v-else>
            {{ section.content }}
          </p>
        </div>

      </div>

      <!-- EMPTY -->
      <div v-if="sections.length === 0" class="text-center text-gray-400 mt-10">
        Choisis un template ou ajoute une section
      </div>

    </div>
  </div>
</template>

<style scoped>
button {
  transition: 0.2s;
}
button:hover {
  transform: scale(1.03);
}
</style>
