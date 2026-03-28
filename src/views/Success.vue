<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-6">

    <!-- SUCCESS -->
    <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">

      <h1 class="text-2xl font-bold text-green-600 mb-4">
        ✅ Paiement réussi !
      </h1>

      <p class="text-gray-700 mb-6">
        Votre abonnement a été activé avec succès.
      </p>

      <!-- LOADING -->
      <div class="flex flex-col items-center">
        <div class="loader mb-3"></div>
        <p class="text-sm text-gray-500">
          Redirection vers votre espace...
        </p>
      </div>

    </div>

  </div>
</template>

<script setup>
import { onMounted } from "vue"
import { useRoute } from "vue-router"

const route = useRoute()

onMounted(() => {

  // 🔥 récupérer session Stripe (optionnel)
  const sessionId = route.query.session_id
  console.log("Stripe session:", sessionId)

  // 🔥 récupérer plan choisi
  const plan = localStorage.getItem("planChoisi") || "free"

  // 🔥 mapping plan → builder
  const routes = {
    free: "/builder1",
    pro: "/builder2",
    premium: "/builder3"
  }

  // 🔥 redirection après 2 secondes
  setTimeout(() => {
    window.location.href = "/#" + (routes[plan] || "/builder1")
  }, 2000)

})
</script>

<style scoped>
/* Loader simple */
.loader {
  border: 4px solid #eee;
  border-top: 4px solid #22c55e;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
