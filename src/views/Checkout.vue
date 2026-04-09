<script setup>
import { onMounted, ref } from "vue"
import { getAuth } from "firebase/auth"
import { useRoute } from "vue-router"

const route = useRoute()
const loading = ref(true)

const plans = {
  pro: "pri_01knqyg0sg0q59g3y8388wn63g"
}

onMounted(() => {
  Paddle.Environment.set("sandbox")

  Paddle.Initialize({
    token: "test_xxxxx"
  })

  // 🔥 AUTO CHECKOUT
  setTimeout(() => {
    pay()
  }, 800)
})

function pay() {
  const user = getAuth().currentUser
  const plan = route.query.plan

  if (!user) {
    alert("Utilisateur non connecté")
    return
  }

  Paddle.Checkout.open({
    items: [
      {
        priceId: plans[plan],
        quantity: 1
      }
    ],
    customData: {
      ownerUid: user.uid,
      plan: plan
    }
  })

  loading.value = false
}
</script>

<template>
  <div class="p-10 text-center">

    <h2 class="text-2xl mb-4">Redirection vers le paiement...</h2>

    <!-- 🔥 fallback bouton -->
    <button
      @click="pay"
      class="bg-green-500 text-white px-6 py-3 rounded-lg"
    >
      Payer maintenant
    </button>

  </div>
</template>
