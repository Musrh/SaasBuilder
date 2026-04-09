<script setup>
import { onMounted, ref } from "vue"
import { getAuth } from "firebase/auth"
import { useRoute } from "vue-router"

const route = useRoute()
const loading = ref(true)

// =======================================================
// 🧠 PLANS SAAS (PROPRE + SCALABLE)
// =======================================================
const plans = {
  pro: {
    priceId: "pri_01knqyg0sg0q59g3y8388wn63g",
    name: "Plan Pro",
    price: "9.99€ / mois"
  }
  
}

// =======================================================
// 🚀 INIT PADDLE
// =======================================================
onMounted(() => {
  Paddle.Environment.set("sandbox")

  Paddle.Initialize({
    token: "test_bcf62c9216d90c1d51fe9de3cf3"
  })

  // auto checkout
  setTimeout(() => {
    pay()
  }, 800)
})

// =======================================================
// 💳 PAYMENT FUNCTION
// =======================================================
function pay() {
  const user = getAuth().currentUser
  const planKey = route.query.plan
  const plan = plans[planKey]

  // 🔒 sécurité user
  if (!user) {
    alert("Utilisateur non connecté")
    return
  }

  // 🔒 sécurité plan
  if (!plan || !plan.priceId) {
    alert("Plan invalide")
    return
  }

  // 🚀 OPEN PADDLE CHECKOUT
  Paddle.Checkout.open({
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
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">

    <!-- TITLE -->
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold">Checkout</h2>

      <p class="text-gray-600 mt-2">
        {{ plans[route.query.plan]?.name }}
      </p>

      <p class="text-sm text-gray-500">
        {{ plans[route.query.plan]?.price }}
      </p>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="mb-6 text-gray-500">
      Redirection vers le paiement...
    </div>

    <!-- FALLBACK BUTTON -->
    <button
      @click="pay"
      class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
    >
      Payer maintenant
    </button>

  </div>
</template>
