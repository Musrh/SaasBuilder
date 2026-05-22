// SaasBuilder/src/router.js
import { createRouter, createWebHashHistory } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

import Guide from "./views/guide.vue"
import SlugSetup      from "./views/Slugsetup.vue"
import AuthForm       from "./views/AuthForm.vue"
import Dashboard      from "./views/Dashboard.vue"
import SiteViewer     from "./views/Siteviewer.vue"
import NotFound       from "./views/NotFound.vue"
import Saasgenerator  from "./views/Saasgenerator.vue"

import Privacy        from "./views/PrivacyPolicy.vue"
import Remboursement  from "./views/Remboursement.vue"
import Conditions     from "./views/Conditions.vue"
import Mentions       from "./views/Mentions.vue"
import Confidentialite from "./views/Confidentialite.vue"

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
  // PAGE D'ACCUEIL = AuthForm
  // ======================
  { path: "/", name: "auth", component: AuthForm },

  //Page Guide Saas
  { path: "/guide", name: "guide", component: Guide },
  
  // ======================
  // PAGES LÉGALES (publiques)
  // ======================
  { path: "/privacy",          name: "privacy",          component: Privacy },
  { path: "/remboursement",    name: "remboursement",    component: Remboursement },
  { path: "/conditions",       name: "conditions",       component: Conditions },
  { path: "/mentions",         name: "mentions",         component: Mentions },
  { path: "/confidentialite",  name: "confidentialite",  component: Confidentialite },

  // ======================
  // ESPACE PROPRIÉTAIRE
  // ======================
  { path: "/slug-setup",    name: "slug-setup",    component: SlugSetup,    meta: { requiresAuth: true } },
  { path: "/dashboard",     name: "dashboard",     component: Dashboard,    meta: { requiresAuth: true } },
  { path: "/orders",        name: "orders",        component: () => import("./views/Orders.vue"), meta: { requiresAuth: true } },

  // ⚠️ Builder SaaS — gère son auth en interne
  { path: "/saasgenerator", name: "saasgenerator", component: Saasgenerator },

  // ======================
  // ADMIN
  // ======================
  { path: "/admin",         name: "admin",         component: () => import("./views/Admin.vue"),        meta: { requiresAdmin: true } },
 // { path: "/admin/restore", name: "admin-restore", component: () => import("./views/AdminRestore.vue"), meta: { requiresAdmin: true } },

  // ======================
  // STORE CLIENT
  // ======================
  { path: "/site/:uid",   name: "site",       component: SiteViewer, props: true },
  { path: "/store-auth",  name: "store-auth", component: () => import("./views/Storeauth.vue") },
  { path: "/panier",      name: "panier",     component: () => import("./views/Panier.vue") },

  // ======================
  // PAIEMENT
  // ======================
  { path: "/payment-success", name: "payment-success", component: () => import("./views/Paymentsuccess.vue") },
  { path: "/payment-cancel",  name: "payment-cancel",  component: () => import("./views/Paymentcancel.vue") },
  { path: "/success",         name: "success",         component: () => import("./views/Success.vue") },
  { path: "/cancel",          name: "cancel",          component: () => import("./views/Cancel.vue") },

  // ======================
  // SLUG PUBLIC
  // ⚠️ Doit rester AVANT 404 et APRÈS toutes les routes nommées
  // ======================
  {
    path: "/:slug([a-z0-9][a-z0-9-]*)",
    name: "slug-site",
    component: SiteViewer,
    props: route => ({ slug: route.params.slug }),
    beforeEnter: (to) => {
      // Bloquer les slugs qui correspondent à des routes internes
      const RESERVED = ["privacy","remboursement","conditions","mentions",
                        "confidentialite","dashboard","admin","saasgenerator",
                        "orders","panier","success","cancel","store-auth",
                        "slug-setup","site","payment-success","payment-cancel"]
      if (RESERVED.includes(to.params.slug)) return { name: "not-found" }
    }
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

  // ===== SAASGENERATOR — accès direct sans waitForAuth =====
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

    // Vérif compte suspendu (dashboard + setup)
    if (to.name === "dashboard" || to.name === "slug-setup") {
      try {
        const db   = getFirestore()
        const snap = await getDoc(doc(db, "users", user.uid))
        if (snap.exists() && snap.data().active === false) {
          // Ne pas signOut — laisser AuthForm gérer la suspension
          return next({ name: "auth" })
        }
      } catch(e) {
        console.error("Router error:", e.message)
      }
    }

    return next()
  }

  // ===== PUBLIC =====
  return next()
})

export default router
