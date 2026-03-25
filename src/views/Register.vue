<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="bg-white p-6 rounded shadow w-96">
      <h2 class="text-xl font-bold mb-4 text-center">Inscription</h2>

      <input v-model="username" type="text" placeholder="Nom utilisateur" class="w-full p-2 mb-3 border rounded"/>
      <input v-model="email" type="email" placeholder="Email" class="w-full p-2 mb-3 border rounded"/>
      <input v-model="password" type="password" placeholder="Mot de passe" class="w-full p-2 mb-3 border rounded"/>

      <button @click="register" class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">S'inscrire</button>
      <p class="text-red-500 mt-2">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { auth, db } from "../firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const username = ref("")
const email = ref("")
const password = ref("")
const error = ref("")

const register = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
    const user = userCredential.user

    // Plan choisi dans PlanSelection
    const chosenPlan = route.query.plan || "free"

    await setDoc(doc(db, "users", user.uid), {
      username: username.value,
      email: email.value,
      createdAt: new Date(),
      plan: chosenPlan,
      sections: []
    })

    alert("Compte créé avec succès 🎉")
    router.push({ name: "Dashboard" })

  } catch (err) {
    error.value = err.message
  }
}
</script>
