<script setup>
import { useRoute, useRouter } from "vue-router"
import { onMounted } from "vue"

const route = useRoute()
const router = useRouter()

onMounted(() => {

  const plan = route.query.plan || "free"

  console.log("Plan reçu:", plan)

  // 🔥 REDIRECTION CORRECTE
  setTimeout(() => {
    router.push(`/dashboard?plan=${plan}`)
  }, 1500)

})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <h1 class="text-2xl font-bold text-green-600">
      ✅ Paiement réussi
    </h1>
    <p class="mt-2 text-gray-600">
      Redirection vers votre dashboard...
    </p>
  </div>
</template>
