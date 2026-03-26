<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center p-6">
    <h1 class="text-3xl font-bold mb-8">Choisissez votre plan</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="p-6 border rounded-lg shadow-md hover:shadow-xl transition bg-white flex flex-col justify-between"
      >
        <div>
          <h2 class="text-2xl font-semibold mb-2">{{ plan.name }}</h2>
          <p class="text-gray-600 mb-4">
            {{ plan.price === 0 ? "Offert" : plan.price + "€ / mois" }}
          </p>
        </div>

        <!-- Bouton pour passer à AuthForm avec le plan choisi -->
        <button
          @click="selectPlan(plan)"
          class="mt-auto bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          Sélectionner
        </button>
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
  // Redirige vers AuthForm.vue et passe le plan choisi via query
  router.push({
    name: "AuthForm",
    query: { plan: plan.id }
  });
};
</script>
