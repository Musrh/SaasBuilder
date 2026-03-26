<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow">
      <h1 class="text-3xl font-bold mb-4">Bienvenue sur votre Dashboard !</h1>
      <p class="text-gray-700">Plan choisi : {{ planName }}</p>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
const plan = route.query.plan || null;

// Affichage du nom du plan
const planMap = { 1: "Plan Offert", 2: "Plan Pro", 3: "Plan Premium" };
const planName = planMap[plan] || "Non défini";
</script>
