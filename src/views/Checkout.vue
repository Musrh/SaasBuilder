<script setup>
import { onMounted, ref } from "vue"
import { getAuth } from "firebase/auth"
import { useRoute } from "vue-router"

const route = useRoute()
const loading = ref(true)

// =======================================================
// 🧠 PLANS SAAS
// =======================================================
const plans = {
  pro: {
    priceId: "pri_01knqyg0sg0q59g3y8388wn63g",
    name: "Plan Pro",
    price: "9.99€ / mois"
  }
}

// =======================================================
// 🚀 INIT PADDLE (SAFE)
// =======================================================
onMounted(() => {
  console.log("🚀 Init Checkout")

  // debug erreurs globales
  window.addEventListener("error", (e) => {
    console.error("❌ JS ERROR:", e.message)
  })

  if (!window.Paddle) {
    console.error("❌ Paddle non chargé")
    alert("Paddle non chargé (vérifie index.html)")
    return
  }

  window.Paddle.Environment.set("sandbox")

  window.Paddle.Initialize({
    token: "test_bcf62c9216d90c1d51fe9de3cf3"
  })

  console.log("✅ Paddle prêt")
})

// =======================================================
// 💳 PAYMENT FUNCTION (ULTRA SAFE)
// =======================================================
function pay() {
  console.log("🟢 CLICK PAY")

  const user = getAuth().currentUser
  const planKey = (route.query.plan || "").toLowerCase()
  const plan = plans[planKey]

  console.log("user:", user)
  console.log("planKey:", planKey)
  console.log("plan:", plan)
  console.log("Paddle:", window.Paddle)

  // 🔒 Paddle check
  if (!window.Paddle) {
    alert("Paddle non chargé")
    return
  }

  // 🔒 user check
  if (!user) {
    alert("Utilisateur non connecté")
    return
  }

  // 🔒 plan check
  if (!plan || !plan.priceId) {
    alert("Plan invalide: " + planKey)
    return
  }

  // 🚀 OPEN CHECKOUT
  try {
    window.Paddle.Checkout.open({
      items: [
        {
          priceId: plan.priceId,
          quantity: 1
        }
      ],
      customData: {
        ownerUid: user.uid,
        plan: planKey,
        planName: plan.name,
        priceLabel: plan.price
      }
    })

    loading.value = false

  } catch (err) {
    console.error("❌ Paddle error:", err)
    alert("Erreur ouverture paiement")
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">

    <!-- TITLE -->
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold">Checkout</h2>

      <p class="text-gray-600 mt-2">
        {{ plans[(route.query.plan || '').toLowerCase()]?.name || "Plan inconnu" }}
      </p>

      <p class="text-sm text-gray-500">
        {{ plans[(route.query.plan || '').toLowerCase()]?.price || "" }}
      </p>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="mb-6 text-gray-500">
      Prêt pour le paiement
    </div>

    <!-- BUTTON -->
    <button
      @click="pay"
      class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
    >
      Payer maintenant
    </button>

  </div>
</template>
