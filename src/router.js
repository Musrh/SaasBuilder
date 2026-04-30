// ============================================================
//  SaasBuilder/src/router.js — ROUTER COMPLET FINAL (CORRIGÉ)
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

// Durée d'essai gratuit du Builder après création du premier slug
const FREE_TRIAL_DAYS = 30
const FREE_TRIAL_MS   = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000

// ── Attendre Firebase Auth (auth.currentUser = null au 1er tick) ──
const waitForAuth = () => new Promise(resolve => {
  const auth = getAuth()
  if (auth.currentUser !== null) { resolve(auth.currentUser); return }
  const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(user) })
})

// ── Convertit un champ Firestore (Timestamp | number | Date | string) en ms ──
const toMillis = (v) => {
  if (!v) return 0
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const t = Date.parse(v)
    return isNaN(t) ? 0 : t
  }
  if (v instanceof Date) return v.getTime()
  if (typeof v.toMillis === "function") return v.toMillis()      // Firestore Timestamp
  if (typeof v.seconds === "number")    return v.seconds * 1000  // Timestamp brut
  return 0
}

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

          // /saasgenerator : Pro payé OU essai gratuit de 30 jours
          if (to.name === "saasgenerator") {
            const isPro      = d.plan && d.plan !== "free"
            const isPaid     = d.paye === true
            const exp        = d.expiry
            const notExpired = !exp || exp === 0 || exp > Date.now()
            const proAccess  = isPro && isPaid && notExpired

            // Essai gratuit : 30 jours à partir de la création du 1er slug.
            // On lit slugCreatedAt (préféré), sinon slugSetAt, sinon createdAt
            // en dernier recours pour les anciens comptes.
            const slugStart  = toMillis(d.slugCreatedAt)
                            || toMillis(d.slugSetAt)
                            || toMillis(d.createdAt)
            const trialEnd   = slugStart ? slugStart + FREE_TRIAL_MS : 0
            const inTrial    = !!d.publishedSlug && slugStart > 0 && Date.now() < trialEnd

            if (!proAccess && !inTrial) {
              // Essai expiré / pas Pro → on renvoie vers la sélection de plan
              // ⚠️ FIX antérieur : next({ name: "/saasgenerator" }) était cassé
              // ("/saasgenerator" est un PATH, pas un NAME) → la navigation
              // échouait silencieusement et l'utilisateur restait bloqué.
              next({ name: "home" }); return
            }
          }
        }
      } catch(e) {
        console.error("Router guard:", e.message)
        // En cas d'erreur Firestore, on laisse passer plutôt que de
        // bloquer l'utilisateur sur une page blanche.
        next(); return
      }
    }

    next(); return
  }

  // Route publique
  next()
})

export default router
