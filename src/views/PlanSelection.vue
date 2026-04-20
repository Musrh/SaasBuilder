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

        <!-- ✅ 1) Bloc "Se connecter" déplacé via translate (X = horizontal, Y = vertical) -->
        <!-- Modifie les valeurs translate-x-[XXpx] translate-y-[XXpx] selon ton besoin -->
        <div class="transform translate-x-[0px] translate-y-[20px] mb-6 inline-block">
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

        <div class="mt-4">
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
    <section ref="plansSection" class="py-20 px-6 bg-gray-50">
      <div class="max-w-5xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">Nos offres</h2>
        <p class="text-gray-600 mb-12">
          Choisissez le plan adapté à votre activité
        </p>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- FREE -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <h3 class="text-2xl font-bold mb-2">Gratuit</h3>
            <p class="text-4xl font-bold mb-1">0€</p>
            <p class="text-gray-500 mb-6">/mois</p>
            <ul class="text-left space-y-2 mb-8 text-gray-700">
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

          <!-- PRO -->
          <div class="bg-white rounded-2xl shadow-lg p-8 border-2 border-purple-500">
            <h3 class="text-2xl font-bold mb-2">Pro</h3>
            <p class="text-4xl font-bold mb-1">10€</p>
            <p class="text-gray-500 mb-6">/mois</p>
            <ul class="text-left space-y-2 mb-8 text-gray-700">
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

    <!-- ✅ 2) FOOTER : 1 colonne x 4 lignes -->
    <footer class="bg-gray-900 text-white py-10 px-6">
      <div class="max-w-md mx-auto flex flex-col gap-3 text-center">
        <router-link to="/privacy-policy" class="hover:text-blue-400 transition">
          Privacy Policy
        </router-link>
        <router-link to="/remboursement" class="hover:text-blue-400 transition">
          Remboursement
        </router-link>
        <router-link to="/confidentialite" class="hover:text-blue-400 transition">
          Confidentialité
        </router-link>
        <router-link to="/mentions" class="hover:text-blue-400 transition">
          Mentions légales
        </router-link>
        <router-link to="/conditions" class="hover:text-blue-400 transition">
          Conditions
        </router-link>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const plansSection = ref(null);

function goToLogin() {
  router.push("/auth?mode=login");
}

function scrollToPlans() {
  plansSection.value?.scrollIntoView({ behavior: "smooth" });
}

function selectPlan(plan) {
  localStorage.setItem("selectedPlan", plan);
  router.push("/auth?mode=signup");
}
</script>
