<!-- ============================================================
  PaymentSuccess.vue — SaasBuilder/src/views/PaymentSuccess.vue
============================================================ -->

<template>
  <div class="ps-root">
    <div class="ps-card">

      <!-- Icône animée -->
      <div class="ps-icon-wrap">
        <div class="ps-circle">
          <span class="ps-check">✓</span>
        </div>
      </div>

      <!-- Chargement -->
      <div v-if="saving" class="ps-saving">
        <div class="ps-spinner"></div>
        <p>Enregistrement de votre commande...</p>
      </div>

      <template v-else>
        <h1 class="ps-title">Commande confirmée !</h1>
        <p class="ps-subtitle">
          Votre paiement a bien été traité.
          <span v-if="saved" class="ps-saved-badge">✓ Enregistrée</span>
        </p>

        <!-- Récapitulatif -->
        <div v-if="orderData" class="ps-summary">
          <div class="ps-row">
            <span>Total payé</span>
            <strong>{{ orderData.total }} {{ orderData.currency }}</strong>
          </div>

          <div class="ps-row" v-if="orderData.customerName">
            <span>Client</span>
            <strong>{{ orderData.customerName }}</strong>
          </div>

          <div class="ps-row" v-if="orderData.customerEmail">
            <span>Email</span>
            <strong>{{ orderData.customerEmail }}</strong>
          </div>

          <div class="ps-row" v-if="orderData.customerAddress">
            <span>Livraison</span>
            <strong>{{ orderData.customerAddress }}</strong>
          </div>

          <!-- Articles -->
          <div v-if="orderData.items?.length" class="ps-items">
            <div class="ps-items-title">Articles commandés</div>

            <div
              v-for="item in orderData.items"
              :key="item.id"
              class="ps-item"
            >
              <div class="ps-item-img">
                <img v-if="item.image" :src="item.image" :alt="item.name" />
                <span v-else>🛍️</span>
              </div>

              <div class="ps-item-info">
                <span class="ps-item-name">{{ item.name }}</span>
                <span class="ps-item-qty">× {{ item.qty }}</span>
              </div>

              <span class="ps-item-price">
                {{ (parseFloat(item.price) * item.qty).toFixed(2) }}
                {{ item.currency }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="ps-summary">
          <p class="ps-no-data">
            Commande enregistrée. Vous recevrez une confirmation par email.
          </p>
        </div>

        <!-- Actions -->
        <div class="ps-actions">
          <button class="ps-btn-primary" @click="goBack">
            ← Continuer mes achats
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

const router = useRouter()
const route = useRoute()
const auth = getAuth()

const orderData = ref(null)
const storeSlug = ref("")
const saving = ref(true)
const saved = ref(false)

onMounted(() => {
  // ─────────────────────────────────────────────────────────────
  // GARDE ANTI-RETOUR ARRIÈRE
  //
  // Quand l'utilisateur appuie sur le bouton retour depuis la page
  // Stripe sans finaliser le paiement, le navigateur revient sur
  // cette page. On vérifie deux conditions :
  //
  //   1. "stripe_payment_initiated" en sessionStorage : positionné
  //      par SiteViewer juste avant la redirection vers Stripe.
  //      Persiste pendant toute la session de l'onglet.
  //
  //   2. "pendingStripeOrder" en localStorage : positionné par
  //      SiteViewer avec les données de la commande.
  //
  // Si aucune des deux n'est présente, l'utilisateur n'arrive PAS
  // d'un vrai paiement → on le redirige vers la page d'accueil.
  // ─────────────────────────────────────────────────────────────
  const paymentFlag = sessionStorage.getItem("stripe_payment_initiated")
  const raw = localStorage.getItem("pendingStripeOrder")

  if (!paymentFlag && !raw) {
    // Pas de paiement initié — navigation directe ou bouton retour
    // Récupérer le slug pour rediriger vers la bonne boutique
    const fallbackSlug =
      route.query.slug ||
      localStorage.getItem("stripeSiteSlug") ||
      ""
    router.replace(fallbackSlug ? `/${fallbackSlug}` : "/")
    return
  }

  // Supprimer le flag sessionStorage (usage unique)
  sessionStorage.removeItem("stripe_payment_initiated")

  // Charger les données de commande
  if (raw) {
    try {
      orderData.value = JSON.parse(raw)
    } catch (e) {}
  }

  storeSlug.value =
    route.query.slug ||
    localStorage.getItem("stripeSiteSlug") ||
    orderData.value?.slug ||
    orderData.value?.storeSlug ||
    orderData.value?.siteSlug ||
    ""

  onAuthStateChanged(auth, async (user) => {
    const ownerUid =
      user?.uid ||
      localStorage.getItem("stripeOwnerUid") ||
      orderData.value?.ownerUid

    if (ownerUid) {
      try {
        await updateDoc(doc(db, "users", ownerUid), {
          cartSession: [],
        })
        saved.value = true
      } catch (e) {
        console.warn("clear cart:", e.message)
      }
    }

    localStorage.removeItem("pendingStripeOrder")
    localStorage.removeItem("stripeOwnerUid")

    saving.value = false
  })
})

function goBack() {
  localStorage.removeItem("stripeSiteSlug")
  router.push(storeSlug.value ? `/${storeSlug.value}` : "/")
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

.ps-root{min-height:100vh;background:linear-gradient(135deg,#f0fdf4,#dcfce7);display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',sans-serif}
.ps-card{background:white;border-radius:24px;padding:40px 32px;max-width:500px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(16,185,129,.12)}

.ps-icon-wrap{display:flex;justify-content:center;margin-bottom:20px}
.ps-circle{width:72px;height:72px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;animation:ps-pop .4s cubic-bezier(.175,.885,.32,1.275)}
@keyframes ps-pop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
.ps-check{color:white;font-size:32px;font-weight:700}

.ps-saving{display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 0;color:#6b7280}
.ps-spinner{width:32px;height:32px;border:3px solid #d1fae5;border-top-color:#10b981;border-radius:50%;animation:ps-spin .7s linear infinite}
@keyframes ps-spin{to{transform:rotate(360deg)}}

.ps-title{font-size:26px;color:#111;margin-bottom:6px}
.ps-subtitle{font-size:14px;color:#6b7280;margin-bottom:24px;display:flex;align-items:center;justify-content:center;gap:8px}
.ps-saved-badge{background:#ecfdf5;color:#059669;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;border:1px solid #a7f3d0}

.ps-summary{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:24px;text-align:left}
.ps-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6}
.ps-row strong{color:#111}

.ps-items{margin-top:12px}
.ps-item{display:flex;align-items:center;gap:10px;padding:6px 0}
.ps-item-img{width:34px;height:34px;background:#f3f4f6;display:flex;align-items:center;justify-content:center}
.ps-item-info{flex:1}
.ps-item-name{font-size:12px;font-weight:600}
.ps-item-price{font-size:12px;font-weight:700;color:#10b981}

.ps-actions{display:flex}
.ps-btn-primary{flex:1;background:#10b981;color:white;border:none;border-radius:11px;padding:13px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;transition:background .15s}
.ps-btn-primary:hover{background:#059669}
</style>
