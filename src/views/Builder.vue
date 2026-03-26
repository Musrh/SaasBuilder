<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Builder</h1>

    <div class="border p-4 rounded">
      <div v-for="sec in sections" :key="sec.id" class="p-2 border mb-2">
        {{ sec.name }}
      </div>
    </div>

    <button
      @click="addSection"
      class="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
    >
      Ajouter section
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";

const sections = ref([]);

const addSection = () => {
  sections.value.push({
    id: Date.now(),
    name: "Nouvelle section"
  });
};
</script>
