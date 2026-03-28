<template>
  <div class="p-4 max-w-3xl mx-auto">

    <h1 class="text-2xl font-bold mb-4">Panier SaaS</h1>

    <!-- PLAN -->
    <div v-if="plan" class="border p-4 rounded-xl mb-6">
      <h2 class="font-bold text-lg">Plan choisi : {{ plan }}</h2>
      <p class="text-gray-600">Prix : {{ price }} €</p>
    </div>

    <!-- LOGIN -->
    <div v-if="!user">
      <p class="text-red-600">Connectez-vous pour continuer</p>
      <button @click="goAuth" class="bg-black text-white px-4 py-2 mt-3 rounded">
        Se connecter
      </button>
    </div>

    <!-- PAY -->
    <div v-else>
      <button
        @click="pay"
        class="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        Payer avec Stripe
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const plan = ref("")
const price = ref(0)
const user = ref(null)

onMounted(() => {
  plan.value = route.query.plan
  price.value = route.query.price

  const savedUser = localStorage.getItem("user")
  if (savedUser) user.value = JSON.parse(savedUser)
})

const goAuth = () => {
  router.push(`/auth?plan=${plan.value}&price=${price.value}`)
}

const pay = async () => {
  const res = await fetch(
    "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            nom: "Plan " + plan.value,
            prix: price.value,
            quantity: 1
          }
        ],
        email: user.value.email,
        plan: plan.value,
        clientId: user.value.uid
      })
    }
  )

  const data = await res.json()
  window.location.href = data.url
}
</script>
