// SaasBuilder/src/router.js
import { createRouter, createWebHistory } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

import PlanSelection from "./views/PlanSelection.vue"
import SlugSetup from "./views/Slugsetup.vue"
import AuthForm from "./views/AuthForm.vue"
import Dashboard from "./views/Dashboard.vue"
import SiteViewer from "./views/Siteviewer.vue"
import NotFound from "./views/NotFound.vue"

const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]
const FREE_TRIAL_MS = 30 * 24 * 60 * 60 * 1000

const waitForAuth = () =>
  new Promise((resolve) => {
    const auth = getAuth()

    if (auth.currentUser) {
      resolve(auth.currentUser)
      return
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })

const toMillis = (v) => {
  if (!v) return 0
  if (typeof v === "number") return v

  if (typeof v === "string") {
    const t = Date.parse(v)
    return Number.isNaN(t) ? 0 : t
  }

  if (v instanceof Date) return v.getTime()
  if (typeof v.toMillis === "function") return v.toMillis()
  if (typeof v.seconds === "number") return v.seconds * 1000

  return 0
}

const getUserSlug = (data = {}) => {
  return (
    data.publishedSlug ||
    data.slug ||
    data.siteSlug ||
    data.storeSlug ||
    ""
  )
}

const hasValidBuilderAccess = (data = {}) => {
  const slug = getUserSlug(data)

  if (!slug) return false

  const plan = String(data.plan || "free").toLowerCase()

  // Plan free : autorisé si slug déjà configuré
  if (plan === "free") {
    return true
  }

  // Plan pro/payant : paye === true + expiry null/0 = non expiré
  const isPaid = data.paye === true || data.paid === true
  const expiryMs = toMillis(data.expiry)
  const notExpired = !data.expiry || expiryMs === 0 || expiryMs > Date.now()

  if (plan !== "free" && isPaid && notExpired) {
    return true
  }

  // Ancien système : essai gratuit 30 jours
  const slugStart =
    toMillis(data.slugCreatedAt) ||
    toMillis(data.slugSetAt) ||
    toMillis(data.createdAt)

  const inTrial = slugStart === 0 || Date.now() < slugStart + FREE_TRIAL_MS

  return !!slug && inTrial
}

const SaasGeneratorView = () => import("./views/Saasgenerator.vue")

const routes = [
  // Routes principales
  { path: "/", name: "home", component: PlanSelection },
  { path: "/auth", name: "auth", component: AuthForm },

  {
    path: "/slug-setup",
    name: "slug-setup",
    component: SlugSetup,
    meta: { requiresAuth: true },
  },

  {
    path: "/dashboard",
    name: "dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },

  // Nouvelle URL professionnelle du Builder
  {
    path: "/builder",
    name: "builder",
    component: SaasGeneratorView,
    meta: { requiresAuth: true, requiresSlug: true, requiresBuilderAccess: true },
  },

  // Ancienne URL gardée pour compatibilité
  {
    path: "/saasgenerator",
    name: "saasgenerator",
    redirect: { name: "builder" },
    meta: { requiresAuth: true },
  },

  // Sites publiés par UID Firestore direct
  {
    path: "/site/:uid",
    name: "site",
    component: SiteViewer,
    props: true,
  },

  // Authentification client du store
  {
    path: "/store-auth",
    name: "store-auth",
    component: () => import("./views/Storeauth.vue"),
  },

  // Paiement
  {
    path: "/payment-success",
    name: "payment-success",
    component: () => import("./views/Paymentsuccess.vue"),
  },
  {
    path: "/payment-cancel",
    name: "payment-cancel",
    component: () => import("./views/Paymentcancel.vue"),
  },
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

  // Administration
  {
    path: "/admin",
    name: "admin",
    component: () => import("./views/Admin.vue"),
    meta: { requiresAdmin: true },
  },
  {
    path: "/orders",
    name: "orders",
    component: () => import("./views/Orders.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/panier",
    name: "panier",
    component: () => import("./views/Panier.vue"),
  },

  // Site public par slug ou email encodé
  // Exemples :
  // /ma-boutique
  // /user%40gmail.com
  {
    path: "/:slugOrEmail",
    name: "public-site",
    component: SiteViewer,
    props: (route) => {
      const value = decodeURIComponent(String(route.params.slugOrEmail || ""))

      if (value.includes("@")) {
        return { email: value }
      }

      return { slug: value }
    },
  },

  // Catch-all 404
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFound,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = getAuth()

  // Admin
  if (to.meta.requiresAdmin) {
    const user = await waitForAuth()

    if (!user) {
      return {
        name: "auth",
        query: { redirect: to.fullPath },
      }
    }

    const email = user.email?.toLowerCase()

    if (!email || !ADMIN_EMAILS.includes(email)) {
      return { name: "not-found" }
    }

    return true
  }

  // Routes protégées
  if (to.meta.requiresAuth) {
    const user = await waitForAuth()

    if (!user) {
      return {
        name: "auth",
        query: { redirect: to.fullPath },
      }
    }

    try {
      const db = getFirestore()
      const snap = await getDoc(doc(db, "users", user.uid))

      if (!snap.exists()) {
        if (to.meta.requiresSlug || to.meta.requiresBuilderAccess) {
          return { name: "slug-setup" }
        }

        return true
      }

      const data = snap.data()

      if (data.active === false) {
        await auth.signOut()
        return { name: "auth" }
      }

      const slug = getUserSlug(data)

      // Builder interdit tant que le slug n'est pas configuré
      if (to.meta.requiresSlug && !slug) {
        return { name: "slug-setup" }
      }

      // Accès Builder fiable : free/pro + expiry null accepté
      if (to.meta.requiresBuilderAccess && !hasValidBuilderAccess(data)) {
        return { name: "home" }
      }

      return true
    } catch (e) {
      console.error("Router guard Firestore:", e)

      // Ne pas bloquer l'app si Firestore répond mal temporairement
      return true
    }
  }

  return true
})

export default router
