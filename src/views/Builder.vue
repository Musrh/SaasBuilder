<template>
  <div class="flex min-h-screen">

    <!-- SIDEBAR -->
    <div class="w-1/4 bg-white p-4 shadow">

      <h2 class="font-bold mb-4">Sections</h2>

      <button
        @click="addSection('Header')"
        class="block w-full mb-2 bg-blue-500 text-white p-2"
      >
        + Header
      </button>

      <button
        @click="addSection('Hero')"
        class="block w-full mb-2 bg-purple-500 text-white p-2"
      >
        + Hero
      </button>

    </div>

    <!-- PREVIEW -->
    <div class="flex-1 p-6 bg-gray-100">

      <div class="bg-white shadow min-h-[400px]">

        <div
          v-for="section in sections"
          :key="section.id"
          @click="selectSection(section)"
        >

          <component
            :is="getComponent(section.type)"
            v-bind="section.props"
          />

        </div>

      </div>

      <!-- EDITOR -->
      <div v-if="selectedSection" class="mt-4 p-4 bg-white shadow">

        <h3 class="font-bold mb-2">Edition</h3>

        <div
          v-for="(val, key) in selectedSection.props"
          :key="key"
        >
          <label>{{ key }}</label>

          <input
            v-model="selectedSection.props[key]"
            class="border p-2 w-full mb-2"
            @input="autoSave"
          />
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// 🔹 IMPORT COMPONENTS
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
const getComponent = (type) => {
  return registry[type] || null;
};

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
</script>
