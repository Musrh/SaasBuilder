<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="bg-white p-6 rounded shadow w-96">
      <h2 class="text-xl font-bold mb-4 text-center">Connexion</h2>

      <input v-model="email" type="email" placeholder="Email" class="w-full p-2 mb-3 border rounded"/>
      <input v-model="password" type="password" placeholder="Mot de passe" class="w-full p-2 mb-3 border rounded"/>

      <button @click="login" class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Se connecter</button>
      <p class="text-red-500 mt-2">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { auth } from "../firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useRouter } from "vue-router"

const router = useRouter()
const email = ref("")
const password = ref("")
const error = ref("")

const login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push({ name: "Dashboard" })
  } catch (err) {
    error.value = err.message
  }
}
</script>
