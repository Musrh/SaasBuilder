<template>
  <div class="w-full font-sans">

    <!-- HERO -->
    <section class="relative min-h-[80vh] flex items-center justify-center text-center overflow-hidden bg-[#f6faf7]">

      <!-- formes décoratives -->
      <div class="absolute top-0 left-0 w-72 h-72 bg-green-200 rounded-full blur-3xl opacity-40"></div>
      <div class="absolute bottom-0 right-0 w-72 h-72 bg-green-300 rounded-full blur-3xl opacity-40"></div>

      <div class="relative z-10 px-6 max-w-2xl mx-auto text-green-900">
        <h1 class="text-4xl md:text-6xl font-bold mb-4">
          Créez votre boutique
        </h1>

        <p class="text-lg text-green-700 mb-2">
          Plateforme SaaS complète : builder + paiements + commandes
        </p>

        <p class="text-2xl font-bold mb-6">
          À partir de <span class="text-green-500">10€ / mois</span>
        </p>

        <!-- Connexion -->
        <div class="mb-4">
          <p class="text-sm text-green-600 mb-2">
            Déjà un compte ?
          </p>

          <button
            @click="goToLogin"
            class="border border-green-400 text-green-700 px-6 py-2 rounded-xl hover:bg-green-100 transition"
          >
            Se connecter
          </button>
        </div>

        <!-- bouton -->
        <button
          @click="scrollToPlans"
          class="mt-4 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition"
        >
          Voir les offres ↓
        </button>
      </div>
    </section>

    <!-- PLANS -->
    <section ref="plansRef" class="py-20 bg-[#f6faf7] relative">

      <!-- formes -->
      <div class="absolute top-10 left-10 w-40 h-40 bg-green-200 rounded-full opacity-30"></div>
      <div class="absolute bottom-10 right-10 w-40 h-40 bg-green-300 rounded-full opacity-30"></div>

      <div class="max-w-5xl mx-auto px-6 relative z-10">
        <h2 class="text-3xl font-bold text-center mb-4 text-green-900">
          Nos offres
        </h2>

        <p class="text-green-600 text-center mb-12">
          Choisissez le plan adapté à votre activité
        </p>

        <div class="grid md:grid-cols-2 gap-8">

          <!-- FREE -->
          <div class="bg-white/80 backdrop-blur rounded-2xl p-8 flex flex-col border border-green-100">

            <h3 class="text-xl font-bold mb-2 text-green-900">Gratuit</h3>

            <p class="text-4xl font-bold text-green-700">0€</p>
            <p class="text-green-500 mb-6">/mois</p>

            <ul class="space-y-2 text-sm text-green-700 mb-8 flex-1">
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
          <div class="bg-white/90 backdrop-blur rounded-2xl p-8 flex flex-col border-2 border-green-400 relative">

            <!-- badge -->
            <div class="absolute top-4 right-4 text-xs bg-green-500 text-white px-3 py-1 rounded-full">
              POPULAIRE
            </div>

            <h3 class="text-xl font-bold mb-2 text-green-900">Pro</h3>

            <p class="text-4xl font-bold text-green-700">10€</p>
            <p class="text-green-500 mb-6">/mois</p>

            <ul class="space-y-2 text-sm text-green-700 mb-8 flex-1">
              <li>• Multi-pages</li>
              <li>• Builder visuel</li>
              <li>• Paiement</li>
              <li>• Analytics</li>
              <li>• Support prioritaire</li>
            </ul>

            <button
              @click="selectPlan('pro')"
              class="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition"
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

const router = useRouter()
const plansRef = ref(null)

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
/* optionnel : police plus élégante */
body {
  font-family: 'Inter', sans-serif;
}
</style>
