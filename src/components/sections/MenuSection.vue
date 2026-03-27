<template>
  <nav class="w-full flex items-center justify-between bg-white shadow px-4 py-3 rounded">

    <!-- 🔹 LOGO -->
    <div class="text-lg font-bold text-blue-600">
      {{ title }}
    </div>

    <!-- 🔹 MENU ITEMS -->
    <ul class="hidden md:flex gap-6 text-gray-700 font-medium">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="cursor-pointer hover:text-blue-500 transition"
      >
        {{ item }}
      </li>
    </ul>

    <!-- 🔹 BUTTON (optionnel) -->
    <button
      v-if="buttonText"
      class="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 transition"
    >
      {{ buttonText }}
    </button>

  </nav>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: "My SaaS"
  },

  items: {
    type: Array,
    default: () => ["Home", "Features", "Pricing", "Contact"]
  },

  buttonText: {
    type: String,
    default: "Get Started"
  }
})
</script>

<style scoped>
</style>
