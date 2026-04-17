<!-- ============================================================
  PaymentSuccess.vue — SaasBuilder/src/views/PaymentSuccess.vue

  Après retour de Stripe :
  1. Lit pendingStripeOrder depuis localStorage
  2. Attend que Firebase Auth soit prêt (onAuthStateChanged)
  3. Sauvegarde la commande dans :
     - users/{uid}/orders/{id}   ← visible dans Orders.vue
     - orders/{id}               ← collection globale
  4. Vide cartSession dans users/{uid}
  5. Nettoie localStorage
  6. Affiche récapitulatif commande
  7. Redirige vers le store via slug (au lieu de /)
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
            <div v-for="item in orderData.items" :key="item.id" class="ps-item">
              <div class="ps-item-img">
                <img v-if="item.image" :src="item.image" :alt="item.name"/>
                <span v-else>🛍️</span>
              </div>
              <div class="ps-item-info">
                <span class="ps-item-name">{{ item.name }}</span>
                <span class="ps-item-qty">× {{ item.qty }}</span>
              </div>
              <span class="ps-item-price">
                {{ (parseFloat(item.price) * item.qty).toFixed(2) }} {{ item.currency }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="ps-summary">
          <p class="ps-no-data">Commande enregistrée. Vous recevrez une confirmation par email.</p>
        </div>

        <!-- MODIFIÉ : suppression du bouton "Mes commandes" -->
        <div class="ps-actions">
          <button class="ps-btn-primary" @click="goBack">← Continuer mes achats</button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { doc, collection, addDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase"

const router    = useRouter()
const route     = useRoute()
const auth      = getAuth()
const orderData = ref(null)
const saving    = ref(true)
const saved     = ref(false)
const storeSlug = ref("")   // ← slug du store pour la redirection

onMounted(() => {
  // ── 1. Lire pendingStripeOrder immédiatement (avant auth) ──
  const raw = localStorage.getItem("pendingStripeOrder")
  if (raw) {
    try { orderData.value = JSON.parse(raw) } catch(e) {}
  }

  // ── 1b. Récupérer le slug depuis query, localStorage ou orderData ──
  storeSlug.value =
    route.query.slug ||
    localStorage.getItem("stripeSiteSlug") ||
    orderData.value?.slug ||
    orderData.value?.storeSlug ||
    ""

  // ── 2. Attendre que Firebase Auth soit prêt ────────────────
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      const ownerUid = localStorage.getItem("stripeOwnerUid")
        || orderData.value?.ownerUid

      if (ownerUid && orderData.value) {
        await saveOrder(ownerUid, null)
      }
      saving.value = false
      return
    }

    const ownerUid = user.uid || orderData.value?.ownerUid

    if (orderData.value && ownerUid) {
      await saveOrder(ownerUid, user)
    }
    saving.value = false
  })
})

// ── Sauvegarder la commande dans Firestore ──────────────────
async function saveOrder(ownerUid, user) {
  try {
    const order = {
      ...(orderData.value || {}),
      ownerUid,
      storeUid:  ownerUid,
      clientId:  ownerUid,
      status:    "paid",
      provider:  "stripe",
      createdAt: orderData.value?.createdAt || new Date().toISOString(),
    }

    // a. users/{uid}/orders/
    try {
      await addDoc(collection(db, "users", ownerUid, "orders"), order)
      console.log("✅ Commande sauvegardée dans users/" + ownerUid + "/orders")
    } catch(e) {
      console.error("Erreur users/orders:", e.message)
    }

    // b. orders/ (collection racine)
    try {
      await addDoc(collection(db, "orders"), order)
      console.log("✅ Commande sauvegardée dans orders/")
    } catch(e) {
      console.error("Erreur orders/:", e.message)
    }

    // c. Vider cartSession dans users/{uid}
    try {
      const userRef = doc(db, "users", ownerUid)
      await updateDoc(userRef, { cartSession: [] })
      console.log("🧹 CartSession vidée")
    } catch(e) {
      console.error("Erreur clear cartSession:", e.message)
    }

    // d. cmdclients — collection commandes client (pour profil client)
    try {
      const clientUid   = orderData.value?.clientUid   || user?.uid || ""
      const clientEmail = orderData.value?.customerEmail || ""
      const clientName  = orderData.value?.customerName  || ""
      const storeUid    = ownerUid
      const cmdEntry = {
        ...(orderData.value || {}),
        ownerUid,
        storeUid,
        clientUid,
        clientEmail:     clientEmail.toLowerCase(),
        clientName,
        status:          "paid",
        provider:        "stripe",
        createdAt:       orderData.value?.createdAt || new Date().toISOString(),
        savedAt:         new Date().toISOString(),
      }
      await addDoc(collection(db, "cmdclients"), cmdEntry)
      console.log("✅ Commande sauvegardée dans cmdclients/")
    } catch(e) {
      console.error("Erreur cmdclients:", e.message)
    }

    saved.value = true

  } catch(e) {
    console.error("Erreur sauvegarde commande:", e)
  } finally {
    localStorage.removeItem("pendingStripeOrder")
    localStorage.removeItem("stripeOwnerUid")
    // On garde stripeSiteSlug jusqu'à la redirection, puis on le nettoie dans goBack
  }
}

// ── MODIFIÉ : redirection vers le store via slug ────────────
function goBack() {
  localStorage.removeItem("stripeSiteSlug")
  if (storeSlug.value) {
    router.push(`/site/${storeSlug.value}`)
  } else {
    router.push("/")
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

.ps-root{min-height:100vh;background:linear-gradient(135deg,#f0fdf4,#dcfce7);display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',sans-serif}
.ps-card{background:white;border-radius:24px;padding:40px 32px;max-width:500px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(16,185,129,.12)}

/* Icône */
.ps-icon-wrap{display:flex;justify-content:center;margin-bottom:20px}
.ps-circle{width:72px;height:72px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;animation:ps-pop .4s cubic-bezier(.175,.885,.32,1.275)}
@keyframes ps-pop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
.ps-check{color:white;font-size:32px;font-weight:700;line-height:1}

/* Saving */
.ps-saving{display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 0;color:#6b7280}
.ps-spinner{width:32px;height:32px;border:3px solid #d1fae5;border-top-color:#10b981;border-radius:50%;animation:ps-spin .7s linear infinite}
@keyframes ps-spin{to{transform:rotate(360deg)}}

.ps-title{font-family:'Playfair Display',serif;font-size:26px;color:#111;margin-bottom:6px}
.ps-subtitle{font-size:14px;color:#6b7280;margin-bottom:24px;display:flex;align-items:center;justify-content:center;gap:8px}
.ps-saved-badge{background:#ecfdf5;color:#059669;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;border:1px solid #a7f3d0}

/* Summary */
.ps-summary{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:24px;text-align:left}
.ps-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6}
.ps-row:last-of-type{border-bottom:none}
.ps-row strong{color:#111;font-size:14px}
.ps-items{margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb}
.ps-items-title{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.ps-item{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f9fafb}
.ps-item:last-child{border-bottom:none}
.ps-item-img{width:34px;height:34px;border-radius:6px;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.ps-item-img img{width:100%;height:100%;object-fit:cover}
.ps-item-info{flex:1;display:flex;flex-direction:column;gap:1px}
.ps-item-name{font-size:12px;font-weight:600;color:#111}
.ps-item-qty{font-size:10px;color:#9ca3af}
.ps-item-price{font-size:12px;font-weight:700;color:#10b981;white-space:nowrap}
.ps-no-data{font-size:13px;color:#6b7280;text-align:center;padding:8px 0;line-height:1.6}

/* Actions — un seul bouton pleine largeur */
.ps-actions{display:flex;gap:10px}
.ps-btn-primary{flex:1;background:#10b981;color:white;border:none;border-radius:11px;padding:13px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.ps-btn-primary:hover{background:#059669;transform:translateY(-1px)}
</style>
