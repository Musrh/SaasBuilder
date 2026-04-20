<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] px-4">

    <!-- CARD -->
    <div class="w-full max-w-md rounded-3xl p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl text-white">

      <!-- EMOJI / TITLE -->
      <div class="text-center mb-6">
        <div class="text-5xl mb-2">👋</div>
        <h2 class="text-2xl font-semibold">
          Connexion / Inscription
        </h2>
        <p class="text-sm text-gray-300 mt-2">
          Accédez à votre espace SaaS
        </p>
      </div>

      <!-- PLAN -->
      <div class="bg-white/10 border border-white/10 rounded-xl p-3 mb-6 text-center">
        <p class="text-xs text-gray-300">Plan choisi</p>
        <p class="text-lg font-bold capitalize text-purple-400">
          {{ selectedPlan }}
        </p>
      </div>

      <!-- EMAIL -->
      <div class="mb-4">
        <input
          v-model="email"
          type="email"
          placeholder="votre@email.com"
          class="w-full p-3 rounded-xl bg-white/10 border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <!-- PASSWORD -->
      <div class="mb-2">
        <input
          v-model="password"
          type="password"
          placeholder="••••••••"
          class="w-full p-3 rounded-xl bg-white/10 border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <!-- ERROR -->
      <p v-if="errorMsg" class="text-red-400 text-sm mb-3 text-center">
        {{ errorMsg }}
      </p>

      <!-- COMPTE DÉSACTIVÉ -->
      <p v-if="disabledMsg" class="text-yellow-400 text-sm mb-3 text-center bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3">
        🚫 {{ disabledMsg }}
      </p>

      <!-- LOADING -->
      <p v-if="loading" class="text-purple-400 text-sm mb-3 text-center">
        Chargement...
      </p>

      <!-- LOGIN -->
      <button
        @click="login"
        :disabled="loading"
        class="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-3 rounded-xl font-semibold mb-3 hover:opacity-90 transition disabled:opacity-50"
      >
        🔑 Se connecter
      </button>

      <!-- REGISTER -->
      <button
        @click="register"
        :disabled="loading"
        class="w-full bg-white/10 py-3 rounded-xl font-semibold hover:bg-white/20 transition disabled:opacity-50"
      >
        ✨ S'inscrire
      </button>

      <!-- RETOUR -->
      <button
        @click="goToPlans"
        class="mt-4 w-full text-sm text-gray-400 hover:text-white transition"
      >
        ← Retour au choix du plan
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { db, auth } from "../firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth"

const route  = useRoute()
const router = useRouter()

// ── État ──────────────────────────────────────────────────────
const email       = ref("")
const password    = ref("")
const selectedPlan = ref("free")
const loading     = ref(false)
const errorMsg    = ref("")
const disabledMsg = ref("")

const API_URL = "https://backendfinal-production-afd2.up.railway.app"

// ── Emails admin — connexion redirige vers /#/admin ───────────
// Ces comptes doivent exister dans Firebase Auth
// Pas de document Firestore requis pour l'admin
const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

// ── Chargement plan depuis query ou localStorage ───────────────
onMounted(() => {
  selectedPlan.value =
    route.query.plan ||
    localStorage.getItem("planChoisi") ||
    "free"

  // Si déjà connecté → rediriger intelligemment
  onAuthStateChanged(auth, async (user) => {
    if (!user) return
    await redirectUser(user)
  })
})

// ── Redirection selon le rôle ──────────────────────────────────
const redirectUser = async (user) => {
  const emailLower = user.email?.toLowerCase() || ""

  // 1. Admin → tableau de bord admin
  if (ADMIN_EMAILS.includes(emailLower)) {
    window.location.href = "https://musrh.github.io/SaasBuilder/#/admin"
    return
  }

  // 2. Propriétaire de store → vérifier son statut dans Firestore
  try {
    const snap = await getDoc(doc(db, "users", user.uid))

    if (!snap.exists()) {
      // Nouveau compte sans document → rester sur auth
      return
    }

    const data    = snap.data()
    const plan    = data.plan    || "free"
    const paye    = data.paye    || false
    const expiry  = data.expiry  || 0
    const active  = data.active  !== false   // true par défaut

    // Compte désactivé par l'admin
    if (!active) {
      disabledMsg.value = "Votre compte a été désactivé. Contactez l'administrateur."
      await signOut(auth)
      return
    }

    const planExpired = expiry && expiry < Date.now()

    // Plan FREE → dashboard basique
    if (plan === "free") {
      router.push("/dashboard")
      return
    }

    // Plan payant mais pas encore payé → dashboard en attente
    if (!paye) {
      router.push("/dashboard")
      return
    }

    // Plan payant + payé + non expiré → builder complet
    if (!planExpired) {
      router.push("/saasgenerator")
      return
    }

    // Plan expiré → dashboard (renouvellement)
    router.push("/dashboard")

  } catch (err) {
    console.error("redirectUser:", err.message)
    router.push("/dashboard")
  }
}

// ── Connexion ──────────────────────────────────────────────────
const login = async () => {
  errorMsg.value    = ""
  disabledMsg.value = ""
  loading.value     = true
  try {
    const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    await redirectUser(cred.user)
  } catch (err) {
    const msgs = {
      "auth/user-not-found":      "Email introuvable.",
      "auth/wrong-password":      "Mot de passe incorrect.",
      "auth/invalid-email":       "Email invalide.",
      "auth/too-many-requests":   "Trop de tentatives. Réessayez plus tard.",
      "auth/invalid-credential":  "Email ou mot de passe incorrect.",
    }
    errorMsg.value = msgs[err.code] || ("Erreur connexion : " + err.message)
  } finally {
    loading.value = false
  }
}

// ── Inscription ────────────────────────────────────────────────
const register = async () => {
  errorMsg.value    = ""
  disabledMsg.value = ""
  loading.value     = true
  try {
    // Bloquer l'inscription avec un email admin
    if (ADMIN_EMAILS.includes(email.value.trim().toLowerCase())) {
      errorMsg.value = "Cet email est réservé à l'administration."
      return
    }

    const cred = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)
    const user = cred.user
    const uid  = user.uid

    // Créer le document propriétaire dans Firestore
    const userData = {
      uid,
      email:              user.email,
      role:               "owner",
      ownerId:            uid,
      storeId:            uid,
      plan:               selectedPlan.value || "free",
      paye:               false,
      subscriptionActive: false,
      stripeAccountId:    null,
      active:             true,
      createdAt:          serverTimestamp(),
      expiry:             null,
    }

    await setDoc(doc(db, "users", uid), userData)

    localStorage.setItem("user", JSON.stringify({
      uid,
      email: user.email,
      plan:  selectedPlan.value,
    }))
    localStorage.setItem("planChoisi", selectedPlan.value)

    // Plan payant → rediriger vers Stripe
    if (selectedPlan.value === "pro" || selectedPlan.value === "basic") {
      const res  = await fetch(`${API_URL}/create-billing-session`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:    user.email,
          plan:     selectedPlan.value,
          ownerUid: uid,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      errorMsg.value = "Erreur paiement : impossible de créer la session Stripe."
      return
    }

    // Plan FREE → dashboard directement
    router.push("/dashboard")

  } catch (err) {
    const msgs = {
      "auth/email-already-in-use": "Email déjà utilisé. Connectez-vous.",
      "auth/weak-password":        "Mot de passe trop faible (min. 6 caractères).",
      "auth/invalid-email":        "Email invalide.",
    }
    errorMsg.value = msgs[err.code] || ("Erreur inscription : " + err.message)
  } finally {
    loading.value = false
  }
}

// ── Retour aux plans ───────────────────────────────────────────
const goToPlans = () => {
  router.push("/")
}
</script>
