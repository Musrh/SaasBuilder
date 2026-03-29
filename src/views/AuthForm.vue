<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">

    <div class="w-full max-w-md bg-white shadow-lg rounded-xl p-6">

      <h2 class="text-2xl font-bold text-center text-blue-500 mb-6">
        Connexion
      </h2>

      <!-- EMAIL -->
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border p-3 rounded mb-3"
      />

      <!-- PASSWORD -->
      <input
        v-model="password"
        type="password"
        placeholder="Mot de passe"
        class="w-full border p-3 rounded mb-4"
      />

      <!-- BUTTON -->
      <button
        @click="login"
        class="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600"
      >
        Se connecter
      </button>

      <p class="text-center text-sm mt-4 text-gray-500">
        Pas de compte ? Créer un compte
      </p>

    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"

import {
  signInWithEmailAndPassword
} from "firebase/auth"

import {
  doc,
  getDoc
} from "firebase/firestore"

const router = useRouter()

const email = ref("")
const password = ref("")

/* 🔥 LOGIN SAAS CORRIGÉ */
const login = async () => {
  try {

    // ================= AUTH FIREBASE =================
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    const user = userCredential.user

    // ================= FIRESTORE USER =================
    const userRef = doc(db, "users", user.uid)
    const userSnap = await getDoc(userRef)

    let userData = {
      plan: "free"
    }

    if (userSnap.exists()) {
      userData = userSnap.data()
    }

    // ================= PLAN RÉEL =================
    const plan = userData.plan || "free"

    // ================= SAVE LOCAL =================
    localStorage.setItem("userPlan", plan)
    localStorage.setItem("userEmail", user.email)
    localStorage.setItem("userId", user.uid)

    // ================= 🔥 IMPORTANT FIX BUG PANIER =================
    // ❌ NE PLUS JAMAIS REDIRIGER ICI VERS /panier

    // ================= REDIRECTION SAAS =================
    if (plan === "free") {
      router.push("/dashboard?plan=free")
      return
    }

    if (plan === "pro") {
      router.push("/dashboard?plan=pro")
      return
    }

    if (plan === "premium") {
      router.push("/dashboard?plan=premium")
      return
    }

    // fallback
    router.push("/dashboard")

  } catch (error) {
    console.error(error)
    alert("Erreur de connexion")
  }
}
</script>
