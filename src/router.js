// ============================================================
//  SaasBuilder/src/router.js — ROUTER COMPLET FINAL
// ============================================================
import { createRouter, createWebHashHistory } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

import PlanSelection from "./views/PlanSelection.vue"
import SlugSetup     from "./views/Slugsetup.vue"
import AuthForm      from "./views/AuthForm.vue"
import Dashboard     from "./views/Dashboard.vue"
import SiteViewer    from "./views/Siteviewer.vue"
import NotFound      from "./views/NotFound.vue"

const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

// ── Attendre Firebase Auth (auth.currentUser = null au 1er tick) ──
const waitForAuth = () => new Promise(resolve => {
  const auth = getAuth()
  if (auth.currentUser !== null) { resolve(auth.currentUser); return }
  const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(user) })
})

const routes = [
  // ── App principale ──────────────────────────────────────────
  { path: "/",             name: "home",            component: PlanSelection },
  { path: "/auth",         name: "auth",            component: AuthForm },
  { path: "/slug-setup",   name: "slug-setup",      component: SlugSetup,    meta: { requiresAuth: true } },
  { path: "/dashboard",    name: "dashboard",       component: Dashboard,    meta: { requiresAuth: true } },
  {
    path: "/saasgenerator",
    name: "saasgenerator",
    component: () => import("./views/Saasgenerator.vue"),
    meta: { requiresAuth: true },
  },

  // ── Sites publiés ───────────────────────────────────────────
  { path: "/site/:uid",    name: "site",            component: SiteViewer, props: true },
  { path: "/store-auth",   name: "store-auth",      component: () => import("./views/Storeauth.vue") },

  // ── Paiements ───────────────────────────────────────────────
  { path: "/payment-success", name: "payment-success", component: () => import("./views/Paymentsuccess.vue") },
  { path: "/payment-cancel",  name: "payment-cancel",  component: () => import("./views/Paymentcancel.vue") },
  { path: "/success",         name: "success",         component: () => import("./views/Success.vue") },
  { path: "/cancel",          name: "cancel",          component: () => import("./views/Cancel.vue") },

  // ── Admin ────────────────────────────────────────────────────
  { path: "/admin",        name: "admin",           component: () => import("./views/Admin.vue"), meta: { requiresAdmin: true } },

  // ── Autres ──────────────────────────────────────────────────
  { path: "/orders",       name: "orders",          component: () => import("./views/Orders.vue"),        meta: { requiresAuth: true } },
//  { path: "/products",     name: "products",        component: () => import("./views/ListeProducts.vue"), meta: { requiresAuth: true } },
 // { path: "/plans",        name: "plans",           component: () => import("./views/Plans.vue") },
  { path: "/panier",       name: "panier",          component: () => import("./views/Panier.vue") },
  { path: "/:pathMatch(.*)*", name: "not-found",    component: NotFound },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ════════════════════════════════════════════════════════════
//  GUARD GLOBAL
// ════════════════════════════════════════════════════════════
router.beforeEach(async (to, from, next) => {

  // ── Admin ──────────────────────────────────────────────────
  if (to.meta.requiresAdmin) {
    const user = await waitForAuth()
    if (!user) { next({ name: "auth" }); return }
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      next({ name: "not-found" }); return
    }
    next(); return
  }

  // ── Routes protégées ───────────────────────────────────────
  if (to.meta.requiresAuth) {
    const user = await waitForAuth()

    if (!user) {
      // Non connecté → /auth avec redirect param
      next({ name: "auth", query: { redirect: to.fullPath } })
      return
    }

    // Vérifier statut compte pour dashboard / builder
    if (to.name === "dashboard" || to.name === "saasgenerator" || to.name === "slug-setup") {
      try {
        const db   = getFirestore()
        const snap = await getDoc(doc(db, "users", user.uid))

        if (snap.exists()) {
          const d = snap.data()

          // Compte désactivé
          if (d.active === false) {
            await getAuth().signOut()
            next({ name: "auth" }); return
          }

          // Pas encore de slug → slug-setup d'abord
          if (to.name === "saasgenerator" && !d.publishedSlug) {
            next({ name: "slug-setup" }); return
          }

          // /saasgenerator réservé Pro payé non expiré
          if (to.name === "saasgenerator") {
            const isPro      = d.plan !== "free"
            const isPaid     = d.paye === true
            const exp        = d.expiry
            const notExpired = !exp || exp === 0 || exp > Date.now()
            if (!isPro || !isPaid || !notExpired) {
              next({ name: "/saasgenerator" }); return
            }
          }
        }
      } catch(e) {
        console.error("Router guard:", e.message)
      }
    }

    next(); return
  }

  // Route publique
  next()
})

export default router
