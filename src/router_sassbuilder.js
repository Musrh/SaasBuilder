// ============================================================
// router.js — Sassbuilder
// ============================================================
import { createRouter, createWebHashHistory } from "vue-router"
import { auth } from "./firebase"

import PlanSelection from "./views/PlanSelection.vue"
import AuthForm from "./views/AuthForm.vue"
import Dashboard from "./views/Dashboard.vue"

const routes = [
  {
    path: "/",
    name: "home",
    component: PlanSelection
  },
  {
    path: "/auth",
    name: "auth",
    component: AuthForm
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
    meta: { requiresAuth: true }
  },

  {
    path: "/panier",
    name: "panier",
    component: () => import("./views/Panier.vue"),
    meta: { requiresAuth: true }
  },

  {
    path: "/success",
    name: "success",
    component: () => import("./views/Success.vue")
  },

  {
    path: "/cancel",
    name: "cancel",
    component: () => import("./views/Cancel.vue")
  },

  {
    path: "/builder1",
    component: () => import("./views/Builder1.vue")
  },
  {
    path: "/builder2",
    component: () => import("./views/Builder.vue")
  },
  {
    path: "/builder3",
    component: () => import("./views/Builder3.vue")
  },

  // fallback
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 🔐 attendre Firebase correctement
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

  // pages protégées
  if (to.meta.requiresAuth && !user) {
    next({ name: "auth", query: { redirect: to.fullPath } })
    return
  }

  // si déjà connecté → éviter retour sur auth
  if (to.name === "auth" && user) {
    next({ name: "dashboard" })
    return
  }

  next()
})

export default router
