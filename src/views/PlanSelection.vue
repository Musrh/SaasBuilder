<!-- ============================================================
  PlanSelection.vue — Sassbuilder
  Page d'accueil avec sélection de plan
  → Redirige vers /auth?plan=xxx
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
      <div class="relative z-10 px-6 max-w-2xl mx-auto">
        <h1 class="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
          Créez votre boutique en ligne
        </h1>
        <p class="text-lg text-blue-100 mb-2">
          Plateforme complète : builder + paiements + commandes
        </p>
        <p class="text-2xl text-white font-bold mb-8">
          À partir de <span class="text-yellow-300">5€ / mois</span>
        </p>
        <button @click="scrollToPlans" class="bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg transition-all hover:scale-105">
          Voir les offres ↓
        </button>
      </div>
    </section>

    <!-- PLANS -->
    <section ref="plansRef" class="py-20 bg-gray-50 text-center">
      <h2 class="text-3xl font-bold text-gray-800 mb-2">Nos offres</h2>
      <p class="text-gray-500 mb-12">Choisissez le plan adapté à votre activité</p>

      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">

        <!-- FREE -->
        <div class="bg-white rounded-2xl shadow-md p-8 flex flex-col">
          <div class="text-gray-400 font-bold text-sm uppercase tracking-widest mb-3">Gratuit</div>
          <div class="text-5xl font-black text-gray-800 mb-1">0€</div>
          <div class="text-gray-400 text-sm mb-6">/mois</div>
          <ul class="text-gray-600 mb-8 space-y-3 text-left flex-1">
            <li class="flex items-center gap-2"><span class="text-green-500">✓</span> 1 page</li>
            <li class="flex items-center gap-2"><span class="text-green-500">✓</span> Builder visuel</li>
            <li class="flex items-center gap-2"><span class="text-green-500">✓</span> Hébergement GitHub Pages</li>
            <li class="flex items-center gap-2 text-gray-300"><span>✗</span> Paiements clients</li>
            <li class="flex items-center gap-2 text-gray-300"><span>✗</span> Gestion commandes</li>
          </ul>
          <button @click="selectPlan('free')" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition">
            Commencer gratuitement
          </button>
        </div>

        <!-- PRO -->
        <div class="bg-white rounded-2xl shadow-xl border-2 border-blue-500 p-8 flex flex-col relative transform scale-105">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
            Populaire
          </div>
          <div class="text-blue-500 font-bold text-sm uppercase tracking-widest mb-3">Pro</div>
          <div class="text-5xl font-black text-gray-800 mb-1">5€</div>
          <div class="text-gray-400 text-sm mb-6">/mois</div>
          <ul class="text-gray-600 mb-8 space-y-3 text-left flex-1">
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Pages illimitées</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Toutes les sections</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Catalogue produits</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Paiement Stripe & PayPal</li>
            <li class="flex items-center gap-2"><span class="text-blue-500">✓</span> Gestion commandes</li>
          </ul>
          <button @click="selectPlan('pro')" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition">
            Choisir Pro
          </button>
        </div>

        <!-- PREMIUM -->
        <div class="bg-white rounded-2xl shadow-md p-8 flex flex-col">
          <div class="text-purple-500 font-bold text-sm uppercase tracking-widest mb-3">Premium</div>
          <div class="text-5xl font-black text-gray-800 mb-1">10€</div>
          <div class="text-gray-400 text-sm mb-6">/mois</div>
          <ul class="text-gray-600 mb-8 space-y-3 text-left flex-1">
            <li class="flex items-center gap-2"><span class="text-purple-500">✓</span> Tout le plan Pro</li>
            <li class="flex items-center gap-2"><span class="text-purple-500">✓</span> Multi-stores</li>
            <li class="flex items-center gap-2"><span class="text-purple-500">✓</span> Analytics avancés</li>
            <li class="flex items-center gap-2"><span class="text-purple-500">✓</span> Domaine personnalisé</li>
            <li class="flex items-center gap-2"><span class="text-purple-500">✓</span> Support prioritaire</li>
          </ul>
          <button @click="selectPlan('premium')" class="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-semibold transition">
            Choisir Premium
          </button>
        </div>

      </div>
    </section>

    <!-- FEATURES -->
    <section class="py-20 bg-white text-center">
      <h2 class="text-3xl font-bold text-gray-800 mb-12">Tout ce dont vous avez besoin</h2>
      <div class="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto px-4">
        <div v-for="f in features" :key="f.icon" class="flex flex-col items-center gap-3">
          <div class="text-4xl">{{ f.icon }}</div>
          <div class="font-bold text-gray-800">{{ f.title }}</div>
          <div class="text-sm text-gray-500">{{ f.desc }}</div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router   = useRouter()
const plansRef = ref(null)

const features = [
  { icon: "🏗️", title: "Builder visuel", desc: "Glissez-déposez vos sections sans code" },
  { icon: "💳", title: "Paiements intégrés", desc: "Stripe & PayPal prêts à l'emploi" },
  { icon: "📦", title: "Gestion commandes", desc: "Suivez chaque vente en temps réel" },
  { icon: "🌐", title: "Publiez en 1 clic", desc: "Votre site en ligne immédiatement" },
]

const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan)
  router.push(`/auth?plan=${plan}`)
}

const scrollToPlans = () => {
  plansRef.value?.scrollIntoView({ behavior: "smooth" })
}
</script>
