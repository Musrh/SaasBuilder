// ============================================================
//  src/router.js — Sassbuilder
// ============================================================
import { createRouter, createWebHashHistory } from "vue-router"
import { auth, db } from "./firebase"
import { doc, getDoc } from "firebase/firestore"

import PlanSelection from "./views/PlanSelection.vue"
import AuthForm      from "./views/AuthForm.vue"
import Panier        from "./views/Panier.vue"
import Success       from "./views/Success.vue"
import Cancel        from "./views/Cancel.vue"
import Dashboard     from "./views/Dashboard.vue"

// ROUTES
const routes = [
  { path: "/",          name: "home",      component: PlanSelection },
  { path: "/auth",      name: "auth",      component: AuthForm },
  { path: "/panier",    name: "panier",    component: Panier },
  { path: "/success",   name: "success",   component: Success },
  { path: "/cancel",    name: "cancel",    component: Cancel },
  { path: "/dashboard", name: "dashboard", component: Dashboard },
  { path: "/:pathMatch(.*)*", redirect: "/" },
]

// ROUTER
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// 🔐 ATTEND AUTH READY (IMPORTANT)
function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe()
      resolve(user)
    })
  })
}

// 🔒 GUARD GLOBAL
router.beforeEach(async (to, from, next) => {
  const user = await getCurrentUser()

  // 🔐 Routes protégées
  if (["dashboard", "panier"].includes(to.name)) {
    if (!user) {
      next({ name: "auth", query: { redirect: to.fullPath } })
      return
    }
  }

  // 📦 Vérification abonnement
  if (to.name === "dashboard" && user) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid))

      if (snap.exists()) {
        const d = snap.data()

        const expired = (d.expiry || 0) < Date.now()
        const notPaid = !d.paye

        if (d.plan !== "free" && (expired || notPaid)) {
          next({
            name: "panier",
            query: {
              plan: d.plan,
              price: d.plan === "pro" ? 5 : 10
            }
          })
          return
        }
      }

    } catch (e) {
      console.error("Erreur Firestore:", e)
    }
  }

  next()
})

export default router
