<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">

    <div class="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">

      <h1 class="text-2xl font-bold text-green-600 mb-4">
        ✅ Paiement réussi
      </h1>

      <p class="text-gray-600 mb-6">
        Activation de votre espace en cours...
      </p>

      <div class="loader mx-auto mb-4"></div>

      <p class="text-sm text-gray-500">
        Redirection vers votre dashboard...
      </p>

    </div>

  </div>
</template>

<script setup>
import { onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"

const router = useRouter()
const route = useRoute()

onMounted(() => {

  // 🔥 1. récupérer plan principal
  let plan = localStorage.getItem("planChoisi")

  // 🔥 2. fallback si vide
  if (!plan && route.query.plan) {
    plan = route.query.plan
  }

  if (!plan) plan = "free"

  // 🔥 3. mapping SaaS → dashboard
  const dashboards = {
    free: "/dashboard?plan=free",
    pro: "/dashboard?plan=pro",
    premium: "/dashboard?plan=premium"
  }

  // 🔥 4. petit délai UX
  setTimeout(() => {
    window.location.href = dashboards[plan] || "/dashboard?plan=free"
  }, 2000)

})
</script>

<style scoped>
.loader {
  width: 40px;
  height: 40px;
  border: 4px solid #eee;
  border-top: 4px solid #22c55e;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
