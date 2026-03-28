<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">

    <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">

      <h2 class="text-2xl font-bold text-center mb-6">
        {{ isLogin ? "Connexion" : "Inscription" }}
      </h2>

      <!-- EMAIL -->
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="input"
      />

      <!-- PASSWORD -->
      <input
        v-model="password"
        type="password"
        placeholder="Mot de passe"
        class="input"
      />

      <!-- BUTTON -->
      <button
        @click="handleAuth"
        class="w-full bg-blue-500 text-white py-2 rounded-lg mt-4 hover:bg-blue-600"
      >
        {{ isLogin ? "Se connecter" : "Créer un compte" }}
      </button>

      <!-- SWITCH -->
      <p class="text-center mt-4 text-sm">
        <span v-if="isLogin">
          Pas de compte ?
          <span @click="isLogin = false" class="text-blue-500 cursor-pointer">
            S'inscrire
          </span>
        </span>

        <span v-else>
          Déjà un compte ?
          <span @click="isLogin = true" class="text-blue-500 cursor-pointer">
            Se connecter
          </span>
        </span>
      </p>

      <!-- ERROR -->
      <p v-if="error" class="text-red-500 text-sm mt-3 text-center">
        {{ error }}
      </p>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"

/* STATE */
const email = ref("")
const password = ref("")
const isLogin = ref(true)
const error = ref("")

/* ROUTE PARAMS */
const route = useRoute()
const plan = ref(null)
const price = ref(null)

/* INIT */
onMounted(() => {
  plan.value = route.query.plan || null
  price.value = route.query.price || null
})

/* FAKE AUTH (simple pour test SaaS) */
const handleAuth = () => {
  if (!email.value || !password.value) {
    error.value = "Veuillez remplir tous les champs"
    return
  }

  // 🔥 USER SIMULÉ (tu peux remplacer par Firebase après)
  const user = {
    email: email.value,
    uid: Date.now().toString()
  }

  localStorage.setItem("user", JSON.stringify(user))

  // 🔥 REDIRECTION INTELLIGENTE
  if (plan.value) {
    window.location.href = `/#/panier?plan=${plan.value}&price=${price.value}`
  } else {
    window.location.href = "/#/dashboard"
  }
}
</script>

<style scoped>
.input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
}
</style>
