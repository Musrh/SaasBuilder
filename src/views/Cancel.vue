<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div class="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center">

      <!-- ICON CANCEL -->
      <div class="text-red-500 text-6xl mb-4">❌</div>

      <h1 class="text-2xl font-bold mb-2">
        Paiement annulé
      </h1>

      <p class="text-gray-500 mb-6">
        Votre paiement n’a pas été complété.
      </p>

      <button
        class="bg-black text-white px-6 py-2 rounded-xl hover:bg-gray-800"
        @click="$router.push('/')"
      >
        Retour au site
      </button>

    </div>
  </div>
</template>

<script setup>
// rien nécessaire ici
</script>
