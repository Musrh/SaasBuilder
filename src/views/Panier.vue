<template>
  <div class="p-6 max-w-2xl mx-auto">

    <h1 class="text-2xl font-bold mb-6 text-center">
      🛒 Panier SaaS
    </h1>

    <!-- PLAN -->
    <div v-if="selectedPlan" class="bg-gray-50 p-4 rounded-xl mb-6 shadow">
      <h2 class="text-lg font-semibold">
        Plan : {{ selectedPlan }}
      </h2>
      <p class="text-gray-600">
        Prix : {{ selectedPrice }} €
      </p>
    </div>

    <!-- NOT LOGGED -->
    <div v-if="!user" class="text-center">

      <p class="text-red-500 mb-4">
        Vous devez être connecté
      </p>

      <button
        @click="goAuth"
        class="bg-black text-white px-4 py-2 rounded"
      >
        Se connecter
      </button>

    </div>

    <!-- FORM -->
    <div v-else>

      <div class="space-y-2 mb-4">
        <input v-model="adresse1" placeholder="Adresse 1" class="input" />
        <input v-model="adresse2" placeholder="Adresse 2" class="input" />
        <input v-model="codePostal" placeholder="Code postal" class="input" />
        <input v-model="ville" placeholder="Ville" class="input" />
        <input v-model="pays" placeholder="Pays" class="input" />
      </div>

      <button
        @click="buyPlan"
        class="w-full bg-blue-600 text-white py-3 rounded-lg"
      >
        💳 Payer avec Stripe
      </button>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

const route = useRoute()
const router = useRouter()

const user = ref(null)

const selectedPlan = ref(null)
const selectedPrice = ref(0)

const adresse1 = ref("")
const adresse2 = ref("")
const codePostal = ref("")
const ville = ref("")
const pays = ref("")

onMounted(() => {

  onAuthStateChanged(auth, (u) => {
    user.value = u
  })

  // 🔥 PLAN URL
  if (route.query.plan) {
    selectedPlan.value = route.query.plan
    selectedPrice.value = Number(route.query.price || 0)

    localStorage.setItem("planChoisi", selectedPlan.value)
  }

  // 🔥 RESTORE
  const pendingPlan = localStorage.getItem("pendingPlan")
  const pendingPrice = localStorage.getItem("pendingPrice")

  if (pendingPlan && !selectedPlan.value) {
    selectedPlan.value = pendingPlan
    selectedPrice.value = Number(pendingPrice)

    localStorage.removeItem("pendingPlan")
    localStorage.removeItem("pendingPrice")
  }
})

const goAuth = () => {
  localStorage.setItem("pendingPlan", selectedPlan.value)
  localStorage.setItem("pendingPrice", selectedPrice.value)
  router.push("/auth")
}

const getAdresse = () => {
  return `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`
}

const buyPlan = async () => {

  if (!selectedPlan.value || !selectedPrice.value) {
    alert("Plan invalide")
    return
  }

  if (!user.value) {
    return goAuth()
  }

  try {
    const res = await fetch(
      "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan: selectedPlan.value,
          prix: selectedPrice.value,
          email: user.value.email,
          clientId: user.value.uid,
          adresse: getAdresse()
        })
      }
    )

    const data = await res.json()

    if (!data.url) {
      alert("Erreur Stripe")
      return
    }

    window.location.href = data.url

  } catch (e) {
    console.error(e)
    alert("Erreur paiement")
  }
}
</script>

<style scoped>
.input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
</style>
