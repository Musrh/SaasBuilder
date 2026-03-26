<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center p-6">
    <h1 class="text-3xl font-bold mb-6">Choisissez votre plan</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="p-6 border rounded-lg shadow-md hover:shadow-xl transition cursor-pointer bg-white"
        @click="selectPlan(plan)"
      >
        <h2 class="text-2xl font-semibold mb-2">{{ plan.name }}</h2>
        <p class="text-gray-600 mb-4">{{ plan.price === 0 ? "Offert" : plan.price + "€ / mois" }}</p>
        <div class="text-center">
          <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            Sélectionner
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const plans = [
  { id: 1, name: "Plan Offert", price: 0 },
  { id: 2, name: "Plan Pro", price: 20 },
  { id: 3, name: "Plan Premium", price: 50 },
];

const selectPlan = (plan) => {
  // Redirection vers AuthForm avec le plan choisi
  router.push({ name: "AuthForm", query: { plan: plan.id } });
};
</script>
