<template>
  <div class="p-6">

    <h1 class="text-2xl font-bold mb-6">
      Dashboard Store
    </h1>

    <!-- ===================== -->
    <!-- 🔐 STATUS ABONNEMENT -->
    <!-- ===================== -->
    <div class="p-4 bg-gray-100 rounded-xl mb-6">
      <p class="font-semibold">Statut abonnement :</p>

      <p v-if="!subscriptionActive" class="text-red-500">
        ❌ Aucun abonnement actif
      </p>

      <p v-else class="text-green-600">
        ✅ Plan actif : {{ plan }}
      </p>
    </div>

    <!-- ===================== -->
    <!-- 💳 STRIPE CONNECT -->
    <!-- ===================== -->
    <div class="p-4 bg-blue-50 rounded-xl mb-6">

      <p class="font-semibold mb-2">
        Connexion Stripe (recevoir paiements)
      </p>

      <p v-if="!stripeConnected" class="text-red-500 mb-3">
        ❌ Compte Stripe non connecté
      </p>

      <p v-else class="text-green-600 mb-3">
        ✅ Stripe connecté
      </p>

      <button
        v-if="!stripeConnected"
        @click="connectStripe"
        class="bg-blue-500 text-white px-4 py-2 rounded-lg"
      >
        💳 Connecter Stripe
      </button>
    </div>

    <!-- ===================== -->
    <!-- 🚀 STORE STATUS -->
    <!-- ===================== -->
    <div class="p-4 bg-green-50 rounded-xl">

      <p class="font-semibold">
        Store status
      </p>

      <p v-if="canSell" class="text-green-600">
        🚀 Ton store est actif et peut recevoir des paiements
      </p>

      <p v-else class="text-gray-500">
        🔒 Active ton abonnement + Stripe pour commencer
      </p>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

// =========================
// STATE
// =========================
const subscriptionActive = ref(false)
const stripeConnected = ref(false)
const plan = ref("")

const user = JSON.parse(localStorage.getItem("user"))

// =========================
// CHECK FIRESTORE (SIMPLIFIÉ)
// =========================
const loadStatus = async () => {
  const res = await fetch(`https://ton-backend.com/user-status/${user.uid}`)
  const data = await res.json()

  subscriptionActive.value = data.subscriptionActive
  stripeConnected.value = !!data.stripeAccountId
  plan.value = data.plan
}

// =========================
// CONNECT STRIPE
// =========================
const connectStripe = async () => {
  const res = await fetch("https://ton-backend.com/create-connect-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ownerUid: user.uid,
      email: user.email
    })
  })

  const data = await res.json()

  // 🔥 redirection Stripe onboarding
  window.location.href = data.url
}

// =========================
const canSell = computed(() => {
  return subscriptionActive.value && stripeConnected.value
})

onMounted(loadStatus)
</script>
