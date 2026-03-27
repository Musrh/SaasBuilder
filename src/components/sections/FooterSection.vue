<template>
  <footer class="bg-gray-900 text-white p-6 text-center mt-6">
    
    <p class="text-sm">
      {{ text }}
    </p>

    <div class="mt-2 text-xs text-gray-400">
      © {{ new Date().getFullYear() }} - Tous droits réservés
    </div>

  </footer>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: "Mon site créé avec mon builder"
  }
});
</script>
