import { createApp } from "vue"
import App from "./App.vue"
import router from "./router.js"

const app = createApp(App)
app.use(router)

handleStartup()
app.mount("#app")

function handleStartup() {
  var params = new URLSearchParams(window.location.search)

  // Ancien format (avant le routage par hash) : ?stripe=ok au niveau
  // racine. Conservé uniquement par prudence pour d'éventuels liens
  // encore en circulation ; ne touche jamais à un hash déjà correct.
  var pending = localStorage.getItem("pendingStripeOrder")
  if (params.get("stripe") === "ok" && pending) {
    handleStripeReturn(params, pending)
    return
  }

  // Fallback GitHub Pages : restaure l'URL d'origine après le
  // rebond via 404.html?redirect=... (sert uniquement quand le
  // serveur ne trouve pas de fichier statique pour le chemin demandé).
  var redirectTo = params.get("redirect")
  if (redirectTo) {
    restoreRedirect(redirectTo)
  }

  // ── handleMobilePending a été retiré ──────────────────────────
  // Cette ancienne logique redirigeait vers /payment-success dès
  // qu'une commande était "en attente" ET que window.location.pathname
  // valait "/". Or en routage hash, le pathname vaut TOUJOURS "/" pour
  // TOUTES les routes (boutique, dashboard, etc.) — donc n'importe
  // quelle navigation, pas seulement un retour Stripe, se retrouvait
  // détournée vers /payment-success tant qu'une commande restait en
  // attente (test abandonné, onglet fermé avant confirmation...).
  // Le système de vérification par jeton + session_id dans
  // PaymentSuccess.vue rend ce filet de sécurité inutile de toute
  // façon : il n'y a plus besoin de deviner où rediriger l'utilisateur.
}

function handleStripeReturn(params, pending) {
  try {
    var order = JSON.parse(pending)
    var age   = Date.now() - new Date(order.createdAt).getTime()
    if (age < 3600000) {
      var slug = params.get("slug")
             || localStorage.getItem("stripeSiteSlug")
             || order.siteSlug
             || order.storeSlug
             || ""
      if (slug) {
        localStorage.setItem("stripeSiteSlug", slug)
      }

      // Ne jamais écraser un hash qui pointe déjà vers une page de paiement
      // avec ses propres paramètres (attempt, session_id...).
      var hash = window.location.hash || ""
      var hashAlreadyTargetsPayment =
        hash.indexOf("#/payment-success") === 0 || hash.indexOf("#/payment-cancel") === 0
      if (hashAlreadyTargetsPayment) {
        return
      }

      window.history.replaceState({}, "", window.location.pathname)
      router.replace("/payment-success")
    } else {
      clearPending()
    }
  } catch (e) {
    localStorage.removeItem("pendingStripeOrder")
  }
}

function restoreRedirect(redirectTo) {
  window.history.replaceState({}, "", redirectTo)
  router.isReady().then(function () {
    router.replace(redirectTo)
  })
}

function clearPending() {
  localStorage.removeItem("pendingStripeOrder")
  localStorage.removeItem("stripeOwnerUid")
  localStorage.removeItem("stripeSiteSlug")
}
