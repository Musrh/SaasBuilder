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
const FREE_TRIAL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours

// ---------- Helpers ----------

// Attend que Firebase Auth ait résolu l'utilisateur courant
const waitForAuth = () => new Promise(resolve => {
  const auth = getAuth()
  if (auth.currentUser !== null) { resolve(auth.currentUser); return }
  const unsub = onAuthStateChanged(auth, user => { unsub(); resolve(user) })
})

// Convertit Timestamp | number | Date | string en millisecondes
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

// Récupère le profil Firestore d'un utilisateur
const getUserProfile = async (uid) => {
  try {
    const db = getFirestore()
    const snap = await getDoc(doc(db, "users", uid))
    return snap.exists() ? snap.data() : null
  } catch (e) {
    console.error("[router] getUserProfile error:", e)
    return null
  }
}

// L'utilisateur a-t-il accès au Builder ?
// - Admin : toujours
// - Pro payé non expiré : oui
// - Free dans la période d'essai (30j depuis createdAt) : oui
const canUseBuilder = (user, profile) => {
  if (!user || !profile) return false
  if (ADMIN_EMAILS.includes(user.email)) return true

  const now = Date.now()
  const expiry = toMillis(profile.expiry)
  const createdAt = toMillis(profile.createdAt)

  if (profile.paye === true) {
    if (!expiry || expiry === 0 || expiry > now) return true
  }

  // Essai gratuit
  if (createdAt && (now - createdAt) < FREE_TRIAL_MS) return true

  return false
}

// ---------- Routes ----------

const routes = [
  { path: "/",           name: "home",       component: PlanSelection },
  { path: "/auth",       name: "auth",       component: AuthForm },
  { path: "/slug-setup", name: "slug-setup", component: SlugSetup, meta: { requiresAuth: true } },
  { path: "/dashboard",  name: "dashboard",  component: Dashboard, meta: { requiresAuth: true } },

  // Route principale du Builder (URL professionnelle)
  {
    path: "/saasgenerator",
    name: "saasgenerator",
    component: () => import("./views/Saasgenerator.vue"),
    meta: { requiresAuth: true, requiresSlug: true, requiresBuilderAccess: true },
  },

  // Ancienne URL : redirige vers /builder
 // { path: "/saasgenerator", redirect: { name: "builder" } },

  // Sites publiés
  { path: "/site/:uid", name: "site", component: SiteViewer, props: true },

  // Auth client du store
  { path: "/store-auth", name: "store-auth", component: () => import("./views/Storeauth.vue") },

  // Paiement
  { path: "/payment-success", name: "payment-success", component: () => import("./views/Paymentsuccess.vue") },
  { path: "/payment-cancel",  name: "payment-cancel",  component: () => import("./views/Paymentcancel.vue") },
  { path: "/success",         name: "success",         component: () => import("./views/Success.vue") },
  { path: "/cancel",          name: "cancel",          component: () => import("./views/Cancel.vue") },

  // Public : monsaas.com/slug ou monsaas.com/email
  {
    path: "/:slugOrEmail((?!saasgenerator)[a-zA-Z0-9@._-]+)",
    name: "public-site",
    component: SiteViewer,
    props: route => ({ slugOrEmail: decodeURIComponent(route.params.slugOrEmail) }),
  },

  { path: "/:pathMatch(.*)*", name: "not-found", component: NotFound },
]

// ---------- Router ----------

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

// ---------- Migration des anciens hash URLs ----------
// Convertit /#/saasgenerator -> /builder, /#/dashboard -> /dashboard, etc.
if (typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
  const hashPath = window.location.hash.slice(1) // "/saasgenerator"
  const cleaned = hashPath === "/saasgenerator" ? "/builder" : hashPath
  window.history.replaceState(null, "", cleaned)
}

// ---------- Guard global ----------

router.beforeEach(async (to) => {
  // Routes publiques : pas de check
  if (!to.meta.requiresAuth) return true

  const user = await waitForAuth()
  if (!user) {
    return { name: "auth", query: { redirect: to.fullPath } }
  }

  // Charge le profil seulement si nécessaire
  const needsProfile = to.meta.requiresSlug || to.meta.requiresBuilderAccess
  const profile = needsProfile ? await getUserProfile(user.uid) : null

  // Slug requis (Builder)
  if (to.meta.requiresSlug) {
    const slug = profile?.publishedSlug || profile?.slug
    if (!slug) return { name: "slug-setup" }
  }

  // Accès Builder (plan + paiement)
  if (to.meta.requiresBuilderAccess) {
    if (!canUseBuilder(user, profile)) {
      return { name: "dashboard", query: { plan: "required" } }
    }
  }

  return true
})

export default router
