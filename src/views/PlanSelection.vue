<!-- ============================================================
  PlanSelection.vue — SaaS FLOW UPDATED
============================================================ -->
<template>
  <div class="w-full">

    <!-- HERO -->
    <section class="relative h-[80vh] flex items-center justify-center text-center overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80"
        class="absolute inset-0 w-full h-full object-cover"
        alt="hero"
      />
      <div class="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-purple-900/70"></div>

      <div class="relative z-10 px-6 max-w-2xl mx-auto text-white">
        <h1 class="text-4xl md:text-6xl font-bold mb-4 leading-tight">
          Créez votre boutique en ligne
        </h1>
        <p class="text-lg text-blue-100 mb-2">
          Plateforme SaaS complète : builder + paiements + commandes
        </p>
        <p class="text-2xl font-bold mb-8">
          À partir de <span class="text-yellow-300">5€ / mois</span>
        </p>
        <button
          @click="scrollToPlans"
          class="bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-xl text-lg font-semibold transition"
        >
          Voir les offres ↓
        </button>
      </div>
    </section>

    <!-- PLANS -->
    <section ref="plansRef" class="py-20 px-6 bg-gray-50">
      <h2 class="text-3xl font-bold text-center mb-4">Nos offres</h2>
      <p class="text-center text-gray-500 mb-12">
        Choisissez le plan adapté à votre activité
      </p>

      <div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">

        <!-- FREE -->
        <div class="bg-white rounded-2xl shadow-lg p-8 flex flex-col">
          <h3 class="text-xl font-bold mb-2">Gratuit</h3>
          <p class="text-4xl font-extrabold">0€</p>
          <p class="text-gray-400 mb-6">/mois</p>
          <ul class="space-y-2 mb-8 flex-1">
            <li>✓ 1 page</li>
            <li>✓ Builder visuel</li>
            <li class="text-gray-400">✗ Paiements clients</li>
          </ul>
          <button
            @click="selectPlan('free')"
            class="w-full bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold"
          >
            Commencer gratuitement
          </button>
        </div>

        <!-- PRO -->
        <div class="bg-white rounded-2xl shadow-xl p-8 flex flex-col border-2 border-blue-500 relative">
          <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-4 py-1 rounded-full">
            Populaire
          </span>
          <h3 class="text-xl font-bold mb-2">Pro</h3>
          <p class="text-4xl font-extrabold">5€</p>
          <p class="text-gray-400 mb-6">/mois</p>
          <ul class="space-y-2 mb-8 flex-1">
            <li>✓ Pages illimitées</li>
            <li>✓ Produits</li>
            <li>✓ Paiements Stripe</li>
            <li>✓ Commandes</li>
          </ul>
          <button
            @click="selectPlan('pro')"
            class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            Choisir Pro
          </button>
        </div>

        <!-- PREMIUM -->
        <div class="bg-white rounded-2xl shadow-lg p-8 flex flex-col">
          <h3 class="text-xl font-bold mb-2">Premium</h3>
          <p class="text-4xl font-extrabold">10€</p>
          <p class="text-gray-400 mb-6">/mois</p>
          <ul class="space-y-2 mb-8 flex-1">
            <li>✓ Multi-stores</li>
            <li>✓ Analytics</li>
            <li>✓ Support prioritaire</li>
          </ul>
          <button
            @click="selectPlan('premium')"
            class="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-semibold"
          >
            Choisir Premium
          </button>
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

// =====================================================
// 🔥 SAAS FLOW : PlanSelection → AuthForm → Dashboard
// =====================================================
const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan)
  router.push({ path: "/auth", query: { plan } })
}

const scrollToPlans = () => {
  plansRef.value?.scrollIntoView({ behavior: "smooth" })
}
</script>
