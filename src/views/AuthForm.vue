<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">

    <!-- CARD -->
    <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

      <!-- PLAN CHOISI -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
        <p class="text-sm text-gray-500">Vous avez choisi</p>
        <p class="text-2xl font-bold text-blue-600 capitalize">
          {{ selectedPlan }}
        </p>
      </div>

      <!-- TITLE -->
      <h2 class="text-2xl font-bold mb-6 text-center">
        Connexion / Inscription
      </h2>

      <!-- EMAIL -->
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border p-3 rounded-lg mb-4"
      />

      <!-- PASSWORD -->
      <input
        v-model="password"
        type="password"
        placeholder="Mot de passe"
        class="w-full border p-3 rounded-lg mb-6"
      />

      <!-- ERROR -->
      <p v-if="errorMsg" class="text-red-500 text-sm mb-4 text-center">
        {{ errorMsg }}
      </p>

      <!-- LOADING -->
      <p v-if="loading" class="text-blue-500 text-sm mb-4 text-center">
        Chargement...
      </p>

      <!-- LOGIN -->
      <button
        @click="login"
        :disabled="loading"
        class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg mb-3 disabled:opacity-50"
      >
        Se connecter
      </button>

      <!-- REGISTER -->
      <button
        @click="register"
        :disabled="loading"
        class="w-full bg-gray-200 hover:bg-gray-300 py-3 rounded-lg disabled:opacity-50"
      >
        S'inscrire
      </button>

    </div>

    <!-- 🔙 RETOUR -->
    <button
      @click="goToPlans"
      class="mt-4 w-full max-w-md bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition"
    >
      ← Retour vers choix du plan
    </button>

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
