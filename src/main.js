import { createApp } from "vue"
import App from "./App.vue"
import router from "./router.js"

const app = createApp(App)
app.use(router)

handleStartup()
app.mount("#app")

function handleStartup() {
  var params  = new URLSearchParams(window.location.search)
  var pending = localStorage.getItem("pendingStripeOrder")

  if (params.get("stripe") === "ok" && pending) {
    handleStripeReturn(params, pending)
    return
  }

  if (pending) {
    handleMobilePending(pending)
    return
  }

  var redirectTo = params.get("redirect")
  if (redirectTo) {
    restoreRedirect(redirectTo)
  }
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

function handleMobilePending(pending) {
  try {
    var order = JSON.parse(pending)
    var age   = Date.now() - new Date(order.createdAt).getTime()

    // Ne jamais écraser un hash qui pointe déjà vers une page de paiement :
    // c'est exactement ce qui supprimait tous les paramètres (attempt,
    // session_id, backend...) avant même que Vue Router les lise.
    var hash = window.location.hash || ""
    var hashAlreadyTargetsPayment =
      hash.indexOf("#/payment-success") === 0 || hash.indexOf("#/payment-cancel") === 0

    if (hashAlreadyTargetsPayment) {
      return
    }

    if (age < 1800000 && window.location.pathname === "/") {
      router.replace("/payment-success")
    } else if (age >= 1800000) {
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
