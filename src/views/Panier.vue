<template>
  <div class="p-4 max-w-3xl mx-auto">

    <h1 class="text-2xl font-bold mb-4">
      🛒 Panier SaaS
    </h1>

    <!-- PLAN -->
    <div v-if="selectedPlan" class="border p-4 rounded-xl mb-6 bg-gray-50">
      <h2 class="font-bold text-lg">
        Plan : {{ selectedPlan }}
      </h2>
      <p class="text-gray-600">
        Prix : {{ selectedPrice }} €
      </p>
    </div>

    <!-- LOGIN STATE -->
    <div v-if="!user">
      <p class="text-red-600 font-semibold">
        Vous devez être connecté pour continuer
      </p>

      <button
        @click="goAuth"
        class="bg-black text-white px-4 py-2 mt-3 rounded"
      >
        Se connecter
      </button>
    </div>

    <!-- FORM ADRESSE + PAY -->
    <div v-else>

      <div class="mb-4">
        <input v-model="adresse1" placeholder="Adresse 1" class="input" />
        <input v-model="adresse2" placeholder="Adresse 2" class="input" />
        <input v-model="codePostal" placeholder="Code postal" class="input" />
        <input v-model="ville" placeholder="Ville" class="input" />
        <input v-model="pays" placeholder="Pays" class="input" />
      </div>

      <button
        @click="buyPlan"
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

// ================= INIT =================
onMounted(() => {

  // 🔥 Firebase auth
  onAuthStateChanged(auth, (u) => {
    user.value = u
  })

  // 🔥 Plan depuis URL
  if (route.query.plan) {
    selectedPlan.value = route.query.plan
    selectedPrice.value = Number(route.query.price || 0)

    // IMPORTANT pour Success.vue
    localStorage.setItem("planChoisi", selectedPlan.value)
  }

  // 🔥 restore après login
  const pendingPlan = localStorage.getItem("pendingPlan")
  const pendingPrice = localStorage.getItem("pendingPrice")

  if (pendingPlan && !selectedPlan.value) {
    selectedPlan.value = pendingPlan
    selectedPrice.value = Number(pendingPrice)

    localStorage.removeItem("pendingPlan")
    localStorage.removeItem("pendingPrice")
  }
})

// ================= AUTH REDIRECT =================
const goAuth = () => {
  localStorage.setItem("pendingPlan", selectedPlan.value)
  localStorage.setItem("pendingPrice", selectedPrice.value)

  router.push(`/auth?plan=${selectedPlan.value}&price=${selectedPrice.value}`)
}

// ================= ADDRESS =================
const getAdresse = () => {
  return `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`
}

// ================= STRIPE =================
const buyPlan = async () => {

  if (!user.value) {
    return goAuth()
  }

  try {
    const response = await fetch(
      "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [
            {
              nom: "Plan " + selectedPlan.value,
              prix: selectedPrice.value,
              quantity: 1
            }
          ],
          email: user.value.email,
          adresseLivraison: getAdresse(),
          plan: selectedPlan.value,
          clientId: user.value.uid
        })
      }
    )

    const data = await response.json()

    if (!data.url) {
      alert("Erreur Stripe")
      return
    }

    window.location.href = data.url

  } catch (err) {
    console.error(err)
    alert("Erreur paiement")
  }
}
</script>

<style scoped>
.input {
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
</style>
