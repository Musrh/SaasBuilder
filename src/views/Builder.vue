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
    <div class="border p-4 rounded bg-white mt-4">
      <h2 class="font-bold mb-2">Aperçu du site</h2>

      <div v-if="sections.length === 0" class="text-gray-400 text-center py-10">
        Aucune section ajoutée pour le moment
      </div>

      <component
        v-for="(sec, index) in sections"
        :key="index"
        :is="sec.component"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, defineComponent } from "vue";

// 🔹 Sections factices avec defineComponent pour que Vue les affiche correctement
const Logo = defineComponent({
  template: `<div class="p-4 bg-blue-100 text-center font-bold">LOGO</div>`,
});

const Menu = defineComponent({
  template: `<div class="p-4 bg-gray-800 text-white text-center">Menu | Accueil | Produits | Contact</div>`,
});

const Header = defineComponent({
  template: `<div class="p-8 bg-gray-200 text-center">
               <h1 class="text-2xl font-bold">Bienvenue sur mon site</h1>
             </div>`,
});

// 🔹 Liste des sections disponibles
const availableSections = [
  { name: "Logo", component: Logo },
  { name: "Menu", component: Menu },
  { name: "Header", component: Header },
];

// 🔹 Sections ajoutées au site
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
/* Scroll si trop de sections ajoutées */
div[ref="preview"] {
  max-height: 400px;
  overflow-y: auto;
}
</style>
