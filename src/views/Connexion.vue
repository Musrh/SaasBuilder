<!-- ============================================================
  AuthForm.vue — Connexion / Inscription SaaS
============================================================ -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

      <!-- TITLE -->
      <h2 class="text-2xl font-bold mb-6 text-center">
        Connexion pour compte déjà existant 
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

      <!-- 🔙 RETOUR PLAN -->
      <button
        @click="goToPlans"
        class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition"
      >
        ← Retour vers choix du plan
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

// =====================
// STATE
// =====================
const email = ref("")
const password = ref("")
const selectedPlan = ref("free")
const loading = ref(false)
const errorMsg = ref("")]

// =====================
// BACKEND URL
// =====================
const API_URL = "https://backendfinal-production-afd2.up.railway.app"

// =====================
// LOAD PLAN
// =====================
onMounted(() => {
  selectedPlan.value =
    route.query.plan ||
    localStorage.getItem("planChoisi") ||
    "free"

  auth.onAuthStateChanged((user) => {
    if (user) {
      router.push("/dashboard")
    }
  })
})

// =====================
// 🔙 RETOUR PLAN
// =====================
const goToPlans = () => {
  router.push("/")
}

// =====================
// LOGIN
// =====================
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
    console.error(err)

    // 🔥 Message propre utilisateur
    if (err.code === "auth/invalid-credential") {
      errorMsg.value = "Vérifier votre email et mot de passe"
    } else {
      errorMsg.value = "Une erreur est survenue, réessayez"
    }

  } finally {
    loading.value = false
  }
}

// =====================
// REGISTER
// =====================
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

    // Stripe si plan payant
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
    console.error(err)
    errorMsg.value = "Erreur inscription : " + err.message
  } finally {
    loading.value = false
  }
}
</script>
