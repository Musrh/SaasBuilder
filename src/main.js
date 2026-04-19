// ============================================================
//  SaasBuilder/src/main.js — version corrigée
//  - Généralisée à tous les propriétaires de stores (plus d'email codé en dur)
//  - Nettoie le résidu localStorage à chaque changement d'utilisateur
//    pour qu'un nouveau propriétaire voie un site VIDE (pas le site
//    d'un autre compte resté en cache).
// ============================================================
import { createApp } from "vue"
import App           from "./App.vue"
import router        from "./router.js"
import { auth }      from "./firebase.js"
import { onAuthStateChanged } from "firebase/auth"

const app = createApp(App)
app.use(router)

// ── Nettoyage du localStorage entre comptes ───────────────────
// Si l'UID connecté change (déconnexion / autre compte), on purge
// "siteDataPro" pour éviter que le nouveau propriétaire hérite
// des sections d'un autre.
let lastUid = localStorage.getItem("lastAuthUid") || null
onAuthStateChanged(auth, (user) => {
  const uid = user?.uid || null
  if (uid !== lastUid) {
    localStorage.removeItem("siteDataPro")
    lastUid = uid
    if (uid) localStorage.setItem("lastAuthUid", uid)
    else     localStorage.removeItem("lastAuthUid")
  }
})

// ── Détection retour Stripe ───────────────────────────────────
// Stripe redirige vers l'URL racine (il supprime le #fragment).
// On détecte au démarrage via localStorage et on redirige.
router.isReady().then(() => {
  const pending = localStorage.getItem("pendingStripeOrder")
  if (!pending) return
  try {
    const order = JSON.parse(pending)
    const age   = Date.now() - new Date(order.createdAt).getTime()
    const route = router.currentRoute.value

    // Détecter retour Stripe depuis n'importe quelle page racine
    const isReturnPage = route.name === "home" || route.path === "/" || !route.name

    if (age < 30 * 60 * 1000 && isReturnPage) {
      router.replace({ name: "payment-success" })
    } else if (age >= 30 * 60 * 1000) {
      localStorage.removeItem("pendingStripeOrder")
      localStorage.removeItem("stripeOwnerUid")
      localStorage.removeItem("stripeSiteSlug")
    }
  } catch (e) {
    localStorage.removeItem("pendingStripeOrder")
  }
})

app.mount("#app")
