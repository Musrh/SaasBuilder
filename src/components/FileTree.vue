<template>
  <div class="p-4 border rounded bg-gray-50">
    <h3 class="font-bold mb-2">Arborescence</h3>
    <ul>
      <li v-for="file in files" :key="file.name">
        📄 {{ file.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  files: {
    type: Array,
    default: () => []
  }
});
</script>
