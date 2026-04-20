// ============================================================
//  SaasBuilder/src/main.js
//
//  PROBLÈME STRIPE :
//  Stripe redirige vers https://musrh.github.io/SaasBuilder/?stripe=ok&slug=mrstore
//  Le # est absent → Vue Router charge la route "/" (home)
//  et non "#/payment-success"
//
//  SOLUTION :
//  1. Détecter ?stripe=ok AVANT app.mount()
//  2. Modifier window.location.hash pour que Vue Router
//     charge directement /payment-success au montage
//  3. NE PAS utiliser return avant app.mount() — Vue doit
//     toujours être monté
// ============================================================
import { createApp } from "vue"
import App    from "./App.vue"
import router from "./router.js"

// ── Interception retour Stripe ────────────────────────────────
// Stripe supprime le # dans l'URL de retour.
// On corrige le hash AVANT que Vue Router initialise les routes.
const params  = new URLSearchParams(window.location.search)
const pending = localStorage.getItem("pendingStripeOrder")

if (params.get("stripe") === "ok" && pending) {
  try {
    const order = JSON.parse(pending)
    const age   = Date.now() - new Date(order.createdAt).getTime()

    if (age < 60 * 60 * 1000) {
      // Sauvegarder le slug depuis l'URL
      const slug = params.get("slug")
                || localStorage.getItem("stripeSiteSlug")
                || order.siteSlug || order.storeSlug || ""
      if (slug) localStorage.setItem("stripeSiteSlug", slug)

      // Nettoyer les query params de l'URL (sans recharger)
      window.history.replaceState({}, "", window.location.pathname)

      // ✅ Forcer le hash AVANT le montage Vue
      // Vue Router lira ce hash au démarrage et chargera /payment-success
      window.location.hash = "#/payment-success"
      // NOTE : pas de return ici — on laisse app.mount() s'exécuter
      // Le rechargement causé par hash= est géré par le navigateur
      // Vue se monte sur la nouvelle URL /#/payment-success
    } else {
      // Commande trop ancienne → nettoyer
      localStorage.removeItem("pendingStripeOrder")
      localStorage.removeItem("stripeOwnerUid")
      localStorage.removeItem("stripeSiteSlug")
    }
  } catch(e) {
    localStorage.removeItem("pendingStripeOrder")
  }
} else if (pending) {
  // Cas 2 : pendingStripeOrder présent mais pas de ?stripe=ok
  // L'utilisateur est revenu sur la page racine après Stripe
  // (certains navigateurs mobiles suppriment les query params)
  try {
    const order  = JSON.parse(pending)
    const age    = Date.now() - new Date(order.createdAt).getTime()
    const hash   = window.location.hash
    const isRoot = !hash || hash === "#/" || hash === "#" || hash === ""

    if (age < 30 * 60 * 1000 && isRoot) {
      window.location.hash = "#/payment-success"
    } else if (age >= 30 * 60 * 1000) {
      localStorage.removeItem("pendingStripeOrder")
      localStorage.removeItem("stripeOwnerUid")
      localStorage.removeItem("stripeSiteSlug")
    }
  } catch(e) {
    localStorage.removeItem("pendingStripeOrder")
  }
}

// ── Montage Vue ───────────────────────────────────────────────
// Toujours exécuté, même après modification du hash ci-dessus.
// Si hash = "#/payment-success", Vue Router charge directement
// le composant PaymentSuccess.vue sans rechargement supplémentaire.
const app = createApp(App)
app.use(router)
app.mount("#app")
