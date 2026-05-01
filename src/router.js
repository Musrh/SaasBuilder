// SaasBuilder/src/router.js
import { createRouter, createWebHistory } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

import PlanSelection from "./views/PlanSelection.vue"
import SlugSetup     from "./views/Slugsetup.vue"
import AuthForm      from "./views/AuthForm.vue"
import Dashboard     from "./views/Dashboard.vue"
import SiteViewer    from "./views/Siteviewer.vue"
import NotFound      from "./views/NotFound.vue"

const ADMIN_EMAILS  = ["musmamon@gmail.com", "musrh@gmail.com"]
const FREE_TRIAL_MS = 30 * 24 * 60 * 60 * 1000   // 30 jours en ms

// Attend que Firebase Auth ait resolu l'utilisateur courant
const waitForAuth = () => new Promise(resolve => {
  const auth = getAuth()
  if (auth.currentUser !== null) { resolve(auth.currentUser); return }
  const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(user) })
})

// Convertit un champ Firestore (Timestamp | number | Date | string) en millisecondes
const toMillis = (v) => {
  if (!v) return 0
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const t = Date.parse(v)
    return isNaN(t) ? 0 : t
  }
  if (v instanceof Date) return v.getTime()
  if (typeof v.toMillis === "function") return v.toMillis()
  if (typeof v.seconds === "number") return v.seconds * 1000
  return 0
}

const routes = [
  // Routes de l'application principale
  { path: "/",           name: "home",       component: PlanSelection },
  { path: "/auth",       name: "auth",       component: AuthForm },
  { path: "/slug-setup", name: "slug-setup", component: SlugSetup,  meta: { requiresAuth: true } },
  { path: "/dashboard",  name: "dashboard",  component: Dashboard,  meta: { requiresAuth: true } },
  {
    path: "/saasgenerator",
    name: "saasgenerator",
    component: () => import("./views/Saasgenerator.vue"),
    meta: { requiresAuth: true },
  },

  // Sites publies par UID Firestore direct (/site/:uid)
  { path: "/site/:uid", name: "site", component: SiteViewer, props: true },

  // Authentification client du store
  { path: "/store-auth", name: "store-auth", component: () => import("./views/Storeauth.vue") },

  // Pages de paiement
  { path: "/payment-success", name: "payment-success", component: () => import("./views/Paymentsuccess.vue") },
  { path: "/payment-cancel",  name: "payment-cancel",  component: () => import("./views/Paymentcancel.vue") },
  { path: "/success",         name: "success",         component: () => import("./views/Success.vue") },
  { path: "/cancel",          name: "cancel",          component: () => import("./views/Cancel.vue") },

  // Administration
  { path: "/admin",  name: "admin",  component: () => import("./views/Admin.vue"),  meta: { requiresAdmin: true } },
  { path: "/orders", name: "orders", component: () => import("./views/Orders.vue"), meta: { requiresAuth: true } },
  { path: "/panier", name: "panier", component: () => import("./views/Panier.vue") },

  // FIX : route slug conviviale — ex: /mrstore => SiteViewer({ slug: "mrstore" })
  // Placee AVANT le catch-all, APRES toutes les routes specifiques.
  // Seuls les slugs format [a-z0-9][a-z0-9-]* sont captured.
  {
    path: "/:slug([a-z0-9][a-z0-9-]*)",
    name: "slug-site",
    component: SiteViewer,
    props: (route) => ({ slug: route.params.slug }),
  },

  // Catch-all 404
  { path: "/:pathMatch(.*)*", name: "not-found", component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Guard de navigation global
router.beforeEach(async (to, from, next) => {

  // Route admin : verifie l'email
  if (to.meta.requiresAdmin) {
    const user = await waitForAuth()
    if (!user) { next({ name: "auth" }); return }
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      next({ name: "not-found" }); return
    }
    next(); return
  }

  // Routes protegees par authentification
  if (to.meta.requiresAuth) {
    const user = await waitForAuth()

    if (!user) {
      next({ name: "auth", query: { redirect: to.fullPath } })
      return
    }

    // Verifications supplementaires pour dashboard / builder / slug-setup
    if (to.name === "dashboard" || to.name === "saasgenerator" || to.name === "slug-setup") {
      try {
        const db   = getFirestore()
        const snap = await getDoc(doc(db, "users", user.uid))

        if (snap.exists()) {
          const d = snap.data()

          // Compte desactive
          if (d.active === false) {
            await getAuth().signOut()
            next({ name: "auth" }); return
          }

          // Pas de slug configure : rediriger vers slug-setup
          if (to.name === "saasgenerator" && !d.publishedSlug) {
            next({ name: "slug-setup" }); return
          }

          // Acces au builder
          if (to.name === "saasgenerator") {
            const plan = d.plan || "free"

            // ✅ Plan FREE avec slug → accès autorisé (fonctionnalités limitées)
            if (plan === "free") {
              // Autorisé — le builder gère lui-même les restrictions Free
              next(); return
            }

            // Plan payant → vérifier paiement et expiration
            const isPaid     = d.paye === true
            const exp        = d.expiry
            const notExpired = !exp || exp === 0 || exp > Date.now()

            if (isPaid && notExpired) {
              // Pro payé actif → accès complet
              next(); return
            }

            // Pro non payé ou expiré → dashboard pour renouveler
            next({ name: "dashboard" }); return
          }
        }
        // Pas encore de document Firestore (compte tout neuf) : on laisse passer
      } catch (e) {
        console.error("Router guard Firestore:", e.message)
        // Erreur Firestore : on laisse passer pour ne pas bloquer
        next(); return
      }
    }

    next(); return
  }

  // Route publique
  next()
})

export default router
