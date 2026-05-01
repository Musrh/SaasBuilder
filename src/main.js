import { createApp } from "vue"
import App from "./App.vue"
import router from "./router.js"

const app = createApp(App)
app.use(router)

const params  = new URLSearchParams(window.location.search)
const pending = localStorage.getItem("pendingStripeOrder")

if (params.get("stripe") === "ok" && pending) {
  // Retour Stripe avec confirmation de paiement
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

      window.history.replaceState({}, "", window.location.pathname)
      router.replace("/payment-success")
    } else {
      localStorage.removeItem("pendingStripeOrder")
      localStorage.removeItem("stripeOwnerUid")
      localStorage.removeItem("stripeSiteSlug")
    }
  } catch(e) {
    localStorage.removeItem("pendingStripeOrder")
  }
} else if (pending) {
  // Fallback mobile Stripe sans query params
  try {
    const order = JSON.parse(pending)
    const age   = Date.now() - new Date(order.createdAt).getTime()
    const path  = window.location.pathname

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
} else {
  // FIX : restauration apres redirection 404.html (GitHub Pages / Cloudflare)
  // Flux : mronlinestores.com/mrstore → 404.html → /?redirect=%2Fmrstore
  // Ce bloc lit ?redirect= et rejoue la navigation proprement.
  const redirectTo = params.get("redirect")

  if (redirectTo) {
    const cleanSearch = window.location.search
      .replace(/[?&]redirect=[^&]*/g, "")
      .replace(/^&/, "?")
      .replace(/^\?$/, "")

    const cleanUrl = redirectTo + cleanSearch

    window.history.replaceState({}, "", cleanUrl)

    router.isReady().then(() => {
      router.replace(cleanUrl)
    })
  }
}

app.mount("#app")
