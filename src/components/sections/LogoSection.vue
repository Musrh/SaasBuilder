<template>
  <div class="flex items-center">
    <span class="text-xl font-bold text-white">
      {{ text }}
    </span>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: "MonSite"
  }
});
</script>
