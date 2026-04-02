// ============================================================
//  SaasBuilder/src/router.js
//  Router de l'application PRINCIPALE (Sassbuilder)
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

const routes = [
  { path: "/",         name: "home",      component: PlanSelection },
  { path: "/auth",     name: "auth",      component: AuthForm      },
  { path: "/panier",   name: "panier",    component: Panier        },
  { path: "/success",  name: "success",   component: Success       },
  { path: "/cancel",   name: "cancel",    component: Cancel        },
  { path: "/dashboard",name: "dashboard", component: Dashboard     },
  { path: "/:pathMatch(.*)*", redirect: "/" },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ── Guard global : vérifier paye + expiry ─────────────────────
router.beforeEach(async (to, from, next) => {
  const user = auth.currentUser

  // Routes protégées
  if (to.name === "dashboard" || to.name === "panier") {
    if (!user) {
      next({ name: "auth", query: { redirect: to.fullPath } })
      return
    }
  }

  // Sur /dashboard : vérifier si plan expiré → renvoyer au panier
  if (to.name === "dashboard" && user) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid))
      if (snap.exists()) {
        const d = snap.data()
        if (d.plan !== "free" && (!d.paye || (d.expiry || 0) < Date.now())) {
          next({ name: "panier", query: { plan: d.plan, price: d.plan === "pro" ? 5 : 10 } })
          return
        }
      }
    } catch (e) { console.error(e) }
  }

  next()
})

export default router
