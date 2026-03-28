<template>
  <div class="p-4 max-w-3xl mx-auto">

    <h1 class="text-2xl font-bold mb-4">
      {{ titles.cart }}
    </h1>

    <!-- ❌ NOT LOGGED -->
    <div v-if="!user">
      <p class="text-red-600 font-semibold">
        {{ titles.mustLogin }}
      </p>

      <button
        @click="$router.push('/auth')"
        class="bg-black text-white px-4 py-2 mt-3 rounded"
      >
        {{ titles.login }}
      </button>
    </div>

    <!-- ✅ USER CONNECTED -->
    <div v-else>

      <!-- ================= PLAN DETECTED ================= -->
      <div v-if="selectedPlan" class="mb-6 border p-4 rounded-xl bg-gray-50">

        <h2 class="font-bold text-lg mb-2">
          Plan sélectionné
        </h2>

        <div class="flex justify-between items-center">
          <div>
            <p class="font-semibold capitalize">{{ selectedPlan }}</p>
            <p class="text-gray-500">{{ planDescription }}</p>
          </div>

          <div class="text-xl font-bold">
            {{ selectedPrice }} €
          </div>
        </div>

        <button
          @click="buyPlan"
          class="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Payer maintenant
        </button>

      </div>

      <!-- ================= ADDRESS ================= -->
      <div class="mb-6">

        <h2 class="font-semibold mb-2">
          {{ titles.address }}
        </h2>

        <input v-model="adresse1" :placeholder="titles.address1" class="input" />
        <input v-model="adresse2" :placeholder="titles.address2" class="input" />
        <input v-model="codePostal" :placeholder="titles.postalCode" class="input" />
        <input v-model="ville" :placeholder="titles.city" class="input" />
        <input v-model="pays" :placeholder="titles.country" class="input" />

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

/* ================= ROUTE ================= */
const route = useRoute()

/* ================= STATE ================= */
const user = ref(null)

const adresse1 = ref("")
const adresse2 = ref("")
const codePostal = ref("")
const ville = ref("")
const pays = ref("")

/* ================= PLAN ================= */
const selectedPlan = ref(null)
const selectedPrice = ref(0)

/* ================= AUTH ================= */
onMounted(() => {

  // 🔐 USER
  onAuthStateChanged(auth, (u) => {
    console.log("USER =", u)
    user.value = u
  })

  // 📦 PLAN FROM URL
  if (route.query.plan) {
    selectedPlan.value = route.query.plan
    selectedPrice.value = Number(route.query.price || 0)
  }
})

/* ================= PLAN DESCRIPTION ================= */
const planDescription = computed(() => {
  if (selectedPlan.value === "pro") return "Fonctionnalités avancées"
  if (selectedPlan.value === "premium") return "SaaS complet + backend client"
  return ""
})

/* ================= TEXT ================= */
const titles = {
  cart: "Votre Panier",
  mustLogin: "Vous devez être connecté pour payer.",
  login: "Se connecter",
  address: "Adresse",
  address1: "Adresse 1",
  address2: "Adresse 2",
  postalCode: "Code postal",
  city: "Ville",
  country: "Pays",
}

/* ================= HELP ================= */
const getAdresse = () => {
  return `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`
}

/* ================= BUY PLAN ================= */
const buyPlan = async () => {

  if (!user.value) {
    alert("Connectez-vous d'abord")
    return
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
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
</style>
