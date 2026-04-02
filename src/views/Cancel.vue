<!-- ============================================================
  Cancel.vue — Sassbuilder
  Paiement annulé → retour au Panier
============================================================ -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div class="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full text-center">
      <div class="text-6xl mb-4">❌</div>
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Paiement annulé</h1>
      <p class="text-gray-500 mb-8">
        Votre paiement n'a pas été complété.<br/>Vous pouvez réessayer à tout moment.
      </p>
      <div class="flex flex-col gap-3">
        <button
          @click="retryPayment"
          class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition"
        >
          Réessayer le paiement
        </button>
        <button
          @click="$router.push('/')"
          class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-xl transition"
        >
          Retour aux offres
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router"

const router = useRouter()

const retryPayment = () => {
  const plan  = localStorage.getItem("planChoisi") || "pro"
  const price = localStorage.getItem("planPrice")  || "5"
  router.push({ path: "/panier", query: { plan, price } })
}
</script>
