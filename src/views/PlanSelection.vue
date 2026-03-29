<template>
  <div class="w-full">

    <!-- 🔥 HERO -->
    <section class="relative h-[80vh] flex items-center justify-center text-center">

      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f"
        class="absolute inset-0 w-full h-full object-cover"
      />

      <div class="absolute inset-0 bg-white/70"></div>

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
          Voir les offres
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

        <!-- FREE -->
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="text-xl font-bold text-gray-500 mb-2">Free</h3>
          <p class="text-3xl font-bold mb-4">Gratuit</p>

          <ul class="text-gray-600 mb-6 space-y-2">
            <li>✔ 1 page</li>
            <li>✔ Builder simple</li>
          </ul>

          <button
            @click="selectPlan('free')"
            class="w-full bg-gray-500 text-white py-2 rounded"
          >
            Choisir
          </button>
        </div>

        <!-- PRO -->
        <div class="bg-white rounded-xl shadow-lg border-2 border-blue-500 p-6 scale-105">
          <h3 class="text-xl font-bold text-blue-500 mb-2">Pro</h3>
          <p class="text-3xl font-bold mb-4">5€ / mois</p>

          <ul class="text-gray-600 mb-6 space-y-2">
            <li>✔ Multi pages</li>
            <li>✔ Design pro</li>
          </ul>

          <button
            @click="selectPlan('pro')"
            class="w-full bg-blue-500 text-white py-2 rounded"
          >
            Choisir Pro
          </button>
        </div>

        <!-- PREMIUM -->
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="text-xl font-bold text-purple-500 mb-2">Premium</h3>
          <p class="text-3xl font-bold mb-4">10€ / mois</p>

          <ul class="text-gray-600 mb-6 space-y-2">
            <li>✔ E-commerce</li>
            <li>✔ Paiement intégré</li>
          </ul>

          <button
            @click="selectPlan('premium')"
            class="w-full bg-purple-500 text-white py-2 rounded"
          >
            Choisir Premium
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

/* 🔥 SELECT PLAN → AUTH */
const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan)

  // 👉 TOUJOURS AUTH
  router.push(`/auth?plan=${plan}`)
}

const scrollToPlans = () => {
  plansRef.value.scrollIntoView({ behavior: "smooth" })
}
</script>
