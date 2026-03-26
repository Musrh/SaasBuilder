<template>
  <div class="p-4 border rounded bg-gray-50 h-full">
    <h3 class="font-bold mb-2">Éditeur de fichier</h3>

    <div v-if="file">
      <p class="text-sm text-gray-600 mb-2">Fichier sélectionné :</p>
      <div class="bg-white p-2 border rounded text-sm">
        {{ file.name }}
      </div>
    </div>

    <div v-else class="text-gray-500">
      Aucun fichier sélectionné
    </div>
  </div>
</template>

<script setup>
defineProps({
  file: Object
});
</script>
