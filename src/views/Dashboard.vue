<!-- ============================================================
  Dashboard.vue — Sassbuilder (FINAL VERSION)
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

        <!-- CARDS -->
        <div class="grid md:grid-cols-3 gap-6 mb-8">

          <!-- PLAN -->
          <div class="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <p class="text-gray-400 text-sm uppercase mb-2">Plan actif</p>
            <p class="text-2xl font-bold capitalize" :class="planColor">
              {{ userData?.plan || 'free' }}
            </p>
          </div>

          <!-- PAIEMENT -->
          <div class="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <p class="text-gray-400 text-sm uppercase mb-2">Paiement</p>
            <p class="text-2xl font-bold">
              {{ userData?.paye ? '✓ Actif' : '✗ Non payé' }}
            </p>
          </div>

          <!-- STRIPE CONNECT -->
          <div class="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <p class="text-gray-400 text-sm uppercase mb-2">Stripe Connect</p>

            <p v-if="userData?.stripeAccountId" class="text-green-400 font-bold">
              ✓ Connecté
            </p>

            <p v-else class="text-yellow-400 font-bold">
              ⚠ Non connecté
            </p>

<button
  v-if="!userData?.stripeAccountId"
  @click="connectStripe"
  :disabled="(userData?.plan || '').toLowerCase() === 'free'"
  class="mt-3 px-4 py-2 rounded-lg text-white transition"
  :class="(userData?.plan || '').toLowerCase() === 'free'
    ? 'bg-gray-600 cursor-not-allowed opacity-50'
    : 'bg-blue-500 hover:bg-blue-600'"
>
  {{ (userData?.plan || '').toLowerCase() === 'free'
    ? 'Plan Pro requis'
    : 'Connecter Stripe'
  }}
</button>
            
          </div>

        </div>

        <!-- BUILDER -->
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center">

          <h2 class="text-2xl font-bold mb-2">🏗️ Builder de site</h2>

          <button
            @click="goToBuilder"
            class="bg-white text-blue-600 font-bold px-10 py-4 rounded-xl"
          >
            Accéder au Builder →
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

// =========================
// BACKEND FINAL
// =========================
const BACKEND = "https://backendfinal-production-afd2.up.railway.app"

const router = useRouter()
const user = ref(null)
const userData = ref(null)
const loading = ref(true)

// =========================
// LOAD USER
// =========================
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

// =========================
// STRIPE CONNECT (SECURE)
// =========================
const connectStripe = async () => {

  // 🚫 Bloque plan FREE
  if (userData.value?.plan === "free") {
    alert("Passez au plan Pro pour connecter Stripe")
    return
  }

  try {
    if (!user.value?.uid || !user.value?.email) {
      alert("Utilisateur non chargé")
      return
    }

    const res = await fetch(`${BACKEND}/create-connect-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerUid: user.value.uid,
        email: user.value.email
      })
    })

    const data = await res.json()

    console.log("Stripe Connect response:", data)

    if (!res.ok || !data.url) {
      alert(data.error || "Erreur Stripe Connect")
      return
    }

    window.location.href = data.url

  } catch (err) {
    console.error("Stripe connect error:", err)
    alert("Erreur connexion Stripe")
  }
}

// =========================
// UI HELPERS
// =========================
const planColor = computed(() => ({
  "text-gray-400": userData.value?.plan === "free",
  "text-blue-400": userData.value?.plan === "pro",
  "text-purple-400": userData.value?.plan === "premium",
}))

// =========================
// NAVIGATION
// =========================
const goToBuilder = () => {
  window.location.href = "https://musrh.github.io/SaaasGenerator/#/"
}

const logout = async () => {
  await signOut(auth)
  localStorage.removeItem("planChoisi")
  router.push("/")
}
</script>
