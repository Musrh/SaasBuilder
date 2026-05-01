import { createApp } from "vue"
import App from "./App.vue"
import router from "./router.js"

const app = createApp(App)
app.use(router)

// ── Interception retour Stripe ────────────────────────────────
const params  = new URLSearchParams(window.location.search)
const pending = localStorage.getItem("pendingStripeOrder")

if (params.get("stripe") === "ok" && pending) {
  try {
    const order = JSON.parse(pending)
    const age   = Date.now() - new Date(order.createdAt).getTime()

    if (age < 60 * 60 * 1000) {
      const slug = params.get("slug")
        || localStorage.getItem("stripeSiteSlug")
        || order.siteSlug
        || order.storeSlug
        || ""

      if (slug) localStorage.setItem("stripeSiteSlug", slug)

      // Nettoyer URL
      window.history.replaceState({}, "", window.location.pathname)

      // ✅ Navigation propre (history mode)
      router.replace("/payment-success")

    } else {
      // Expiré
      localStorage.removeItem("pendingStripeOrder")
      localStorage.removeItem("stripeOwnerUid")
      localStorage.removeItem("stripeSiteSlug")
    }
  } catch(e) {
    localStorage.removeItem("pendingStripeOrder")
  }
}

// ── Cas fallback mobile (sans query params)
else if (pending) {
  try {
    const order = JSON.parse(pending)
    const age   = Date.now() - new Date(order.createdAt).getTime()
    const path  = window.location.pathname

    // 👇 remplacer logique hash par path
    if (age < 30 * 60 * 1000 && path === "/") {
      router.replace("/payment-success")
    } else if (age >= 30 * 60 * 1000) {
      localStorage.removeItem("pendingStripeOrder")
      localStorage.removeItem("stripeOwnerUid")
      localStorage.removeItem("stripeSiteSlug")
    }
  } catch(e) {
    localStorage.removeItem("pendingStripeOrder")
  }
}

app.mount("#app")
