<!-- ============================================================
  Dashboard.vue — Sassbuilder (FIX POLLING + TIMEOUT + REALTIME)
============================================================ -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
    <div class="max-w-4xl mx-auto">

      <!-- ✅ BANNIÈRE SUCCÈS PAIEMENT -->
      <div
        v-if="paymentSuccess"
        class="mb-6 bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl px-6 py-4 flex items-center gap-3"
      >
        <span class="text-2xl">🎉</span>
        <div>
          <p class="font-bold">Paiement réussi ! Votre plan est maintenant <span class="uppercase">Pro</span>.</p>
          <p class="text-sm text-green-400 mt-0.5">Votre espace a été mis à jour.</p>
        </div>
      </div>

      <!-- ❌ TIMEOUT WEBHOOK -->
      <div
        v-if="pollingFailed"
        class="mb-6 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-xl px-6 py-4"
      >
        <p class="font-bold">⏱ Confirmation en attente…</p>
        <p class="text-sm mt-1">Votre paiement a été reçu par Stripe mais notre serveur n'a pas encore mis à jour votre compte.</p>
        <p class="text-sm mt-2">
          Attendez 1-2 minutes puis
          <button @click="forceReload" class="underline font-bold hover:text-yellow-100">rechargez la page</button>.
        </p>
        <p class="text-xs text-yellow-500 mt-2">
          Si le problème persiste, vérifiez que le webhook Stripe pointe bien vers :<br/>
          <code class="bg-black/30 px-1 rounded">https://backendfinal-production-afd2.up.railway.app/webhook</code>
        </p>
      </div>

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

      <!-- Loading initial -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
      </div>

      <!-- ⏳ EN ATTENTE WEBHOOK STRIPE -->
      <div v-else-if="waitingForStripe" class="flex flex-col items-center py-20 gap-4">
        <div class="w-10 h-10 border-4 border-gray-600 border-t-green-400 rounded-full animate-spin"></div>
        <p class="text-gray-300 text-lg font-medium">Confirmation du paiement en cours…</p>
        <p class="text-gray-500 text-sm">Cela peut prendre quelques secondes.</p>
        <div class="flex gap-1 mt-2">
          <span
            v-for="i in 20"
            :key="i"
            class="w-2 h-2 rounded-full transition-all duration-300"
            :class="i <= pollingAttempts ? 'bg-green-400' : 'bg-gray-700'"
          ></span>
        </div>
        <p class="text-gray-600 text-xs">{{ pollingAttempts }}/20</p>
      </div>

      <!-- CONTENT -->
      <div v-else>

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
            <p class="text-2xl font-bold" :class="userData?.paye ? 'text-green-400' : 'text-red-400'">
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
              :disabled="isFree"
              class="mt-3 px-4 py-2 rounded-lg text-white transition"
              :class="isFree
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-blue-500 hover:bg-blue-600'"
            >
              {{ isFree ? 'Plan Pro requis' : 'Connecter Stripe' }}
            </button>
          </div>

        </div>

        <!-- UPGRADE -->
        <div v-if="isFree" class="mb-8 text-center">
          <button
            @click="upgradeToPro"
            :disabled="upgrading"
            class="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-bold text-lg inline-flex items-center gap-2"
          >
            <span v-if="upgrading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            🚀 Passer au plan Pro
          </button>
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

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { auth, db } from "../firebase"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { signOut } from "firebase/auth"

const BACKEND = "https://backendfinal-production-afd2.up.railway.app"

const router = useRouter()
const route = useRoute()

const user = ref(null)
const userData = ref(null)
const loading = ref(true)
const upgrading = ref(false)
const paymentSuccess = ref(false)
const waitingForStripe = ref(false)
const pollingFailed = ref(false)
const pollingAttempts = ref(0)

let pollingInterval = null
let unsubscribeSnapshot = null

// ===============================================================
// 🔄 CHARGER LES DONNÉES USER (one-shot)
// ===============================================================
const fetchUserData = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid))
    if (snap.exists()) {
      userData.value = snap.data()
      return snap.data()
    }
  } catch (e) {
    console.error("Erreur fetchUserData:", e)
  }
  return null
}

// ===============================================================
// 📡 ÉCOUTE TEMPS RÉEL (onSnapshot)
// ===============================================================
const startRealtimeListener = (uid) => {
  unsubscribeSnapshot = onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) return
    const data = snap.data()
    userData.value = data

    const isPro = (data?.plan || "").toLowerCase() !== "free"
    const isPaid = data?.paye === true

    if (isPro && isPaid && waitingForStripe.value) {
      stopPolling()
      waitingForStripe.value = false
      paymentSuccess.value = true
      router.replace({ path: route.path })
    }
  })
}

// ===============================================================
// ⏳ POLLING FALLBACK
// ===============================================================
const startPolling = (uid) => {
  waitingForStripe.value = true
  pollingAttempts.value = 0

  // Temps réel en priorité
  startRealtimeListener(uid)

  // Polling toutes les 3s en parallèle
  pollingInterval = setInterval(async () => {
    pollingAttempts.value++
    const data = await fetchUserData(uid)

    const isPro = (data?.plan || "").toLowerCase() !== "free"
    const isPaid = data?.paye === true

    if (isPro && isPaid) {
      stopPolling()
      waitingForStripe.value = false
      paymentSuccess.value = true
      router.replace({ path: route.path })
      return
    }

    if (pollingAttempts.value >= 20) {
      stopPolling()
      waitingForStripe.value = false
      pollingFailed.value = true
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null }
  if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null }
}

const forceReload = () => window.location.reload()

// ===============================================================
// 🚀 MOUNT
// ===============================================================
onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) {
      router.push("/auth")
      return
    }

    user.value = u
    const data = await fetchUserData(u.uid)
    loading.value = false

    // Retour depuis Stripe ?success=true
    if (route.query.success === "true") {
      const alreadyPro = (data?.plan || "").toLowerCase() !== "free"

      if (alreadyPro && data?.paye) {
        // Webhook déjà traité
        paymentSuccess.value = true
        router.replace({ path: route.path })
      } else {
        // Webhook pas encore arrivé
        startPolling(u.uid)
      }
    }
  })
})

onUnmounted(() => stopPolling())

// ===============================================================
// COMPUTED
// ===============================================================
const isFree = computed(() =>
  (userData.value?.plan || "").toLowerCase() === "free"
)

const planColor = computed(() => ({
  "text-gray-400": userData.value?.plan === "free",
  "text-blue-400": userData.value?.plan === "pro",
  "text-purple-400": userData.value?.plan === "premium",
}))

// ===============================================================
// 💰 UPGRADE TO PRO
// ===============================================================
const upgradeToPro = async () => {
  upgrading.value = true
  try {
    const res = await fetch(`${BACKEND}/create-billing-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerUid: user.value.uid,
        email: user.value.email,
        plan: "pro"
      })
    })

    const data = await res.json()

    if (!res.ok || !data.url) {
      alert(data.error || "Erreur paiement")
      upgrading.value = false
      return
    }

    window.location.href = data.url

  } catch (err) {
    console.error(err)
    alert("Erreur checkout")
    upgrading.value = false
  }
}

// ===============================================================
// 🔗 STRIPE CONNECT
// ===============================================================
const connectStripe = async () => {
  if (isFree.value) { alert("Passez au plan Pro"); return }

  try {
    const res = await fetch(`${BACKEND}/create-connect-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUid: user.value.uid, email: user.value.email })
    })

    const data = await res.json()
    if (!res.ok || !data.url) { alert("Erreur Stripe"); return }
    window.location.href = data.url

  } catch (err) { console.error(err) }
}

// ===============================================================
// NAV
// ===============================================================
const goToBuilder = () => {
  window.location.href = "https://musrh.github.io/SaaasGenerator/#/"
}

const logout = async () => {
  await signOut(auth)
  router.push("/")
}
</script>
