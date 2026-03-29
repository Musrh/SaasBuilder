<template>
  <div class="min-h-screen bg-gray-100 flex justify-center items-center p-4">

    <div class="w-full max-w-xl bg-white shadow-xl rounded-2xl p-6">

      <h1 class="text-2xl font-bold mb-6 text-center">
        🛒 Panier SaaS
      </h1>

      <!-- PLAN -->
      <div v-if="selectedPlan" class="bg-gray-50 p-4 rounded-xl mb-6">
        <h2 class="text-lg font-semibold">
          Plan : {{ selectedPlan.toUpperCase() }}
        </h2>
        <p class="text-gray-600">
          Prix : {{ selectedPrice }} €
        </p>
      </div>

      <!-- NOT LOGGED -->
      <div v-if="!user" class="text-center">

        <p class="text-red-500 font-semibold mb-4">
          Vous devez être connecté pour continuer
        </p>

        <button
          @click="goAuth"
          class="bg-black text-white px-4 py-2 rounded-lg"
        >
          Se connecter
        </button>

      </div>

      <!-- FORM -->
      <div v-else>

        <div class="space-y-3 mb-6">

          <input v-model="adresse1" placeholder="Adresse 1" class="input" />
          <input v-model="adresse2" placeholder="Adresse 2" class="input" />
          <input v-model="codePostal" placeholder="Code postal" class="input" />
          <input v-model="ville" placeholder="Ville" class="input" />
          <input v-model="pays" placeholder="Pays" class="input" />

        </div>

        <button
          @click="buyPlan"
          class="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          💳 Payer avec Stripe
        </button>

      </div>

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

  // 🔥 AUTH
  onAuthStateChanged(auth, (u) => {
    user.value = u
  })

  // 🔥 PLAN depuis URL
  if (route.query.plan) {
    selectedPlan.value = route.query.plan
    selectedPrice.value = Number(route.query.price || 0)

    localStorage.setItem("planChoisi", selectedPlan.value)
  }

  // 🔥 RESTORE après login
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

  router.push(`/auth`)
}

// ================= ADDRESS =================
const getAdresse = () => {
  return `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`
}

// ================= STRIPE =================
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
          items: [
            {
              nom: "Plan " + selectedPlan.value,
              prix: selectedPrice.value,
              quantity: 1
            }
          ],
          email: user.value.email,
          clientId: user.value.uid,
          plan: selectedPlan.value,
          adresseLivraison: getAdresse()
        })
      }
    )

    const data = await res.json()

    console.log("STRIPE RESPONSE:", data)

    if (!data.url) {
      alert("Erreur Stripe (pas d'URL)")
      return
    }

    // 🔥 REDIRECT STRIPE
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
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
  outline: none;
}

.input:focus {
  border-color: #3b82f6;
}
</style>
