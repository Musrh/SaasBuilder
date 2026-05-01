// ============================================================
//  SaasBuilder/src/router.js — ROUTER COMPLET FINAL (CORRIGÉ v2)
// ============================================================
import { createRouter, createWebHistory } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"

import PlanSelection from "./views/PlanSelection.vue"
import SlugSetup     from "./views/Slugsetup.vue"
import AuthForm      from "./views/AuthForm.vue"
import Dashboard     from "./views/Dashboard.vue"
import SiteViewer    from "./views/Siteviewer.vue"
import NotFound      from "./views/NotFound.vue"

const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

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
  if (typeof v.toMillis === "function") return v.toMillis()
  if (typeof v.seconds === "number")    return v.seconds * 1000
  return 0
}

const routes = [
  // ── App principale ──────────────────────────────────────────
  { path: "/",             name: "home",       component: PlanSelection },
  { path: "/auth",         name: "auth",       component: AuthForm },
  { path: "/slug-setup",   name: "slug-setup", component: SlugSetup,  meta: { requiresAuth: true } },
  { path: "/dashboard",    name: "dashboard",  component: Dashboard,  meta: { requiresAuth: true } },
  {
    path: "/saasgenerator",
    name: "saasgenerator",
    component: () => import("./views/Saasgenerator.vue"),
    meta: { requiresAuth: true },
  },

  // ── Sites publiés (URL technique UID) ───────────────────────
  { path: "/site/:uid", name: "site", component: SiteViewer, props: true },

  // ── Authentification store client ───────────────────────────
  { path: "/store-auth", name: "store-auth", component: () => import("./views/Storeauth.vue") },

  // ── Paiements ───────────────────────────────────────────────
  { path: "/payment-success", name: "payment-success", component: () => import("./views/Paymentsuccess.vue") },
  { path: "/payment-cancel",  name: "payment-cancel",  component: () => import("./views/Paymentcancel.vue") },
  { path: "/success",         name: "success",         component: () => import("./views/Success.vue") },
  { path: "/cancel",          name: "cancel",          component: () => import("./views/Cancel.vue") },

  // ── Admin ────────────────────────────────────────────────────
  { path: "/admin", name: "admin", component: () => import("./views/Admin.vue"), meta: { requiresAdmin: true } },

  // ── Autres ──────────────────────────────────────────────────
  { path: "/orders", name: "orders", component: () => import("./views/Orders.vue"), meta: { requiresAuth: true } },
  { path: "/panier", name: "panier", component: () => import("./views/Panier.vue") },

  // ── ✅ FIX BUG 1 — Sites publiés par slug (URL conviviale) ──
  // Ex: /mon-store  → SiteViewer reçoit { slug: "mon-store" }
  // Cette route est placée AVANT le catch-all NotFound mais APRÈS toutes
  // les routes spécifiques, donc elle ne capture que les segments simples
  // non résolus comme /mon-slug.
  // SiteViewer doit chercher dans Firestore : slugs/{slug} → uid → siteData.
  {
    path: "/:slug([a-z0-9][a-z0-9-]*)",
    name: "slug-site",
    component: SiteViewer,
    props: (route) => ({ slug: route.params.slug }),
  },

  // ── Catch-all ────────────────────────────────────────────────
  { path: "/:pathMatch(.*)*", name: "not-found", component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
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
      next({ name: "auth", query: { redirect: to.fullPath } })
      return
    }

    // Vérifier statut compte pour dashboard / builder / slug-setup
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

          // ── Accès /saasgenerator : Pro payé OU essai gratuit ──
          if (to.name === "saasgenerator") {
            const isPro      = d.plan && d.plan !== "free"
            const isPaid     = d.paye === true
            const exp        = d.expiry
            const notExpired = !exp || exp === 0 || exp > Date.now()
            const proAccess  = isPro && isPaid && notExpired

            // Date de début d'essai : plusieurs champs possibles selon l'ancienneté du compte
            const slugStart  = toMillis(d.slugCreatedAt)
                            || toMillis(d.slugSetAt)
                            || toMillis(d.createdAt)

            // ✅ FIX BUG 2 — Si l'utilisateur a un publishedSlug mais aucune
            // date enregistrée dans Firestore (ancien compte ou données manquantes),
            // on lui accorde l'accès plutôt que de le bloquer : on considère l'essai
            // comme actif. slugStart === 0 signifie "pas de date → bénéfice du doute".
            const trialEnd   = slugStart ? slugStart + FREE_TRIAL_MS : 0
            const inTrial    = !!d.publishedSlug && (
              slugStart === 0            // pas de date → accès accordé par défaut
              || Date.now() < trialEnd  // ou encore dans les 30 jours
            )

            if (!proAccess && !inTrial) {
              // Essai vraiment expiré ET pas Pro → sélection de plan
              next({ name: "home" }); return
            }
          }
        }
        // Si le document n'existe pas encore dans Firestore, on laisse passer
        // (compte tout neuf, les données seront créées lors du slug-setup)
      } catch(e) {
        console.error("Router guard:", e.message)
        // En cas d'erreur Firestore, on laisse passer pour ne pas bloquer l'utilisateur
        next(); return
      }
    }

    next(); return
  }

  // Route publique
  next()
})

export default router
