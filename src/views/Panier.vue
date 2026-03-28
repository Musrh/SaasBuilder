<template>
  <div class="p-4 max-w-3xl mx-auto">

    <h1 class="text-2xl font-bold mb-4">
      {{ titles.cart }}
    </h1>

    <!-- USER -->
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

    <!-- ================= PLANS ================= -->
    <div v-else class="mb-6">

      <h2 class="font-bold mb-2">Plans SaaS</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- PRO -->
        <div class="border p-4 rounded-xl">
          <h3 class="font-bold">Pro</h3>
          <p class="text-gray-600">Fonctionnalités avancées</p>
          <p class="font-bold mt-2">19.99 €</p>

          <button
            @click="buyPlan('pro', 19.99)"
            class="bg-blue-600 text-white px-4 py-2 mt-3 rounded w-full"
          >
            Acheter Pro
          </button>
        </div>

        <!-- PREMIUM -->
        <div class="border p-4 rounded-xl">
          <h3 class="font-bold">Premium</h3>
          <p class="text-gray-600">SaaS complet + backend client</p>
          <p class="font-bold mt-2">49.99 €</p>

          <button
            @click="buyPlan('premium', 49.99)"
            class="bg-purple-600 text-white px-4 py-2 mt-3 rounded w-full"
          >
            Acheter Premium
          </button>
        </div>

      </div>
    </div>

    <!-- ================= ADDRESS ================= -->
    <div v-if="user">

      <h2 class="font-semibold mb-2">{{ titles.address }}</h2>

      <input v-model="adresse1" :placeholder="titles.address1" class="input" />
      <input v-model="adresse2" :placeholder="titles.address2" class="input" />
      <input v-model="codePostal" :placeholder="titles.postalCode" class="input" />
      <input v-model="ville" :placeholder="titles.city" class="input" />
      <input v-model="pays" :placeholder="titles.country" class="input" />

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import axios from "axios"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

/* ================= STATE ================= */
const user = ref(null)

const adresse1 = ref("")
const adresse2 = ref("")
const codePostal = ref("")
const ville = ref("")
const pays = ref("")

/* ================= AUTH ================= */
onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u
  })
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
const buyPlan = async (plan, price) => {
  try {
    const response = await axios.post(
      "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
      {
        items: [
          {
            nom: "Plan " + plan,
            prix: price,
            quantity: 1
          }
        ],
        email: user.value.email,
        adresseLivraison: getAdresse(),
        plan: plan,
        clientId: user.value.uid
      }
    )

    window.location.href = response.data.url

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
