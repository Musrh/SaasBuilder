// ============================================================
//  SaasBuilder/src/router.js — ROUTER COMPLET FINAL
//
//  Toutes les routes de l'application SaasBuilder :
//  - App principale : Plans → Auth → Dashboard → Builder
//  - Sites publiés  : /site/:uid (SiteViewer public)
//  - Admin          : /admin (réservé aux admins)
//  - Paiements      : /payment-success, /payment-cancel
// ============================================================
import { createRouter, createWebHashHistory } from "vue-router"
import { getAuth }    from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

// ── Imports statiques (chargés au démarrage) ──────────────────
import PlanSelection from "./views/PlanSelection.vue"
import AuthForm      from "./views/AuthForm.vue"
import Dashboard     from "./views/Dashboard.vue"
import SiteViewer    from "./views/SiteViewer.vue"
import NotFound      from "./views/NotFound.vue"

// ── Emails admin (même liste que AuthForm.vue) ────────────────
const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

const routes = [

  // ════════════════════════════════════════════════════════════
  //  APP PRINCIPALE — Funnel Plans → Auth → Dashboard → Builder
  // ════════════════════════════════════════════════════════════

  // Choix du plan (page d'accueil)
  {
    path: "/",
    name: "home",
    component: PlanSelection,
  },

  // Connexion / Inscription
  {
    path: "/auth",
    name: "auth",
    component: AuthForm,
  },

  // Dashboard propriétaire (plan FREE ou en attente)
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },

  // Builder SaasGenerator (plan Pro + payé)
  {
    path: "/saasgenerator",
    name: "saasgenerator",
    component: () => import("./views/SaasGenerator.vue"),
    meta: { requiresAuth: true },
  },

  // ════════════════════════════════════════════════════════════
  //  SITES PUBLIÉS — accessibles par tous (public)
  // ════════════════════════════════════════════════════════════

  // Store public : /site/mrstore  ou  /site/<uid>
  {
    path: "/site/:uid",
    name: "site",
    component: SiteViewer,
    props: true,
  },

  // Auth client du store (inscription/connexion visiteur)
  {
    path: "/store-auth",
    name: "store-auth",
    component: () => import("./views/StoreAuth.vue"),
  },

  // ════════════════════════════════════════════════════════════
  //  PAIEMENTS — retour Stripe après achat
  // ════════════════════════════════════════════════════════════

  {
    path: "/payment-success",
    name: "payment-success",
    component: () => import("./views/PaymentSuccess.vue"),
  },
  {
    path: "/payment-cancel",
    name: "payment-cancel",
    component: () => import("./views/PaymentCancel.vue"),
  },

  // Retour Stripe pour abonnement SaasBuilder
  {
    path: "/success",
    name: "success",
    component: () => import("./views/Success.vue"),
  },
  {
    path: "/cancel",
    name: "cancel",
    component: () => import("./views/Cancel.vue"),
  },

  // ════════════════════════════════════════════════════════════
  //  ADMIN — réservé aux emails admins
  // ════════════════════════════════════════════════════════════

  {
    path: "/admin",
    name: "admin",
    component: () => import("./views/Admin.vue"),
    meta: { requiresAdmin: true },
  },

  // ════════════════════════════════════════════════════════════
  //  AUTRES PAGES
  // ════════════════════════════════════════════════════════════

  // Commandes du store (propriétaire connecté)
  {
    path: "/orders",
    name: "orders",
    component: () => import("./views/Orders.vue"),
    meta: { requiresAuth: true },
  },

  // Catalogue produits (propriétaire)
  {
    path: "/products",
    name: "products",
    component: () => import("./views/ListeProducts.vue"),
    meta: { requiresAuth: true },
  },

  // Plans tarifaires (page marketing)
  {
    path: "/plans",
    name: "plans",
    component: () => import("./views/Plans.vue"),
  },

  // Panier (ancien flow)
  {
    path: "/panier",
    name: "panier",
    component: () => import("./views/Panier.vue"),
  },

  // 404
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFound,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ════════════════════════════════════════════════════════════
//  GUARD GLOBAL — Protection des routes
// ════════════════════════════════════════════════════════════
router.beforeEach(async (to, from, next) => {
  const auth = getAuth()
  const user = auth.currentUser

  // ── Route admin : vérifier email ──────────────────────────
  if (to.meta.requiresAdmin) {
    if (!user) {
      next({ name: "auth" })
      return
    }
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      next({ name: "not-found" })
      return
    }
    next()
    return
  }

  // ── Routes protégées : connexion requise ──────────────────
  if (to.meta.requiresAuth) {
    if (!user) {
      next({ name: "auth", query: { redirect: to.fullPath } })
      return
    }

    // Sur /dashboard ou /saasgenerator : vérifier le statut du compte
    if (to.name === "dashboard" || to.name === "saasgenerator") {
      try {
        const db   = getFirestore()
        const snap = await getDoc(doc(db, "users", user.uid))
        if (snap.exists()) {
          const d      = snap.data()
          const active = d.active !== false   // true par défaut

          // Compte désactivé → retour auth
          if (!active) {
            await auth.signOut()
            next({ name: "auth" })
            return
          }

          // /saasgenerator réservé aux plans Pro payés et non expirés
          if (to.name === "saasgenerator") {
            const isPro    = d.plan !== "free"
            const isPaid   = d.paye === true
            const notExpired = !d.expiry || d.expiry > Date.now()
            if (!isPro || !isPaid || !notExpired) {
              next({ name: "dashboard" })
              return
            }
          }
        }
      } catch (e) {
        console.error("Router guard:", e.message)
      }
    }

    next()
    return
  }

  // Route publique → toujours accessible
  next()
})

export default router
