<!-- ============================================================
  SaaasGenerator/src/views/PaymentCancel.vue
  Affiché si un client annule son paiement dans un store.
  Permet de retourner au store pour réessayer.
============================================================ -->
<template>
  <div class="pc-root">
    <div class="pc-card">

      <div class="pc-icon">❌</div>
      <h1 class="pc-title">Paiement annulé</h1>
      <p class="pc-subtitle">Votre paiement n'a pas été complété. Votre panier est conservé.</p>

      <div class="pc-actions">
        <button class="pc-btn-primary" @click="goBack">
          🛒 Retourner au panier
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
const route  = useRoute()

const goBack = () => {
  // Essayer d'abord depuis localStorage (Stripe ignore les params après #)
  const siteUid = localStorage.getItem("stripeSiteSlug")
    || localStorage.getItem("stripeOwnerUid")
    || route.query.uid
  // Ne pas supprimer le localStorage ici (PaymentSuccess peut encore en avoir besoin)
  if (siteUid) router.push(`/site/${siteUid}`)
  else router.push("/")
}

const goHome = () => router.push("/")
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.pc-root{min-height:100vh;background:linear-gradient(135deg,#fef2f2,#fee2e2);display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',sans-serif}
.pc-card{background:white;border-radius:24px;padding:48px 36px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(239,68,68,.12)}
.pc-icon{font-size:64px;margin-bottom:20px;animation:shake .4s ease}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.pc-title{font-family:'Playfair Display',serif;font-size:26px;color:#111;margin-bottom:8px}
.pc-subtitle{font-size:15px;color:#6b7280;margin-bottom:32px;line-height:1.6}
.pc-actions{display:flex;gap:10px;margin-bottom:16px}
.pc-btn-primary{flex:2;background:#ef4444;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.pc-btn-primary:hover{background:#dc2626;transform:translateY(-1px)}
.pc-btn-sec{flex:1;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:12px;padding:14px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif}
.pc-btn-sec:hover{background:#e5e7eb}
.pc-note{font-size:12px;color:#9ca3af}
</style>
