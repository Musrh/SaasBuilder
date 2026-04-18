<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] px-4">

    <!-- CARD -->
    <div class="w-full max-w-md rounded-3xl p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl text-white">

      <!-- EMOJI / TITLE -->
      <div class="text-center mb-6">
        <div class="text-5xl mb-2">👋</div>
        <h2 class="text-2xl font-semibold">
          Connexion / Inscription
        </h2>
        <p class="text-sm text-gray-300 mt-2">
          Accédez à votre espace SaaS
        </p>
      </div>

      <!-- PLAN -->
      <div class="bg-white/10 border border-white/10 rounded-xl p-3 mb-6 text-center">
        <p class="text-xs text-gray-300">Plan choisi</p>
        <p class="text-lg font-bold capitalize text-purple-400">
          {{ selectedPlan }}
        </p>
      </div>

      <!-- EMAIL -->
      <div class="mb-4">
        <input
          v-model="email"
          type="email"
          placeholder="votre@email.com"
          class="w-full p-3 rounded-xl bg-white/10 border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <!-- PASSWORD -->
      <div class="mb-2">
        <input
          v-model="password"
          type="password"
          placeholder="••••••••"
          class="w-full p-3 rounded-xl bg-white/10 border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <!-- ERROR -->
      <p v-if="errorMsg" class="text-red-400 text-sm mb-3 text-center">
        {{ errorMsg }}
      </p>

      <!-- LOADING -->
      <p v-if="loading" class="text-purple-400 text-sm mb-3 text-center">
        Chargement...
      </p>

      <!-- LOGIN -->
      <button
        @click="login"
        :disabled="loading"
        class="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-3 rounded-xl font-semibold mb-3 hover:opacity-90 transition disabled:opacity-50"
      >
        🔑 Se connecter
      </button>

      <!-- REGISTER -->
      <button
        @click="register"
        :disabled="loading"
        class="w-full bg-white/10 py-3 rounded-xl font-semibold hover:bg-white/20 transition disabled:opacity-50"
      >
        S'inscrire
      </button>

      <!-- RETOUR -->
      <button
        @click="goToPlans"
        class="mt-4 w-full text-sm text-gray-400 hover:text-white transition"
      >
        ← Retour au choix du plan
      </button>

    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"

import { db, auth } from "../firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth"

const route = useRoute()
const router = useRouter()

// STATE
const email = ref("")
const password = ref("")
const selectedPlan = ref("free")
const loading = ref(false)
const errorMsg = ref("")

const API_URL = "https://backendfinal-production-afd2.up.railway.app"

// LOAD PLAN
onMounted(() => {
  selectedPlan.value =
    route.query.plan ||
    localStorage.getItem("planChoisi") ||
    "free"

  auth.onAuthStateChanged((user) => {
    if (user) router.push("/dashboard")
  })
})

// LOGIN
const login = async () => {
  errorMsg.value = ""
  loading.value = true
  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    const user = cred.user

    localStorage.setItem("user", JSON.stringify({
      uid: user.uid,
      email: user.email
    }))

    router.push("/dashboard")

  } catch (err) {
    errorMsg.value = "Erreur connexion : " + err.message
  } finally {
    loading.value = false
  }
}

// REGISTER
const register = async () => {
  errorMsg.value = ""
  loading.value = true
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    const user = cred.user
    const uid = user.uid

    const userData = {
      uid,
      email: user.email,
      role: "owner",
      ownerId: uid,
      storeId: uid,
      plan: selectedPlan.value,
      subscriptionActive: false,
      stripeAccountId: null,
      createdAt: serverTimestamp(),
      expiry: null
    }

    await setDoc(doc(db, "users", uid), userData)

    localStorage.setItem("user", JSON.stringify({
      uid,
      email: user.email,
      plan: selectedPlan.value
    }))

    if (selectedPlan.value === "pro" || selectedPlan.value === "basic") {
      const res = await fetch(`${API_URL}/create-billing-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          plan: selectedPlan.value,
          ownerUid: uid
        })
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
        return
      } else {
        errorMsg.value = "Erreur paiement : impossible de créer la session Stripe."
      }
    }

    router.push("/dashboard")

  } catch (err) {
    errorMsg.value = "Erreur inscription : " + err.message
  } finally {
    loading.value = false
  }
}

// ✅ FIX : fonction bien placée
const goToPlans = () => {
  router.push("/")
}
</script>
