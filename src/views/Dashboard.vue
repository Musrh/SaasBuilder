<!-- ============================================================
  Dashboard.vue — Sassbuilder
============================================================ -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">

    <div class="max-w-4xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-10">
        <div>
          <h1 class="text-3xl font-bold">Mon espace Sassbuilder</h1>
          <p class="text-gray-400 mt-1">{{ user?.email }}</p>
        </div>

        <button
          @click="logout"
          class="text-sm text-gray-400 hover:text-white border border-gray-600 px-4 py-2 rounded-lg transition"
        >
          Déconnexion
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
      </div>

      <template v-else>

        <!-- PLAN EXPIRÉ -->
        <div
          v-if="planExpired && userData?.plan !== 'free'"
          class="bg-red-900/30 border border-red-500/50 rounded-2xl p-6 mb-6"
        >
          <h2 class="text-xl font-bold text-red-400 mb-2">⚠️ Plan expiré</h2>

          <p class="text-gray-300 mb-4">
            Votre plan <strong>{{ userData?.plan }}</strong> a expiré.
            Renouvelez pour continuer à utiliser le builder.
          </p>

          <button
            @click="renewPlan"
            class="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            Renouveler mon plan
          </button>
        </div>

        <!-- CARDS -->
        <div class="grid md:grid-cols-3 gap-6 mb-8">

          <!-- Plan actif -->
          <div class="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <p class="text-gray-400 text-sm uppercase tracking-wider mb-2">
              Plan actif
            </p>

            <p class="text-2xl font-bold capitalize" :class="planColor">
              {{ userData?.plan || 'free' }}
            </p>

            <p class="text-xs text-gray-500 mt-2">
              {{ planExpired ? '❌ Expiré' : `✓ Valide jusqu'au ${expiryFormatted}` }}
            </p>
          </div>

          <!-- Statut paiement -->
          <div class="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <p class="text-gray-400 text-sm uppercase tracking-wider mb-2">
              Paiement
            </p>

            <p
              class="text-2xl font-bold"
              :class="userData?.paye ? 'text-green-400' : 'text-red-400'"
            >
              {{ userData?.paye ? '✓ Actif' : '✗ Non payé' }}
            </p>

            <p class="text-xs text-gray-500 mt-2">
              {{ userData?.email }}
            </p>
          </div>

          <!-- Config paiement store -->
          <div class="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <p class="text-gray-400 text-sm uppercase tracking-wider mb-2">
              Paiements store
            </p>

            <p
              class="text-lg font-bold"
              :class="hasPaymentConfig ? 'text-green-400' : 'text-yellow-400'"
            >
              {{ hasPaymentConfig ? '✓ Configuré' : '⚠ À configurer' }}
            </p>

            <p class="text-xs text-gray-500 mt-2">
              Stripe & PayPal du store
            </p>
          </div>

        </div>

        <!-- BUILDER -->
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-6 text-center">

          <h2 class="text-2xl font-bold mb-2">
            🏗️ Builder de site
          </h2>

          <p class="text-blue-100 mb-6">
            Créez et gérez votre boutique en ligne
          </p>

          <button
            @click="goToBuilder"
            :disabled="!canAccessBuilder"
            class="bg-white text-blue-600 font-bold px-10 py-4 rounded-xl text-lg hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Accéder au Builder →
          </button>

          <p
            v-if="!canAccessBuilder"
            class="text-sm text-blue-200 mt-3"
          >
            Renouvelez votre plan pour accéder au builder
          </p>
        </div>

        <!-- ACTIONS -->
        <div class="grid md:grid-cols-2 gap-4">

          <!-- Commandes -->
          <button
            @click="goToOrders"
            class="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl p-6 text-left transition"
          >
            <div class="text-3xl mb-3">📦</div>

            <h3 class="font-bold text-lg">
              Commandes clients ↗
            </h3>

            <p class="text-gray-400 text-sm mt-1">
              Suivez les achats de vos clients
            </p>
          </button>

          <!-- Plans -->
          <button
            @click="goToPlans"
            class="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-2xl p-6 text-left transition"
          >
            <div class="text-3xl mb-3">⭐</div>

            <h3 class="font-bold text-lg">
              Changer de plan
            </h3>

            <p class="text-gray-400 text-sm mt-1">
              Passez à Pro ou Premium
            </p>
          </button>

        </div>

      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"

const router   = useRouter()
const user     = ref(null)
const userData = ref(null)
const loading  = ref(true)

// PLAN EXPIRÉ
const planExpired = computed(() => {
  if (!userData.value) return false
  if (userData.value.plan === "free") return false
  return (userData.value.expiry || 0) < Date.now()
})

// ACCÈS BUILDER
const canAccessBuilder = computed(() => {
  if (!userData.value) return false
  if (userData.value.plan === "free") return true
  return userData.value.paye && !planExpired.value
})

// FORMAT DATE
const expiryFormatted = computed(() => {
  if (!userData.value?.expiry) return "—"
  return new Date(userData.value.expiry).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })
})

// COULEUR PLAN
const planColor = computed(() => ({
  "text-gray-400":   userData.value?.plan === "free",
  "text-blue-400":   userData.value?.plan === "pro",
  "text-purple-400": userData.value?.plan === "premium",
}))

// CONFIG PAIEMENT
const hasPaymentConfig = computed(() => {
  const cfg = userData.value?.storePaymentConfig?.stripe
  return cfg && cfg.publishableKey && cfg.publishableKey.length > 5
})

// LOAD USER
onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) {
      router.push("/auth")
      return
    }

    user.value = u

    try {
      const snap = await getDoc(doc(db, "users", u.uid))
      if (snap.exists()) {
        userData.value = snap.data()
      }
    } catch (e) {
      console.error(e)
    }

    loading.value = false
  })
})

// ACTIONS
const goToBuilder = () => {
  window.location.href = "https://musrh.github.io/SaaasGenerator/#/"
}

// 🔥 OUVERTURE NOUVEL ONGLET
const goToOrders = () => {
  window.open(
    "https://musrh.github.io/SaaasGenerator/#/orders",
    "_blank"
  )
}

const goToPlans = () => {
  router.push("/")
}

const renewPlan = () => {
  const plan  = userData.value?.plan || "pro"
  const price = plan === "pro" ? 5 : 10

  router.push({
    path: "/panier",
    query: { plan, price }
  })
}

const logout = async () => {
  await signOut(auth)
  localStorage.removeItem("planChoisi")
  router.push("/")
}
</script>
