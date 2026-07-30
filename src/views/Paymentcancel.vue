<!-- ============================================================
  PaymentCancel.vue — SaasBuilder/src/views/PaymentCancel.vue
  Affiché si un client annule son paiement dans un store.
  Permet de retourner à la boutique pour réessayer.
============================================================ -->
<template>
  <div class="pc-root">
    <div class="pc-card">

      <div class="pc-icon">❌</div>
      <h1 class="pc-title">Paiement annulé</h1>
      <p class="pc-subtitle">Votre paiement n'a pas été complété. Votre panier est conservé.</p>

      <div class="pc-actions">
        <button class="pc-btn-primary" @click="goBack">
          🛒 Retourner à la boutique
        </button>
        <button class="pc-btn-sec" @click="goHome">
          Accueil
        </button>
      </div>

      <p class="pc-note">Aucun montant n'a été débité.</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from "vue-router"

const router = useRouter()
