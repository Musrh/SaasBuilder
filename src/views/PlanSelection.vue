<template>
  <div class="w-full">

    <!-- 🔥 HERO -->
    <section class="relative h-[80vh] flex items-center justify-center text-center">

      <!-- IMAGE BACKGROUND -->
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
        class="absolute inset-0 w-full h-full object-cover"
      />

      <!-- OVERLAY -->
      <div class="absolute inset-0 bg-white/70"></div>

      <!-- CONTENT -->
      <div class="relative z-10 px-6">

        <h1 class="text-4xl md:text-5xl font-bold text-blue-500 mb-4">
          Créez votre site sur mesure
        </h1>

        <p class="text-lg text-gray-700 mb-2">
          Obtenez un résultat professionnel en quelques clics
        </p>

        <p class="text-xl text-gray-800 mb-6">
          À partir de <span class="text-blue-500 font-bold">1 € HT/mois</span>
        </p>

        <button
          @click="scrollToPlans"
          class="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg shadow hover:bg-blue-600 transition"
        >
          Commencer →
        </button>

      </div>
    </section>

    <!-- 🔥 OFFRES -->
    <section ref="plansRef" class="py-16 bg-gray-100 text-center">

      <h2 class="text-3xl font-bold text-blue-500 mb-4">
        Nos offres
      </h2>

      <div class="w-16 h-1 bg-blue-400 mx-auto mb-10 rounded"></div>

      <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">

        <!-- PLAN FREE -->
        <div class="bg-white rounded-xl shadow hover:shadow-lg transition p-6">

          <h3 class="text-xl font-bold text-blue-400 mb-2">
            Vitrine
          </h3>

          <p class="text-3xl font-bold mb-4">
            1€
            <span class="text-sm text-gray-500">/mois</span>
          </p>

          <ul class="text-gray-600 mb-6 space-y-2">
            <li>✔ 1 page</li>
            <li>✔ Design simple</li>
            <li>✔ Hébergement inclus</li>
          </ul>

          <button
            @click="selectPlan('free')"
            class="w-full bg-blue-400 text-white py-2 rounded hover:bg-blue-500"
          >
            Choisir
          </button>

        </div>

        <!-- PLAN PRO -->
        <div class="bg-white rounded-xl shadow-lg border-2 border-blue-500 p-6 scale-105">

          <h3 class="text-xl font-bold text-blue-500 mb-2">
            Pro
          </h3>

          <p class="text-3xl font-bold mb-4">
            5€
            <span class="text-sm text-gray-500">/mois</span>
          </p>

          <ul class="text-gray-600 mb-6 space-y-2">
            <li>✔ Multi pages</li>
            <li>✔ Design avancé</li>
            <li>✔ Support premium</li>
          </ul>

          <button
            @click="selectPlan('pro')"
            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Choisir
          </button>

        </div>

        <!-- PLAN PREMIUM -->
        <div class="bg-white rounded-xl shadow hover:shadow-lg transition p-6">

          <h3 class="text-xl font-bold text-purple-500 mb-2">
            Premium
          </h3>

          <p class="text-3xl font-bold mb-4">
            10€
            <span class="text-sm text-gray-500">/mois</span>
          </p>

          <ul class="text-gray-600 mb-6 space-y-2">
            <li>✔ E-commerce</li>
            <li>✔ Paiement intégré</li>
            <li>✔ Analytics</li>
          </ul>

          <button
            @click="selectPlan('premium')"
            class="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600"
          >
            Choisir
          </button>

        </div>

      </div>

    </section>

  </div>
</template>

<script setup>
import { useRouter } from "vue-router"
import { ref } from "vue"

const router = useRouter()
const plansRef = ref(null)

const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan)
  router.push("/auth")
}

const scrollToPlans = () => {
  plansRef.value.scrollIntoView({ behavior: "smooth" })
}
</script>
