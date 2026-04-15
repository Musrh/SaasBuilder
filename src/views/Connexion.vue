<!-- ============================================================
  Connexion.vue — Login utilisateur existant
============================================================ -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

      <!-- TITLE -->
      <h2 class="text-2xl font-bold mb-6 text-center">
        Connexion à votre compte
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

      <!-- 🔙 RETOUR -->
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
import { ref } from "vue"
import { useRouter } from "vue-router"
import { auth } from "../firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

const router = useRouter()

// =====================
// STATE (✅ CORRIGÉ)
// =====================
const email = ref("")
const password = ref("")
const loading = ref(false)
const errorMsg = ref("")

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

    // ✅ MESSAGE PROPRE
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
// RETOUR PLAN
// =====================
const goToPlans = () => {
  router.push("/")
}
</script>
