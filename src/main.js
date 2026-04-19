// ============================================================
//  SaasBuilder/src/main.js
//  Remplace TOUT le contenu de votre main.js existant
// ============================================================
import { createApp } from "vue"
import App    from "./App.vue"
import router from "./router.js"

const app = createApp(App)
app.use(router)

// ── Détection retour Stripe ───────────────────────────────────
// Stripe redirige vers l'URL racine (il supprime le #fragment)
// On détecte au démarrage via localStorage et on redirige
router.isReady().then(() => {
  const pending = localStorage.getItem("pendingStripeOrder")
  if (pending) {
    try {
      const order = JSON.parse(pending)
      const age   = Date.now() - new Date(order.createdAt).getTime()
      const route = router.currentRoute.value

      // Détecter retour Stripe depuis n'importe quelle page racine
      // (Stripe supprime le # donc on arrive sur home ou sur /site/*)
      const isReturnPage = route.name === "home" || route.path === "/" ||
                           !route.name // route inconnue = retour Stripe probable

      if (age < 30 * 60 * 1000 && isReturnPage) {
        // Moins de 30 min → c'est un retour de Stripe → afficher PaymentSuccess
        router.replace({ name: "payment-success" })
      } else if (age >= 30 * 60 * 1000) {
        // Trop vieux → nettoyer
        localStorage.removeItem("pendingStripeOrder")
        localStorage.removeItem("stripeOwnerUid")
        localStorage.removeItem("stripeSiteSlug")
      }
    } catch(e) {
      localStorage.removeItem("pendingStripeOrder")
    }
  }
})

app.mount("#app")
