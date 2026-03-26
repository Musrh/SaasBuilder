<template>
  <div class="p-6 text-center">

    <h1 class="text-2xl font-bold mb-6">
      Choisir votre plan
    </h1>

    <div class="space-y-4">

      <button
        class="bg-gray-200 px-4 py-2 rounded w-full"
        @click="selectPlan('free')"
      >
        Gratuit - 30 jours
      </button>

      <button
        class="bg-blue-500 text-white px-4 py-2 rounded w-full"
        @click="selectPlan('paid')"
      >
        Payant - 5$ / mois
      </button>

    </div>

  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const selectPlan = (plan) => {
  // ⚠️ optionnel uniquement pour UX (pas source de vérité SaaS)
  localStorage.setItem("selectedPlan", plan);

  router.push("/auth");
};
</script>
