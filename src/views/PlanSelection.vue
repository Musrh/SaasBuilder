<!-- ============================================================
  PlanSelection.vue — SaaS FLOW CLEAN
============================================================ -->
<template>
  <div class="w-full">

    <!-- HERO -->
    <section class="relative h-[80vh] flex items-center justify-center text-center overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80"
        class="absolute inset-0 w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-purple-900/70"></div>

      <div class="relative z-10 px-6 max-w-2xl mx-auto text-white">
        <h1 class="text-4xl font-bold mb-4">
          Créez votre boutique en ligne
        </h1>

        <p class="mb-2">Plateforme SaaS complète</p>
        <p class="text-xl font-bold mb-6">À partir de 5€ / mois</p>

        <button
          @click="scrollToPlans"
          class="bg-blue-500 px-6 py-3 rounded-xl"
        >
          Voir les offres
        </button>
      </div>
    </section>

    <!-- PLANS -->
    <section ref="plansRef" class="py-20 text-center bg-gray-50">

      <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

        <!-- FREE -->
        <div class="bg-white p-6 rounded-xl">
          <h3>Free</h3>
          <p>0€</p>
          <button class="bg-gray-200 px-4 py-2 mt-4">
            Commencer
          </button>
        </div>

        <!-- PRO -->
        <div class="bg-white p-6 rounded-xl border-2 border-blue-500">
          <h3>Pro</h3>
          <p>5€</p>

          <button
            @click="selectPlan('pro')"
            class="bg-blue-500 text-white px-4 py-2 mt-4"
          >
            Choisir Pro
          </button>
        </div>

        <!-- PREMIUM -->
        <div class="bg-white p-6 rounded-xl">
          <h3>Premium</h3>
          <p>10€</p>

          <button
            @click="selectPlan('premium')"
            class="bg-purple-500 text-white px-4 py-2 mt-4"
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

const selectPlan = (plan) => {
  // 👉 on va à AUTH (PAS Stripe ici)
  router.push({
    path: "/auth",
    query: { plan }
  })
}

const scrollToPlans = () => {
  plansRef.value?.scrollIntoView({ behavior: "smooth" })
}
</script>
