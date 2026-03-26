<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center p-6">
    
    <h1 class="text-4xl font-extrabold mb-10 text-gray-800">
      Choisissez votre plan
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
      
      <div
        v-for="plan in plans"
        :key="plan.id"
        @click="selectedPlan = plan.id"
        class="p-6 rounded-2xl shadow-lg cursor-pointer transition transform hover:scale-105"
        :class="selectedPlan === plan.id 
          ? 'bg-blue-600 text-white shadow-2xl' 
          : 'bg-white'"
      >
        <h2 class="text-2xl font-bold mb-2">{{ plan.name }}</h2>

        <p class="mb-6 text-lg">
          {{ plan.price === 0 ? "Offert" : plan.price + "€ / mois" }}
        </p>

        <button
          @click.stop="selectPlan(plan)"
          class="w-full py-2 rounded-lg font-semibold transition"
          :class="selectedPlan === plan.id
            ? 'bg-white text-blue-600'
            : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          Commencer
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const selectedPlan = ref(null);

const plans = [
  { id: 1, name: "Plan Offert", price: 0 },
  { id: 2, name: "Plan Pro", price: 20 },
  { id: 3, name: "Plan Premium", price: 50 },
];

const selectPlan = (plan) => {
  if (!plan) return;

  // 🔥 Sauvegarde locale (important pour Dashboard)
  localStorage.setItem("planChoisi", plan.id);

  // 🔥 Ajouter expiration simple
  const now = new Date();
  const days = plan.id === 1 ? 30 : 30; // tu peux changer
  now.setDate(now.getDate() + days);

  localStorage.setItem("planExpiry", now.getTime());

  // 🔥 Redirection
  router.push({ name: "AuthForm" });
};
</script>
