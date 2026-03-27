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

      <!-- 🔹 LEFT -->
      <div class="w-full md:w-3/4 p-4 bg-gray-100 flex flex-col">

        <!-- 🔹 PREVIEW -->
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
              :key="section.id + JSON.stringify(section.props)"
            />
          </div>

        </div>

        <!-- 🔹 EDITOR -->
        <div v-if="selectedSection" class="bg-white p-4 mt-4 shadow rounded">

          <h3 class="font-bold mb-2">Edition</h3>

          <div v-for="(val, key) in selectedSection.props" :key="key">
            <label class="text-sm text-gray-600">{{ key }}</label>

            <input
              v-model="selectedSection.props[key]"
              class="border p-2 w-full mb-2 rounded"
              @input="autoSave"
              @blur="closeEditor"
              @keyup.enter="closeEditor"
            />
          </div>

          <button
            @click="deleteSection"
            class="w-full bg-red-500 text-white py-2 rounded mt-2"
          >
            Supprimer
          </button>

        </div>

      </div>

      <!-- 🔹 RIGHT FILE TREE -->
      <div class="w-full md:w-1/4 bg-white p-4 shadow">

        <h3 class="font-bold mb-4">Fichiers</h3>

        <ul class="text-sm space-y-1">

          <li @click="selectFile('index.html')" class="cursor-pointer hover:text-blue-500">
            📄 index.html
          </li>

          <li @click="selectFile('App.vue')" class="cursor-pointer hover:text-blue-500">
            📄 App.vue
          </li>

          <li @click="selectFile('main.js')" class="cursor-pointer hover:text-blue-500">
            📄 main.js
          </li>

          <li @click="selectFile('firebase.js')" class="cursor-pointer hover:text-blue-500">
            📄 firebase.js
          </li>

          <li class="mt-2 font-semibold">Sections :</li>

          <li
            v-for="(sec, i) in sections"
            :key="sec.id"
            @click="selectFile(sec.type + i)"
            class="cursor-pointer hover:text-blue-500"
          >
            📄 {{ sec.type }}{{ i + 1 }}.vue
          </li>

        </ul>

      </div>

    </div>

    <!-- 🔹 BOTTOM CODE -->
    <div class="bg-black text-green-400 p-4 text-xs h-48 overflow-auto font-mono">
      <pre>{{ generatedCode }}</pre>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import HeaderSection from "../components/sections/HeaderSection.vue";
import HeroSection from "../components/sections/HeroSection.vue";

// 🔹 STATE
const sections = ref([]);
const selectedSection = ref(null);
const selectedFile = ref("index.html");
let userId = null;
let draggedIndex = null;

// 🔹 REGISTRY
const registry = {
  Header: HeaderSection,
  Hero: HeroSection
};

// 🔹 LOAD
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    userId = user.uid;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      const data = snap.data().sections || [];

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

// 🔹 ADD
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

// 🔹 CLOSE EDITOR
const closeEditor = () => {
  selectedSection.value = null;
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

// 🔹 DRAG
const dragStart = (index) => {
  draggedIndex = index;
};

const drop = async (index) => {
  if (draggedIndex === null) return;

  const moved = sections.value.splice(draggedIndex, 1)[0];
  sections.value.splice(index, 0, moved);

  draggedIndex = null;
  await save();
};

// 🔹 FILE SELECT
const selectFile = (file) => {
  selectedFile.value = file;
};

// 🔹 COMPONENT
const getComponent = (type) => registry[type];

// 🔹 SAVE
const save = async () => {
  if (!userId) return;

  await updateDoc(doc(db, "users", userId), {
    sections: sections.value
  });
};

// 🔹 AUTOSAVE
const autoSave = () => {
  save();
};

// 🔹 CODE GENERATOR
const generatedCode = computed(() => {

  if (selectedFile.value === "index.html") {
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
  }

  if (selectedFile.value === "App.vue") {
    return `<template>\n  <router-view />\n</template>`;
  }

  if (selectedFile.value === "main.js") {
    return `createApp(App).use(router).mount('#app')`;
  }

  if (selectedFile.value === "firebase.js") {
    return `// Firebase config`;
  }

  const sec = sections.value.find((s, i) => s.type + i === selectedFile.value);

  if (sec) {
    return `<template>
  <div>
    ${JSON.stringify(sec.props, null, 2)}
  </div>
</template>`;
  }

  return "";
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
