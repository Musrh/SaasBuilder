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

const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

// Attend que Firebase Auth ait resolu l'utilisateur courant
const waitForAuth = () => new Promise(resolve => {
  const auth = getAuth()
  if (auth.currentUser !== null) { resolve(auth.currentUser); return }
  const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(user) })
})

const routes = [
  // Routes de l'application principale
  { path: "/",           name: "home",       component: PlanSelection },
  { path: "/auth",       name: "auth",       component: AuthForm },
  { path: "/slug-setup", name: "slug-setup", component: SlugSetup,       meta: { requiresAuth: true } },
  { path: "/dashboard",  name: "dashboard",  component: Dashboard,       meta: { requiresAuth: true } },
  { path: "/#/saasgenerator", name: "saasgenerator", component: Saasgenerator, meta: { requiresAuth: true } },

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

  // Route slug conviviale — ex: /mrstore => SiteViewer({ slug: "mrstore" })
  // Placee AVANT le catch-all, APRES toutes les routes specifiques.

  {
  path: "/:slug((?!auth$|dashboard$|admin$|orders$|slug-setup$|saasgenerator$|site$|payment-success$|payment-cancel$)[a-z0-9][a-z0-9-]*)",
  name: "slug-site",
  component: SiteViewer,
  props: route => ({ slug: route.params.slug }),
},

  // Catch-all 404
  { path: "/:pathMatch(.*)*", name: "not-found", component: NotFound },
]

const router = createRouter({
  history: createWebHashHistory(),
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

    // Saasgenerator : acces libre pour tout utilisateur connecte
    if (to.name === "saasgenerator") {
      next(); return
    }

    // Verifications supplementaires pour dashboard / slug-setup uniquement
    if (to.name === "dashboard" || to.name === "slug-setup") {
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
        }
        // Pas encore de document Firestore (compte tout neuf) : on laisse passer
      } catch (e) {
        console.error("Router guard Firestore:", e.message)
        next(); return
      }
    }

    next(); return
  }

  // Route publique
  next()
})

export default router
