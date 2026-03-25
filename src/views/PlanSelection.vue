<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-2xl font-bold mb-6">Choisissez votre plan</h1>

    <div class="flex gap-6">
      <div class="p-6 border rounded text-center">
        <h2 class="text-xl font-bold">Gratuit</h2>
        <p>Valable 30 jours</p>
        <button @click="selectPlan('free')" class="mt-4 bg-gray-500 text-white px-4 py-2 rounded">Choisir</button>
      </div>

      <div class="p-6 border rounded text-center">
        <h2 class="text-xl font-bold">Payant</h2>
        <p>5$/mois</p>
        <button @click="selectPlan('premium')" class="mt-4 bg-green-500 text-white px-4 py-2 rounded">Choisir</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const plan = ref("")

const selectPlan = (chosenPlan) => {
  plan.value = chosenPlan
  // Redirige vers page inscription avec plan choisi
  router.push({ name: "Register", query: { plan: chosenPlan } })
}
</script>
