<template>
  <div class="flex flex-col min-h-screen">

    <!-- 🔹 TOP BAR -->
    <div class="bg-white shadow p-4 flex gap-2">
      <button @click="addSection('Header')" class="bg-blue-500 text-white px-3 py-1 rounded">
        + Header
      </button>

      <button @click="addSection('Hero')" class="bg-purple-500 text-white px-3 py-1 rounded">
        + Hero
      </button>
    </div>

    <!-- 🔹 MAIN -->
    <div class="flex flex-col md:flex-row flex-1">

      <!-- 🔹 LEFT (PREVIEW + EDITOR) -->
      <div class="w-full md:w-3/4 p-4 bg-gray-100 flex flex-col">

        <!-- PREVIEW -->
        <div class="bg-white shadow p-4 flex-1 overflow-auto rounded">

          <div
            v-for="(section, index) in sections"
            :key="section.id"
            draggable="true"
            @dragstart="dragStart(index)"
            @dragover.prevent
            @drop="drop(index)"
            @click="selectSection(section)"
            class="cursor-move border mb-3 p-2 rounded transition"
            :class="selectedSection?.id === section.id ? 'border-blue-500' : 'border-gray-200'"
          >
            <component
              :is="getComponent(section.type)"
              v-bind="section.props"
            />
          </div>

        </div>

        <!-- EDITOR -->
        <div v-if="selectedSection" class="bg-white p-4 mt-4 shadow rounded">

          <h3 class="font-bold mb-2">Edition</h3>

          <div v-for="(val, key) in selectedSection.props" :key="key">
            <label class="text-sm text-gray-600">{{ key }}</label>
            <input
              v-model="selectedSection.props[key]"
              class="border p-2 w-full mb-2 rounded"
              @input="autoSave"
            />
          </div>

          <!-- DELETE -->
          <button
            @click="deleteSection"
            class="w-full bg-red-500 text-white py-2 rounded mt-2"
          >
            Supprimer
          </button>

        </div>

      </div>

      <!-- 🔹 RIGHT (FILES TREE) -->
      <div class="w-full md:w-1/4 bg-white p-4 shadow">

        <h3 class="font-bold mb-4">Fichiers</h3>

        <ul class="text-sm space-y-1">
          <li>📄 index.html</li>
          <li>📄 App.vue</li>
          <li>📄 main.js</li>
          <li>📄 firebase.js</li>
          <li>📄 package.json</li>

          <li class="mt-2 font-semibold">Sections :</li>

          <li v-for="(sec, i) in sections" :key="sec.id">
            📄 {{ sec.type }}{{ i + 1 }}.vue
          </li>
        </ul>

      </div>

    </div>

    <!-- 🔹 BOTTOM (CODE VIEW) -->
    <div class="bg-black text-green-400 p-4 text-xs h-48 overflow-auto font-mono">

      <pre>{{ generatedCode }}</pre>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// 🔹 IMPORT COMPONENTS
import HeaderSection from "../components/sections/HeaderSection.vue";
import HeroSection from "../components/sections/HeroSection.vue";

// 🔹 STATE
const sections = ref([]);
const selectedSection = ref(null);
let userId = null;

// 🔹 DRAG STATE
let draggedIndex = null;

// 🔹 REGISTRY
const registry = {
  Header: HeaderSection,
  Hero: HeroSection
};

// 🔹 LOAD USER DATA
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    userId = user.uid;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      const data = snap.data().sections || [];

      // 🔥 Anti-duplication
      const unique = [];
      const ids = new Set();

      data.forEach(sec => {
        if (!ids.has(sec.id)) {
          ids.add(sec.id);
          unique.push(sec);
        }
      });

      sections.value = unique;
    }
  });
});

// 🔹 ADD SECTION
const addSection = (type) => {
  sections.value.push({
    id: Date.now(),
    type,
    props:
      type === "Hero"
        ? { title: "Hero title", subtitle: "Sous titre" }
        : { title: "Titre" }
  });

  save();
};

// 🔹 SELECT
const selectSection = (section) => {
  selectedSection.value = section;
};

// 🔹 DELETE
const deleteSection = async () => {
  const index = sections.value.findIndex(s => s.id === selectedSection.value.id);
  if (index !== -1) {
    sections.value.splice(index, 1);
    selectedSection.value = null;
    await save();
  }
};

// 🔹 DRAG START
const dragStart = (index) => {
  draggedIndex = index;
};

// 🔹 DROP
const drop = async (index) => {
  if (draggedIndex === null) return;

  const moved = sections.value.splice(draggedIndex, 1)[0];
  sections.value.splice(index, 0, moved);

  draggedIndex = null;

  await save();
};

// 🔹 GET COMPONENT
const getComponent = (type) => registry[type];

// 🔹 SAVE FIRESTORE
const save = async () => {
  if (!userId) return;

  await updateDoc(doc(db, "users", userId), {
    sections: sections.value
  });
};

// 🔹 AUTO SAVE
const autoSave = () => {
  save();
};

// 🔹 GENERATE HTML
const generatedCode = computed(() => {
  let html = `<html>\n  <body>\n`;

  sections.value.forEach(sec => {
    if (sec.type === "Header") {
      html += `    <h1>${sec.props.title}</h1>\n`;
    }

    if (sec.type === "Hero") {
      html += `    <section>\n`;
      html += `      <h2>${sec.props.title}</h2>\n`;
      html += `      <p>${sec.props.subtitle}</p>\n`;
      html += `    </section>\n`;
    }
  });

  html += `  </body>\n</html>`;

  return html;
});
</script>

<style>
[draggable="true"] {
  transition: all 0.2s ease;
}

[draggable="true"]:active {
  opacity: 0.5;
}
</style>
