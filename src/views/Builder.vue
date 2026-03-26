<template>
  <div class="flex h-screen">
    <!-- Onglet gauche: éditeur -->
    <div class="w-1/4 border-r p-4">
      <h2 class="font-bold mb-2">Éditeur</h2>
      <component-editor :file="selectedFile" />
    </div>

    <!-- Zone principale: drop sections -->
    <div class="flex-1 p-4">
      <h2 class="font-bold mb-4">Votre site</h2>
      <div class="site-drop-area">
        <draggable v-model="sections" item-key="id">
          <component
            v-for="sec in sections"
            :is="sec.component"
            :key="sec.id"
          />
        </draggable>
      </div>
    </div>

    <!-- Onglet droit: arborescence -->
    <div class="w-1/4 border-l p-4">
      <h2 class="font-bold mb-2">Fichiers</h2>
      <file-tree :files="fileTree" @select="selectedFile = $event" />
    </div>

    <!-- Onglet bas: aperçu live -->
    <div class="absolute bottom-0 left-0 right-0 h-1/4 border-t p-2 bg-gray-50">
      <live-preview :sections="sections" />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import draggable from "vuedraggable";
import ComponentEditor from "../components/ComponentEditor.vue";
import FileTree from "../components/FileTree.vue";
import LivePreview from "../components/LivePreview.vue";

// Sections ajoutées
const sections = ref([]);

// Arborescence des fichiers
const fileTree = ref([
  { name: "App.vue" },
  { name: "main.js" },
  { name: "index.html" },
  { name: "firebase.js" },
]);

// Fichier actuellement sélectionné pour édition
const selectedFile = ref(null);
</script>
