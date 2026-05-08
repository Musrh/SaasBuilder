// SaasBuilder/src/router.js
import { createRouter, createWebHashHistory } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

import PlanSelection  from "./views/PlanSelection.vue"
import SlugSetup      from "./views/Slugsetup.vue"
import AuthForm       from "./views/AuthForm.vue"
import Dashboard      from "./views/Dashboard.vue"
import SiteViewer     from "./views/Siteviewer.vue"
import NotFound       from "./views/NotFound.vue"
import Saasgenerator  from "./views/Saasgenerator.vue"

import Privacy  from "./views/Privacy-policy.vue"
import Remboursement  from "./views/Remboursement.vue"
import Conditions  from "./views/Conditions.vue"
import Mentions  from "./views/Mentions.vue"


const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

// Attente auth Firebase
const waitForAuth = () => new Promise(resolve => {
  const auth = getAuth()
  if (auth.currentUser) return resolve(auth.currentUser)

  const unsub = onAuthStateChanged(auth, user => {
    unsub()
    resolve(user)
  })
})

const routes = [
  // ======================
  // ROUTES PRINCIPALES
  // ======================
 // { path: "/", name: "home", component: PlanSelection },
  { path: "/", name: "auth", component: AuthForm },

  { path: "/privacy",component: Privacy },
  { path: "/remboursement", component: Remboursement },
  { path: "/conditions", component: Conditions },
  { path: "/mentions", component: Mentions },
 
  { path: "/slug-setup", name: "slug-setup", component: SlugSetup, meta: { requiresAuth: true } },
  { path: "/dashboard",  name: "dashboard",  component: Dashboard,  meta: { requiresAuth: true } },

  // ⚠️ Builder SaaS (DOIT rester accessible directement)
  { path: "/saasgenerator", name: "saasgenerator", component: Saasgenerator },

  // ======================
  // SITE PAR UID
  // ======================
  { path: "/site/:uid", name: "site", component: SiteViewer, props: true },

  // ======================
  // AUTH STORE CLIENT
  // ======================
  { path: "/store-auth", name: "store-auth", component: () => import("./views/Storeauth.vue") },

  // ======================
  // PAIEMENT
  // ======================
  { path: "/payment-success", name: "payment-success", component: () => import("./views/Paymentsuccess.vue") },
  { path: "/payment-cancel",  name: "payment-cancel",  component: () => import("./views/Paymentcancel.vue") },
  { path: "/success", name: "success", component: () => import("./views/Success.vue") },
  { path: "/cancel",  name: "cancel",  component: () => import("./views/Cancel.vue") },

  // ======================
  // ADMIN / ORDERS
  // ======================
  { path: "/admin",  name: "admin",  component: () => import("./views/Admin.vue"),  meta: { requiresAdmin: true } },
  { path: "/orders", name: "orders", component: () => import("./views/Orders.vue"), meta: { requiresAuth: true } },
  { path: "/panier", name: "panier", component: () => import("./views/Panier.vue") },

  // ======================
  // SLUG PUBLIC (IMPORTANT)
  // ======================
  {
    path: "/:slug([a-z0-9][a-z0-9-]*)",
    name: "slug-site",
    component: SiteViewer,
    props: route => ({ slug: route.params.slug }),
  },

  // ======================
  // 404
  // ======================
  { path: "/:pathMatch(.*)*", name: "not-found", component: NotFound },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ======================
// GLOBAL GUARD
// ======================
router.beforeEach(async (to, from, next) => {

  // ===== SAASGENERATOR — court-circuite waitForAuth pour éviter la race condition =====
  // Le composant gère lui-même l'auth via onAuthStateChanged
  if (to.name === "saasgenerator") return next()

  // ===== ADMIN =====
  if (to.meta.requiresAdmin) {
    const user = await waitForAuth()

    if (!user) return next({ name: "auth" })
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      return next({ name: "not-found" })
    }

    return next()
  }

  // ===== AUTH REQUIRED =====
  if (to.meta.requiresAuth) {
    const user = await waitForAuth()

    if (!user) {
      return next({ name: "auth", query: { redirect: to.fullPath } })
    }

    // SaaS builder toujours autorisé
    if (to.name === "saasgenerator") return next()

    // Vérif compte (dashboard + setup)
    if (to.name === "dashboard" || to.name === "slug-setup") {
      try {
        const db = getFirestore()
        const snap = await getDoc(doc(db, "users", user.uid))

        if (snap.exists() && snap.data().active === false) {
          await getAuth().signOut()
          return next({ name: "auth" })
        }
      } catch (e) {
        console.error("Router error:", e.message)
      }
    }

    return next()
  }

  // ===== PUBLIC =====
  return next()
})

export default router
