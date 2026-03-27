<template>
  <main class="min-h-[60vh] bg-gray-50 p-6">

    <!-- 🔥 MESSAGE SI VIDE -->
    <div
      v-if="!hasContent"
      class="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-400"
    >
      <p class="text-xl font-semibold">📦 Votre contenu ici</p>
      <p class="text-sm mt-2">Ajoutez des sections depuis le bouton en haut</p>
    </div>

    <!-- 🔥 CONTENU -->
    <div v-else class="space-y-6">
      <slot />
    </div>

  </main>
</template>

<script setup>
import { computed, useSlots } from "vue";

const slots = useSlots();

const hasContent = computed(() => {
  return slots.default && slots.default().length > 0;
});
</script>
