<template>
  <div class="p-6 text-center">
    <h1 class="text-2xl font-bold mb-6">Choisir votre plan</h1>

    <button
      class="bg-gray-200 px-4 py-2 rounded m-2"
      @click="selectPlan('free')"
    >
      Gratuit
    </button>

    <button
      class="bg-blue-500 text-white px-4 py-2 rounded m-2"
      @click="selectPlan('paid')"
    >
      Payant
    </button>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan);
  router.push("/auth");
};
</script>
