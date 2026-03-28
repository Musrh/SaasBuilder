<template>
  <div class="w-full">

    <!-- 🔥 HERO (image réduite) -->
    <div class="relative h-[45vh] flex items-center justify-center text-center">

      <!-- IMAGE -->
      <img
        src="https://images.unsplash.com/photo-1498050108023-c5249f4df085"
        class="absolute inset-0 w-full h-full object-cover opacity-30"
      />

      <!-- CONTENU -->
      <div class="relative z-10 px-4">
        <h1 class="text-2xl md:text-4xl font-bold text-blue-600 mb-3">
          Créez votre site sur mesure
        </h1>

        <p class="text-gray-700 text-sm md:text-lg mb-2">
          Obtenez un résultat professionnel en quelques clics
        </p>

        <p class="text-blue-500 text-base md:text-xl font-semibold">
          À partir de 1 € HT/mois
        </p>
      </div>

    </div>

    <!-- 🔥 OFFRES -->
    <div class="py-10 bg-gray-50 text-center">

      <h2 class="text-2xl md:text-3xl font-bold text-blue-600 mb-2">
        Nos offres
      </h2>

      <div class="w-16 h-1 bg-blue-400 mx-auto mb-8 rounded"></div>

      <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto px-4">

        <!-- GRATUIT -->
        <div class="bg-white shadow rounded-xl p-6 border-t-4 border-gray-400">
          <h3 class="text-xl font-bold mb-2">Gratuit</h3>
          <p class="text-gray-500 mb-4">Idéal pour tester</p>
          <p class="text-2xl font-bold mb-4">0€</p>

          <button
            @click="selectPlan('free')"
            class="border px-4 py-2 rounded hover:bg-gray-100"
          >
            Choisir
          </button>
        </div>

        <!-- PAYANT -->
        <div class="bg-white shadow-xl rounded-xl p-6 border-t-4 border-blue-500">
          <h3 class="text-xl font-bold mb-2 text-blue-600">Pro</h3>
          <p class="text-gray-500 mb-4">Pour projets sérieux</p>
          <p class="text-2xl font-bold mb-4">5€ / mois</p>

          <button
            @click="selectPlan('paid')"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Choisir
          </button>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { useRouter } from "vue-router"

const router = useRouter()

const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan)
  router.push("/auth")
}
</script>
