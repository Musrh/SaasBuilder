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
    <div class="flex flex-1">

      <!-- 🔹 LEFT (PREVIEW + EDITOR) -->
      <div class="flex-1 p-4 bg-gray-100 flex flex-col">

        <!-- PREVIEW -->
        <div class="bg-white shadow p-4 flex-1 overflow-auto">

          <div
            v-for="section in sections"
            :key="section.id"
            @click="selectSection(section)"
            class="cursor-pointer border mb-2"
            :class="selectedSection?.id === section.id ? 'border-blue-500' : ''"
          >
            <component
              :is="getComponent(section.type)"
              v-bind="section.props"
            />
          </div>

        </div>

        <!-- EDITOR -->
        <div v-if="selectedSection" class="bg-white p-4 mt-4 shadow">

          <h3 class="font-bold mb-2">Edition</h3>

          <div v-for="(val, key) in selectedSection.props" :key="key">
            <label>{{ key }}</label>
            <input
              v-model="selectedSection.props[key]"
              class="border p-2 w-full mb-2"
              @input="autoSave"
            />
          </div>

        </div>

      </div>

      <!-- 🔹 RIGHT (FILES TREE) -->
      <div class="w-1/4 bg-white p-4 shadow">

        <h3 class="font-bold mb-4">Fichiers</h3>

        <ul class="text-sm space-y-1">
          <li>📄 index.html</li>
          <li>📄 App.vue</li>
          <li>📄 main.js</li>
          <li>📄 firebase.js</li>
          <li>📄 package.json</li>

          <li class="mt-2 font-semibold">Sections :</li>

          <li v-for="sec in sections" :key="sec.id">
            📄 {{ sec.type }}.vue
          </li>
        </ul>

      </div>

    </div>

    <!-- 🔹 BOTTOM (CODE VIEW) -->
    <div class="bg-black text-green-400 p-4 text-xs h-48 overflow-auto font-mono">

      {{ generatedCode }}

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// 🔹 IMPORT
import HeaderSection from "../components/sections/HeaderSection.vue";
import HeroSection from "../components/sections/HeroSection.vue";

// 🔹 STATE
const sections = ref([]);
const selectedSection = ref(null);
let userId = null;

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
      sections.value = snap.data().sections || [];
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

// 🔹 GET COMPONENT
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

// 🔥 GENERATE HTML (important)
const generatedCode = computed(() => {
  let html = `<html>\n<body>\n`;

  sections.value.forEach(sec => {
    if (sec.type === "Header") {
      html += `<h1>${sec.props.title}</h1>\n`;
    }

    if (sec.type === "Hero") {
      html += `<section>\n<h2>${sec.props.title}</h2>\n<p>${sec.props.subtitle}</p>\n</section>\n`;
    }
  });

  html += `</body>\n</html>`;

  return html;
});
</script>
