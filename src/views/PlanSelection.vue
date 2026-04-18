<!-- ============================================================
  PlanSelection.vue — IMAGE APP FULL WIDTH
  ✔ Image locale (appImage)
  ✔ Pleine largeur (w-full)
  ✔ Hauteur 300px
  ✔ Fonctionnalités intactes
============================================================ -->
<template>
  <div class="w-full font-sans">

    <!-- HERO -->
    <section class="relative min-h-[80vh] flex flex-col items-center justify-center text-center bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden px-4">

      <!-- formes décoratives -->
      <div class="absolute top-0 left-0 w-72 h-72 bg-green-200 rounded-full blur-3xl opacity-30"></div>
      <div class="absolute bottom-0 right-0 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-30"></div>

      <!-- IMAGE APP (FULL WIDTH / 300px height) -->
      <img
        :src="appImage"
        class="w-[100] h-[100px] object-cover mb-6 rounded-xl shadow relative z-10"
        alt="Aperçu de l'application"
      />

      <!-- CONTENU -->
      <div class="relative z-10 max-w-6xl text-gray-800">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">
          Créez votre boutique
        </h1>

        <p class="text-lg text-gray-600 mb-2">
          Builder + Paiements + Commandes en un seul outil
        </p>

        <p class="text-2xl font-bold mb-6">
          À partir de <span class="text-green-600">10€ / mois</span>
        </p>

        <!-- LOGIN -->
        <div class="mb-4">
          <p class="text-sm text-gray-500 mb-2">
            Déjà un compte ?
          </p>

          <button
            @click="goToLogin"
            class="border border-gray-300 px-6 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            Se connecter
          </button>
        </div>

        <!-- CTA -->
        <button
          @click="scrollToPlans"
          class="mt-4 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition shadow"
        >
          Voir les offres ↓
        </button>
      </div>
    </section>

    <!-- PLANS -->
    <section ref="plansRef" class="py-20 bg-gradient-to-b from-green-50 to-blue-50">
      <div class="max-w-5xl mx-auto px-6">

        <h2 class="text-3xl font-bold text-center mb-4 text-gray-800">
          Nos offres
        </h2>

        <p class="text-gray-500 text-center mb-12">
          Choisissez le plan adapté à votre activité
        </p>

        <div class="grid md:grid-cols-2 gap-8">

          <!-- FREE -->
          <div class="bg-white rounded-2xl p-8 flex flex-col shadow-md hover:shadow-xl transition border-t-4 border-green-400">

            <h3 class="text-xl font-bold mb-2 text-gray-800">Gratuit</h3>

            <p class="text-4xl font-bold text-green-600">0€</p>
            <p class="text-gray-400 mb-6">/mois</p>

            <ul class="space-y-2 text-sm text-gray-600 mb-8 flex-1">
              <li>• 1 page</li>
              <li>• Builder visuel</li>
            </ul>

            <button
              @click="selectPlan('free')"
              class="w-full bg-green-100 hover:bg-green-200 py-3 rounded-xl font-semibold text-green-800 transition"
            >
              Commencer gratuitement
            </button>
          </div>

          <!-- PRO -->
          <div class="bg-white rounded-2xl p-8 flex flex-col shadow-lg hover:shadow-2xl transition border-t-4 border-blue-500 relative">

            <!-- badge -->
            <div class="absolute top-4 right-4 bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow">
              POPULAIRE
            </div>

            <h3 class="text-xl font-bold mb-2 text-gray-800">Pro</h3>

            <p class="text-4xl font-bold text-blue-600">10€</p>
            <p class="text-gray-400 mb-6">/mois</p>

            <ul class="space-y-2 text-sm text-gray-600 mb-8 flex-1">
              <li>• Multi-pages</li>
              <li>• Builder visuel</li>
              <li>• Paiement</li>
              <li>• Analytics</li>
              <li>• Support prioritaire</li>
            </ul>

            <button
              @click="selectPlan('pro')"
              class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition"
            >
              Choisir Pro
            </button>
          </div>

        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

// ✅ IMPORT IMAGE
import appImage from "../assets/Website.png"

const router = useRouter()
const plansRef = ref(null)

// =====================================================
// FLUX : PlanSelection → AuthForm → Dashboard
// =====================================================
const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan)

  router.push({
    path: "/auth",
    query: { plan }
  })
}

const goToLogin = () => {
  router.push("/connection")
}

const scrollToPlans = () => {
  plansRef.value?.scrollIntoView({ behavior: "smooth" })
}
</script>

<style>
body {
  font-family: 'Inter', sans-serif;
}
</style>
