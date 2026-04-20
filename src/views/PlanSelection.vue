<!-- ============================================================
  PlanSelection.vue — SaaS FLOW: Plan → AuthForm → Dashboard
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

        <p class="text-2xl font-bold mb-4">
          À partir de <span class="text-yellow-300">10€ / mois</span>
        </p>

        <!-- Déjà un compte -->
        <div class="bg-white/10 backdrop-blur p-4 rounded-xl mb-4 inline-block">
          <p class="text-sm text-blue-200 mb-2">
            Tu as déjà un compte ?
          </p>
          <button
            @click="goToLogin"
            class="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Se connecter
          </button>
        </div>

        <!-- CTA voir offres -->
        <div>
          <button
            @click="scrollToPlans"
            class="bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-xl text-lg font-semibold transition"
          >
            Voir les offres ↓
          </button>
        </div>

      </div>
    </section>

    <!-- PLANS -->
    <section ref="plansSection" class="py-20 bg-gray-50">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-3xl md:text-4xl font-bold text-center mb-3">Nos offres</h2>
        <p class="text-center text-gray-600 mb-12">
          Choisissez le plan adapté à votre activité
        </p>

        <div class="grid md:grid-cols-2 gap-8">

          <!-- Plan Free -->
          <div class="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <h3 class="text-2xl font-bold mb-2">Gratuit</h3>
            <p class="text-4xl font-bold mb-1">0€</p>
            <p class="text-gray-500 mb-6">/mois</p>

            <ul class="space-y-2 mb-8 text-gray-700">
              <li>✓ 1 page</li>
              <li>✓ Builder visuel</li>
            </ul>

            <button
              @click="selectPlan('free')"
              class="w-full bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold"
            >
              Commencer gratuitement
            </button>
          </div>

          <!-- Plan Pro -->
          <div class="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-500 relative">
            <span class="absolute -top-3 right-6 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
              Populaire
            </span>
            <h3 class="text-2xl font-bold mb-2">Pro</h3>
            <p class="text-4xl font-bold mb-1">10€</p>
            <p class="text-gray-500 mb-6">/mois</p>

            <ul class="space-y-2 mb-8 text-gray-700">
              <li>✓ Multi-pages</li>
              <li>✓ Builder visuel</li>
              <li>✓ Configuration Paiement</li>
              <li>✓ Analytics</li>
              <li>✓ Support prioritaire</li>
            </ul>

            <button
              @click="selectPlan('pro')"
              class="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-semibold"
            >
              Choisir Pro
            </button>
          </div>

        </div>
      </div>
    </section>

    <!-- FOOTER LIENS LÉGAUX -->
    <footer class="bg-gray-900 text-gray-300 py-10">
      <div class="max-w-5xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-sm">
        <router-link to="/privacy-policy" class="hover:text-white">Privacy Policy</router-link>
        <router-link to="/remboursement" class="hover:text-white">Remboursement</router-link>
        <router-link to="/confidentialite" class="hover:text-white">Confidentialité</router-link>
        <router-link to="/mentions" class="hover:text-white">Mentions légales</router-link>
        <router-link to="/conditions" class="hover:text-white">Conditions</router-link>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const plansSection = ref(null)

const goToLogin = () => {
  router.push("/auth?mode=login")
}

const scrollToPlans = () => {
  plansSection.value?.scrollIntoView({ behavior: "smooth" })
}

const selectPlan = (plan) => {
  localStorage.setItem("selectedPlan", plan)
  router.push(`/auth?plan=${plan}`)
}
</script>
