<!-- ============================================================
  AuthForm.vue — Connexion / Inscription SaaS
  FLOW : PlanSelection → AuthForm → Dashboard
============================================================ -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
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

      <!-- LOGIN -->
      <button
        @click="login"
        class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg mb-3"
      >
        Se connecter
      </button>

      <!-- REGISTER -->
      <button
        @click="register"
        class="w-full bg-gray-200 hover:bg-gray-300 py-3 rounded-lg"
      >
        S'inscrire
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

// =====================
// LOAD PLAN
// =====================

onMounted(() => {
  selectedPlan.value =
    route.query.plan ||
    localStorage.getItem("planChoisi") ||
    "free"

  // ❌ SUPPRIMÉ : plus de redirection auto si déjà connecté
  // L'utilisateur DOIT voir le formulaire et se connecter manuellement
})
// =====================
// LOGIN
// =====================
const login = async () => {
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

    // ✅ Redirige vers Dashboard après connexion
    router.push("/dashboard")

  } catch (err) {
    console.error(err)
    alert("Erreur connexion : " + err.message)
  }
}

// =====================
// REGISTER (OWNER SAAS)
// =====================
const register = async () => {
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

    // ✅ Redirige vers Dashboard après inscription
    router.push("/dashboard")

  } catch (err) {
    console.error(err)
    alert("Erreur inscription : " + err.message)
  }
}
</script>
