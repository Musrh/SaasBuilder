<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Builder</h1>

    <!-- 🔹 Bouton -->
    <button
      @click="showSelector = !showSelector"
      class="bg-blue-500 text-white px-4 py-2 rounded mb-4"
    >
      Ajouter une section
    </button>

    <!-- 🔹 Liste des sections -->
    <div v-if="showSelector" class="mb-4 border p-4 rounded bg-gray-50">
      <p class="font-semibold mb-2">Choisir une section :</p>

      <button
        v-for="section in availableSections"
        :key="section.name"
        @click="addSection(section)"
        class="block w-full text-left p-2 border mb-2 rounded hover:bg-gray-100"
      >
        {{ section.name }}
      </button>
    </div>

    <!-- 🔹 Preview du site -->
    <div class="border p-4 rounded bg-white">
      <h2 class="font-bold mb-2">Aperçu du site</h2>

      <component
        v-for="(sec, index) in sections"
        :key="index"
        :is="sec.component"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

// 🔹 Import des sections
import Logo from "../sections/Logo.vue";
import Menu from "../sections/Menu.vue";
import Header from "../sections/Header.vue";

// 🔹 Sections disponibles
const availableSections = [
  { name: "Logo", component: Logo },
  { name: "Menu", component: Menu },
  { name: "Header", component: Header },
];

// 🔹 Sections ajoutées au site
const sections = ref([]);

// 🔹 Afficher le choix
const showSelector = ref(false);

// 🔹 Ajouter une section
const addSection = (section) => {
  sections.value.push(section);
  showSelector.value = false;
};
</script>
