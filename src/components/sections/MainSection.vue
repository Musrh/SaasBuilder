<template>
  <main class="min-h-[60vh] bg-gray-50 p-4 md:p-8">

    <!-- 🔹 Zone vide -->
    <div
      v-if="!hasContent"
      class="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-400"
    >
      <p class="text-lg font-semibold">Ajoutez des sections ici</p>
      <p class="text-sm">Utilisez les boutons en haut pour commencer</p>
    </div>

    <!-- 🔹 Contenu dynamique -->
    <div class="space-y-6">
      <slot />
    </div>

  </main>
</template>

<script setup>
import { computed, useSlots } from "vue";

// 🔹 Vérifier si des sections existent
const slots = useSlots();

const hasContent = computed(() => {
  return slots.default && slots.default().length > 0;
});
</script>

<style scoped>
main {
  transition: all 0.3s ease;
}
</style>
