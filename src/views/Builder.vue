<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Builder</h1>

    <!-- 🔹 Bouton Ajouter une section -->
    <button
      @click="showSelector = !showSelector"
      class="bg-blue-500 text-white px-4 py-2 rounded mb-4"
    >
      Ajouter une section
    </button>

    <!-- 🔹 Sélecteur de sections -->
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

    <!-- 🔹 Aperçu du site -->
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

// 🔹 Sections factices intégrées pour éviter tout import
const Logo = {
  template: "<div class='p-4 bg-blue-100 text-center font-bold'>LOGO</div>",
};
const Menu = {
  template: "<div class='p-4 bg-gray-800 text-white text-center'>Menu | Accueil | Produits | Contact</div>",
};
const Header = {
  template: "<div class='p-8 bg-gray-200 text-center'><h1 class='text-2xl font-bold'>Bienvenue sur mon site</h1></div>",
};

// 🔹 Sections disponibles
const availableSections = [
  { name: "Logo", component: Logo },
  { name: "Menu", component: Menu },
  { name: "Header", component: Header },
];

// 🔹 Sections ajoutées
const sections = ref([]);

// 🔹 Afficher ou cacher le sélecteur
const showSelector = ref(false);

// 🔹 Ajouter une section
const addSection = (section) => {
  sections.value.push(section);
  showSelector.value = false;
};
</script>

<style scoped>
/* Optionnel : scrollbar pour mobile si beaucoup de sections */
div[ref="preview"] {
  max-height: 400px;
  overflow-y: auto;
}
</style>
