<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">

    <div class="w-full max-w-md bg-white shadow-lg rounded-xl p-6">

      <!-- TITLE -->
      <h2 class="text-2xl font-bold text-center text-blue-500 mb-6">
        {{ isLogin ? "Connexion" : "Créer un compte" }}
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
        @click="handleSubmit"
        class="w-full text-white py-3 rounded font-semibold transition"
        :class="isLogin ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'"
      >
        {{ isLogin ? "Se connecter" : "Créer un compte" }}
      </button>

      <!-- SWITCH -->
      <p class="text-center text-sm mt-4 text-gray-500">
        {{ isLogin ? "Pas de compte ?" : "Déjà un compte ?" }}

        <span
          @click="toggleMode"
          class="text-blue-500 cursor-pointer font-semibold ml-1"
        >
          {{ isLogin ? "Créer un compte" : "Se connecter" }}
        </span>
      </p>

    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth"

import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore"

const router = useRouter()

const email = ref("")
const password = ref("")
const isLogin = ref(true)

/* SWITCH */
const toggleMode = () => {
  isLogin.value = !isLogin.value
}

/* SUBMIT */
const handleSubmit = async () => {
  try {

    if (!email.value || !password.value) {
      alert("Remplis les champs")
      return
    }

    const selectedPlan = localStorage.getItem("planChoisi") || "free"

    // ================= LOGIN =================
    if (isLogin.value) {

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )

      const user = userCredential.user

      const snap = await getDoc(doc(db, "users", user.uid))

      let userData = { plan: "free" }

      if (snap.exists()) {
        userData = snap.data()
      }

      const plan = userData.plan || "free"

      localStorage.setItem("userPlan", plan)
      localStorage.setItem("userEmail", user.email)
      localStorage.setItem("userId", user.uid)

      router.push("/dashboard")
    }

    // ================= REGISTER =================
    else {

      const cred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )

      await setDoc(doc(db, "users", cred.user.uid), {
        email: email.value,
        plan: selectedPlan,
        createdAt: Date.now(),
        expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        sections: []
      })

      localStorage.setItem("userPlan", selectedPlan)

      router.push("/dashboard")
    }

  } catch (error) {
    console.error(error)
    alert(error.message)
  }
}
</script>
