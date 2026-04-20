// ============================================================
//  SaasBuilder/src/main.js
// ============================================================
import { createApp } from "vue"
import App    from "./App.vue"
import router from "./router.js"

const app = createApp(App)
app.use(router)

// ── Détection retour Stripe AVANT le montage de l'app ────────
// Stripe supprime le # et redirige vers :
//   https://musrh.github.io/SaasBuilder/?stripe=ok&slug=mrstore
// On intercepte ici, AVANT que Vue-Router charge une route.
;(() => {
  const params  = new URLSearchParams(window.location.search)
  const pending = localStorage.getItem("pendingStripeOrder")

  if (params.get("stripe") === "ok" && pending) {
    try {
      const order = JSON.parse(pending)
      const age   = Date.now() - new Date(order.createdAt).getTime()
      if (age < 60 * 60 * 1000) {   // moins d'1 heure
        // Récupérer le slug
        const slug = params.get("slug")
                  || localStorage.getItem("stripeSiteSlug")
                  || order.siteSlug || order.storeSlug || ""
        if (slug) localStorage.setItem("stripeSiteSlug", slug)
        // Nettoyer le ?stripe=ok de l'URL sans recharger
        window.history.replaceState({}, "", window.location.pathname)
        // Injecter le hash pour que Vue-Router charge /payment-success
        window.location.hash = "#/payment-success"
        // Arrêter ici — la page va se recharger avec le bon hash
        return
      }
    } catch(e) {}
    // Commande trop vieille → nettoyer
    localStorage.removeItem("pendingStripeOrder")
    localStorage.removeItem("stripeOwnerUid")
    localStorage.removeItem("stripeSiteSlug")
    return
  }

  // ── Cas 2 : pendingStripeOrder existant sans ?stripe=ok ──────
  // (ex: l'utilisateur revient manuellement sur la page)
  if (pending) {
    try {
      const order = JSON.parse(pending)
      const age   = Date.now() - new Date(order.createdAt).getTime()
      if (age < 30 * 60 * 1000) {
        // Vérifier qu'on est bien sur la page racine (retour Stripe probable)
        const hash = window.location.hash
        const isRoot = !hash || hash === "#/" || hash === "#"
        if (isRoot) {
          window.location.hash = "#/payment-success"
          return
        }
      } else {
        localStorage.removeItem("pendingStripeOrder")
        localStorage.removeItem("stripeOwnerUid")
        localStorage.removeItem("stripeSiteSlug")
      }
    } catch(e) {
      localStorage.removeItem("pendingStripeOrder")
    }
  }
})()

app.mount("#app")
