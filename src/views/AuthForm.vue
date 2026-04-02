<!-- ============================================================
  AuthForm.vue — Sassbuilder
  Connexion / Inscription
  Flux :
    - Nouveau utilisateur → Panier (si plan payant) ou Dashboard (free)
    - Utilisateur existant + payé + non expiré → SaaasGenerator Home
    - Utilisateur existant + non payé ou expiré → Panier
============================================================ -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">

    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

      <!-- PLAN badge -->
      <div v-if="selectedPlan && selectedPlan !== 'free'" class="flex justify-center mb-6">
        <span class="bg-blue-50 border border-blue-200 text-blue-600 text-sm font-semibold px-4 py-1 rounded-full">
          Plan {{ selectedPlan.toUpperCase() }} sélectionné
        </span>
      </div>

      <h1 class="text-3xl font-bold text-center mb-6 text-gray-800">
        {{ isLogin ? "Connexion" : "Créer un compte" }}
      </h1>

      <!-- ERROR -->
      <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">
        {{ errorMsg }}
      </div>

      <div class="space-y-4">

        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-gray-800"
        />

        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe (6 caractères min)"
          class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-gray-800"
        />

        <button
          @click="handleSubmit"
          :disabled="loading"
          class="w-full py-3 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
          :class="isLogin ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          {{ loading ? "Chargement..." : (isLogin ? "Se connecter" : "S'inscrire") }}
        </button>

      </div>

      <div class="mt-6 text-center text-sm text-gray-500">
        {{ isLogin ? "Pas de compte ?" : "Déjà un compte ?" }}
        <button @click="isLogin = !isLogin; errorMsg = ''" class="text-blue-500 ml-1 font-semibold hover:underline">
          {{ isLogin ? "Créer un compte" : "Se connecter" }}
        </button>
      </div>

      <div class="mt-4 text-center">
        <button @click="$router.push('/')" class="text-xs text-gray-400 hover:text-gray-600">
          ← Retour aux offres
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { auth, db } from "../firebase"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"

const router = useRouter()
const route  = useRoute()

const email       = ref("")
const password    = ref("")
const isLogin     = ref(true)
const loading     = ref(false)
const errorMsg    = ref("")

const selectedPlan = computed(() =>
  route.query.plan || localStorage.getItem("planChoisi") || "free"
)

onMounted(() => {
  // Si déjà connecté → vérifier et rediriger
  auth.onAuthStateChanged(async (user) => {
    if (user) await checkAndRedirect(user)
  })
})

// ── Vérification plan + expiry + redirection ──────────────────
const checkAndRedirect = async (user) => {
  try {
    const snap = await getDoc(doc(db, "users", user.uid))
    if (!snap.exists()) return // Nouvel utilisateur → rester sur auth

    const data = snap.data()
    const plan   = data.plan   || "free"
    const paye   = data.paye   || false
    const expiry = data.expiry || 0

    const planExpired = expiry < Date.now()

    // FREE → Dashboard (builder basique)
    if (plan === "free") {
      router.push("/dashboard")
      return
    }

    // Payant + payé + non expiré → SaaasGenerator
    if (paye && !planExpired) {
      // Rediriger vers SaaasGenerator (application externe)
      window.location.href = "https://musrh.github.io/SaaasGenerator/#/"
      return
    }

    // Payant mais pas payé ou expiré → Panier
    router.push({ path: "/panier", query: { plan, price: plan === "pro" ? 5 : 10 } })
  } catch (e) {
    console.error(e)
  }
}

// ── Submit ────────────────────────────────────────────────────
const handleSubmit = async () => {
  errorMsg.value = ""
  if (!email.value || !password.value) {
    errorMsg.value = "Veuillez remplir tous les champs."
    return
  }
  if (password.value.length < 6) {
    errorMsg.value = "Le mot de passe doit faire au moins 6 caractères."
    return
  }

  loading.value = true
  const plan = selectedPlan.value

  try {

    // ── CONNEXION ──────────────────────────────────────────────
    if (isLogin.value) {
      const cred = await signInWithEmailAndPassword(auth, email.value, password.value)
      await checkAndRedirect(cred.user)
    }

    // ── INSCRIPTION ────────────────────────────────────────────
    else {
      const cred = await createUserWithEmailAndPassword(auth, email.value, password.value)
      const user = cred.user
      const now  = Date.now()

      // Créer le document Firestore
      await setDoc(doc(db, "users", user.uid), {
        email:     email.value,
        plan:      plan,
        paye:      plan === "free",   // free = actif immédiatement
        createdAt: now,
        expiry:    plan === "free" ? now + 100 * 365 * 24 * 60 * 60 * 1000 : now, // free = 100 ans
        sections:  [],
        // Config paiement du store (vide, à remplir dans SaaasGenerator)
        storePaymentConfig: {
          stripe: { publishableKey: "", backendUrl: "", currency: "eur", mode: "test" },
          paypal: { clientId: "", mode: "sandbox", currency: "EUR", createOrderUrl: "", captureOrderUrl: "" }
        }
      })

      localStorage.setItem("planChoisi", plan)

      // FREE → Dashboard direct
      if (plan === "free") {
        router.push("/dashboard")
        return
      }

      // Payant → Panier pour payer
      router.push({
        path: "/panier",
        query: { plan, price: plan === "pro" ? 5 : 10 }
      })
    }

  } catch (err) {
    console.error(err)
    const msgs = {
      "auth/email-already-in-use": "Cet email est déjà utilisé.",
      "auth/user-not-found":       "Aucun compte avec cet email.",
      "auth/wrong-password":       "Mot de passe incorrect.",
      "auth/invalid-email":        "Adresse email invalide.",
      "auth/too-many-requests":    "Trop de tentatives. Réessayez plus tard.",
    }
    errorMsg.value = msgs[err.code] || err.message
  } finally {
    loading.value = false
  }
}
</script>
