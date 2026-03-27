<template>
  <div class="flex flex-col min-h-screen">

    <!-- 🔹 TOP -->
    <div class="bg-white shadow p-3 flex gap-2">
      <button @click="addSection('Header')" class="btn-blue">+ Header</button>
      <button @click="addSection('Hero')" class="btn-purple">+ Hero</button>
    </div>

    <div class="flex flex-1">

      <!-- 🔹 MAIN -->
      <div class="flex-1 flex flex-col bg-gray-100 p-4">

        <!-- 🔹 PREVIEW -->
        <div class="bg-white p-4 rounded shadow flex-1 overflow-auto">

          <div
            v-for="(section, index) in sections"
            :key="section.id"
            draggable="true"
            @dragstart="dragStart(index)"
            @dragover.prevent
            @drop="drop(index)"
            @click="selectSection(section)"
            class="border mb-3 p-2 cursor-move rounded"
            :class="selectedSection?.id === section.id ? 'border-blue-500' : ''"
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

          <!-- TOOLBAR -->
          <div class="flex gap-2 mb-3 border-b pb-2">
            <span class="text-sm font-semibold">Mode édition</span>
          </div>

          <div v-for="(val, key) in selectedSection.props" :key="key">
            <label class="text-sm">{{ key }}</label>
            <input
              v-model="selectedSection.props[key]"
              class="input"
              @input="autoSave"
              @blur="closeEditor"
              @keyup.enter="closeEditor"
            />
          </div>

        </div>

      </div>

      <!-- 🔹 FILE TREE RIGHT -->
      <div class="w-72 bg-white border-l p-4">

        <h3 class="font-bold mb-3">📁 Fichiers</h3>

        <ul class="space-y-1 text-sm">

          <li @click="selectFile('index.html')" :class="fileClass('index.html')">📄 index.html</li>
          <li @click="selectFile('App.vue')" :class="fileClass('App.vue')">📄 App.vue</li>
          <li @click="selectFile('main.js')" :class="fileClass('main.js')">📄 main.js</li>
          <li @click="selectFile('firebase.js')" :class="fileClass('firebase.js')">📄 firebase.js</li>

          <li class="mt-2 font-semibold">Sections</li>

          <li
            v-for="(sec, i) in sections"
            :key="sec.id"
            @click="selectFile(sec.type + i)"
            :class="fileClass(sec.type + i)"
          >
            📄 {{ sec.type }}{{ i + 1 }}.vue
          </li>

        </ul>

        <!-- 🔥 DELETE FROM TREE -->
        <button
          v-if="selectedSectionFromFile"
          @click="deleteFromTree"
          class="w-full bg-red-500 text-white mt-4 py-2 rounded"
        >
          Supprimer section
        </button>

      </div>

    </div>

    <!-- 🔹 CODE VIEW -->
    <div class="bg-black text-green-400 p-4 h-52 overflow-auto text-xs font-mono">
      <pre>{{ generatedCode }}</pre>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import HeaderSection from "../components/sections/HeaderSection.vue";
import HeroSection from "../components/sections/HeroSection.vue";

const sections = ref([]);
const selectedSection = ref(null);
const selectedFile = ref("index.html");
const selectedSectionFromFile = ref(null);

let userId = null;
let draggedIndex = null;

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
      sections.value = snap.data().sections || [];
    }
  });
});

// 🔹 ADD
const addSection = (type) => {
  sections.value.push({
    id: Date.now(),
    type,
    props: type === "Hero"
      ? { title: "Hero title", subtitle: "Sous titre" }
      : { title: "Titre" }
  });

  save();
};

// 🔹 SELECT SECTION
const selectSection = (sec) => {
  selectedSection.value = sec;
};

// 🔹 CLOSE EDITOR
const closeEditor = () => {
  selectedSection.value = null;
};

// 🔹 DRAG
const dragStart = (i) => draggedIndex = i;

const drop = async (i) => {
  const item = sections.value.splice(draggedIndex, 1)[0];
  sections.value.splice(i, 0, item);
  draggedIndex = null;
  await save();
};

// 🔹 FILE SELECT
const selectFile = (file) => {
  selectedFile.value = file;

  const sec = sections.value.find((s, i) => s.type + i === file);
  selectedSectionFromFile.value = sec || null;
};

// 🔹 DELETE FROM TREE
const deleteFromTree = async () => {
  if (!selectedSectionFromFile.value) return;

  sections.value = sections.value.filter(
    s => s.id !== selectedSectionFromFile.value.id
  );

  selectedSectionFromFile.value = null;
  await save();
};

// 🔹 CLASS ACTIVE FILE
const fileClass = (file) => {
  return selectedFile.value === file
    ? "text-blue-500 font-bold cursor-pointer"
    : "cursor-pointer hover:text-blue-500";
};

// 🔹 SAVE
const save = async () => {
  if (!userId) return;

  await updateDoc(doc(db, "users", userId), {
    sections: sections.value
  });
};

// 🔹 AUTOSAVE
const autoSave = () => save();

// 🔹 COMPONENT
const getComponent = (type) => registry[type];

// 🔹 CODE GENERATOR
const generatedCode = computed(() => {

  if (selectedFile.value === "index.html") {
    let html = `<html>\n<body>\n`;

    sections.value.forEach(sec => {
      if (sec.type === "Header") {
        html += `<h1>${sec.props.title}</h1>\n`;
      }
      if (sec.type === "Hero") {
        html += `<section><h2>${sec.props.title}</h2><p>${sec.props.subtitle}</p></section>\n`;
      }
    });

    html += `</body>\n</html>`;
    return html;
  }

  const sec = sections.value.find((s, i) => s.type + i === selectedFile.value);

  if (sec) {
    return `<template>
  <div>
    ${JSON.stringify(sec.props, null, 2)}
  </div>
</template>`;
  }

  return "// fichier";
});
</script>

<style>
.btn-blue { @apply bg-blue-500 text-white px-3 py-1 rounded; }
.btn-purple { @apply bg-purple-500 text-white px-3 py-1 rounded; }
.input { @apply border p-2 w-full mb-2 rounded; }

[draggable="true"]:active {
  opacity: 0.5;
}
</style>
