<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 px-4">

    <div class="bg-white/90 backdrop-blur-lg p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/40">

      <!-- PLAN -->
      <div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-4 mb-6 text-center shadow">
        <p class="text-sm opacity-80">Plan sélectionné</p>
        <p class="text-2xl font-bold capitalize">
          {{ selectedPlan }}
        </p>
      </div>

      <!-- TITLE -->
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">
        Connexion / Inscription
      </h2>

      <!-- EMAIL -->
      <div class="mb-4">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none transition"
        />
      </div>

      <!-- PASSWORD -->
      <div class="mb-6">
        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          class="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none transition"
        />
      </div>

      <!-- ERROR -->
      <p v-if="errorMsg" class="text-red-500 text-sm mb-4 text-center">
        {{ errorMsg }}
      </p>

      <!-- LOADING -->
      <p v-if="loading" class="text-blue-500 text-sm mb-4 text-center">
        Chargement...
      </p>

      <!-- LOGIN -->
      <button
        @click="login"
        :disabled="loading"
        class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white py-3 rounded-xl font-semibold mb-3 transition disabled:opacity-50"
      >
        Se connecter
      </button>

      <!-- REGISTER -->
      <button
        @click="register"
        :disabled="loading"
        class="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-semibold transition disabled:opacity-50"
      >
        S'inscrire
      </button>

      <!-- FOOTER LINKS -->
      <div class="mt-6 text-center text-sm text-gray-500 space-y-2">
        <p class="hover:text-blue-500 cursor-pointer">Privacy Policy</p>
        <p class="hover:text-blue-500 cursor-pointer">Remboursement</p>
        <p class="hover:text-blue-500 cursor-pointer">Confidentialité</p>
        <p class="hover:text-blue-500 cursor-pointer">Mentions légales</p>
        <p class="hover:text-blue-500 cursor-pointer">Conditions</p>
      </div>

    </div>
  </div>
</template>
