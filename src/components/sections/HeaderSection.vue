<template>
  <div class="p-6 bg-gray-200 text-center">
    <h1 class="text-2xl font-bold">
      {{ title || "Titre par défaut" }}
    </h1>
  </div>
</template>

<script setup>
defineProps({
  title: String
});
</script>
