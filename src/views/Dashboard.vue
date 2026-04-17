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
      <div v-if="loading" class="text-center text-gray-400 py-20">
        Chargement...
      </div>

      <!-- Content -->
      <div v-else class="space-y-8">

        <!-- Plan -->
        <div class="bg-gray-800 rounded-2xl p-6">
          <h2 class="text-lg font-semibold mb-2">Mon plan</h2>
          <p :class="planColor" class="text-xl font-bold capitalize">
            {{ userData?.plan || 'free' }}
          </p>
        </div>

        <!-- Stripe / Upgrade -->
        <div class="bg-gray-800 rounded-2xl p-6">
          <h2 class="text-lg font-semibold mb-2">Paiements</h2>

          <!-- Bouton Upgrade Pro (visible seulement si free) -->
          <button
            v-if="userData?.plan === 'free'"
            @click="upgradeToPro"
            class="mt-3 px-5 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition"
          >
            Change Pro
          </button>

          <!-- Bouton Stripe Connect (visible seulement si PRO) -->
          <button
            v-if="userData?.plan !== 'free'"
            @click="connectStripe"
            class="mt-3 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition"
          >
            Connecter Stripe
          </button>

          <!-- Message info -->
          <p v-if="userData?.plan === 'free'" class="text-gray-400 text-sm mt-2">
            Passez au plan Pro pour activer Stripe et recevoir des paiements.
          </p>
        </div>

        <!-- Builder -->
        <div class="bg-gray-800 rounded-2xl p-6 text-center">
          <h2 class="text-lg font-semibold mb-4">🏗️ Builder de site</h2>

          <button
            @click="goToBuilder"
            class="bg-white text-blue-600 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition"
          >
            Accéder au Builder →
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"

const BACKEND = "https://backendfinal-production-afd2.up.railway.app"

const router = useRouter()
const user = ref(null)
const userData = ref(null)
const loading = ref(true)

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) {
      router.push("/auth")
      return
    }

    user.value = u

    const snap = await getDoc(doc(db, "users", u.uid))
    if (snap.exists()) {
      userData.value = snap.data()
    }

    loading.value = false
  })
})

/* =========================
   STRIPE CONNECT
========================= */
const connectStripe = async () => {
  try {
    const res = await fetch(`${BACKEND}/create-connect-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerUid: user.value.uid,
        email: user.value.email
      })
    })

    const data = await res.json()

    if (!res.ok || !data.url) {
      alert(data.error || "Erreur Stripe Connect")
      return
    }

    window.location.href = data.url
  } catch (err) {
    console.error(err)
    alert("Erreur connexion Stripe")
  }
}

/* =========================
   UPGRADE PRO
========================= */
const upgradeToPro = async () => {
  try {
    const res = await fetch(`${BACKEND}/create-billing-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.value.email,
        plan: "pro",
        ownerUid: user.value.uid
      })
    })

    const data = await res.json()

    if (!res.ok || !data.url) {
      alert(data.error || "Erreur paiement")
      return
    }

    window.location.href = data.url
  } catch (err) {
    console.error(err)
    alert("Erreur upgrade Pro")
  }
}

/* =========================
   UI HELPERS
========================= */
const planColor = computed(() => ({
  "text-gray-400": userData.value?.plan === "free",
  "text-blue-400": userData.value?.plan === "pro",
  "text-purple-400": userData.value?.plan === "premium",
}))

const goToBuilder = () => {
  router.push("/Saasgenerator")
}
  
const logout = async () => {
  await signOut(auth)
  router.push("/")
}
</script>
