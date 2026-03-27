<template>
  <div class="flex flex-col min-h-screen">

    <!-- 🔹 TOP BAR -->
    <div class="bg-white shadow p-3 flex flex-wrap gap-2">
      <button
        v-for="sec in availableSections"
        :key="sec"
        @click="addSection(sec)"
        class="bg-blue-500 text-white px-3 py-1 rounded"
      >
        + {{ sec }}
      </button>
    </div>

    <div class="flex flex-1">

      <!-- 🔹 MAIN -->
      <div class="flex-1 flex flex-col bg-gray-100 p-4">

        <!-- 🔹 PREVIEW -->
        <div class="bg-white rounded shadow p-4 flex-1 overflow-auto">

          <!-- HEADER -->
          <HeaderSection>
            <LogoSection />
          </HeaderSection>

          <!-- MAIN -->
          <MainSection>

            <div
              v-for="(section, index) in sections"
              :key="section.id"
              draggable="true"
              @dragstart="dragStart(index)"
              @dragover.prevent
              @drop="drop(index)"
              @click="selectSection(section)"
              class="border mb-3 p-2 rounded cursor-move"
              :class="selectedSection?.id === section.id ? 'border-blue-500' : ''"
            >
              <component
                :is="getComponent(section.type)"
                v-bind="section.props"
                :key="section.id + JSON.stringify(section.props)"
              />
            </div>

          </MainSection>

          <!-- FOOTER -->
          <FooterSection />

        </div>

        <!-- 🔹 EDITOR -->
        <div v-if="selectedSection" class="bg-white p-4 mt-4 rounded shadow">

          <!-- TOOLBAR -->
          <div class="flex gap-2 mb-3 border-b pb-2">
            <button @click="makeBold" class="tool">B</button>
            <button @click="makeUppercase" class="tool">Aa</button>
            <button @click="addEmoji" class="tool">😊</button>
          </div>

          <!-- INPUTS -->
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

      <!-- 🔹 FILE TREE -->
      <div class="w-72 bg-white border-l p-4">

        <h3 class="font-bold mb-3">📁 Fichiers</h3>

        <ul class="space-y-1 text-sm">

          <li @click="selectFile('index.html')" :class="fileClass('index.html')">index.html</li>
          <li @click="selectFile('App.vue')" :class="fileClass('App.vue')">App.vue</li>
          <li @click="selectFile('main.js')" :class="fileClass('main.js')">main.js</li>

          <li class="mt-2 font-semibold">Sections</li>

          <li
            v-for="(sec, i) in sections"
            :key="sec.id"
            @click="selectFile(sec.type + i)"
            :class="fileClass(sec.type + i)"
          >
            {{ sec.type }}{{ i + 1 }}.vue
          </li>

        </ul>

        <button
          v-if="selectedSectionFromFile"
          @click="deleteFromTree"
          class="w-full bg-red-500 text-white mt-4 py-2 rounded"
        >
          Supprimer
        </button>

      </div>

    </div>

    <!-- 🔹 CODE -->
    <div class="bg-black text-green-400 p-4 h-52 overflow-auto text-xs font-mono">
      <pre>{{ generatedCode }}</pre>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from "vue";

import HeaderSection from "../components/sections/HeaderSection.vue";
import FooterSection from "../components/sections/FooterSection.vue";
import LogoSection from "../components/sections/LogoSection.vue";
import MainSection from "../components/sections/MainSection.vue";

// 🔥 AUTO IMPORT
const modules = import.meta.glob("../components/sections/*.vue", { eager: true });

const excluded = ["HeaderSection","FooterSection","LogoSection","MainSection"];

const registry = {};

Object.entries(modules).forEach(([path, module]) => {
  const name = path.split("/").pop().replace(".vue", "");
  if (!excluded.includes(name)) {
    registry[name] = module.default;
  }
});

const availableSections = Object.keys(registry);

// STATE
const sections = ref([]);
const selectedSection = ref(null);
const selectedFile = ref("index.html");
const selectedSectionFromFile = ref(null);

let draggedIndex = null;

// ADD
const addSection = (type) => {
  sections.value.push({
    id: Date.now(),
    type,
    props: { title: "Titre", subtitle: "Sous titre" }
  });
};

// SELECT
const selectSection = (sec) => selectedSection.value = sec;
const closeEditor = () => selectedSection.value = null;

// DRAG
const dragStart = (i) => draggedIndex = i;
const drop = (i) => {
  const item = sections.value.splice(draggedIndex, 1)[0];
  sections.value.splice(i, 0, item);
};

// FILE SELECT
const selectFile = (file) => {
  selectedFile.value = file;
  selectedSectionFromFile.value =
    sections.value.find((s,i)=>s.type+i===file) || null;
};

// DELETE
const deleteFromTree = () => {
  sections.value = sections.value.filter(
    s => s.id !== selectedSectionFromFile.value.id
  );
  selectedSectionFromFile.value = null;
};

// COMPONENT
const getComponent = (type) => registry[type];

// TOOLBAR
const makeBold = () => {
  Object.keys(selectedSection.value.props).forEach(k=>{
    selectedSection.value.props[k] =
      "<b>"+selectedSection.value.props[k]+"</b>";
  });
};

const makeUppercase = () => {
  Object.keys(selectedSection.value.props).forEach(k=>{
    selectedSection.value.props[k] =
      selectedSection.value.props[k].toUpperCase();
  });
};

const addEmoji = () => {
  Object.keys(selectedSection.value.props).forEach(k=>{
    selectedSection.value.props[k] += " 😊";
  });
};

// STYLE
const fileClass = (file) =>
  selectedFile.value === file
    ? "text-blue-500 font-bold cursor-pointer"
    : "cursor-pointer hover:text-blue-500";

// CODE VIEW
const generatedCode = computed(()=>{
  if(selectedFile.value==="index.html"){
    let html="<body>\n";
    sections.value.forEach(sec=>{
      html+=`<div>${sec.type}</div>\n`;
    });
    html+="</body>";
    return html;
  }

  const sec = sections.value.find((s,i)=>s.type+i===selectedFile.value);
  if(sec){
    return JSON.stringify(sec.props,null,2);
  }

  return "// fichier";
});
</script>

<style>
.input { border:1px solid #ccc; padding:8px; width:100%; margin-bottom:8px; }
.tool { background:#eee; padding:5px 8px; border-radius:6px; }
</style>
