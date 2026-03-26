<template>
  <div class="p-10 bg-blue-500 text-white text-center">
    <h1 class="text-3xl font-bold">{{ title }}</h1>
    <p>{{ subtitle }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  subtitle: String
});
</script>
