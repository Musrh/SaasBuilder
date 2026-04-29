<template>
  <div class="af-root">
    <div class="af-card">

      <!-- Header -->
      <div class="af-header">
        <div class="af-emoji">👋</div>
        <h2 class="af-title">Connexion / Inscription</h2>
        <p class="af-sub">Accédez à votre espace SaasBuilder</p>
      </div>

      <!-- Email -->
      <div class="af-field">
        <label class="af-label">Email</label>
        <input
          v-model="email"
          type="email"
          placeholder="votre@email.com"
          class="af-input"
          autocomplete="email"
        />
      </div>

      <!-- Password -->
      <div class="af-field">
        <label class="af-label">Mot de passe</label>
        <input
          v-model="password"
          type="password"
          placeholder="••••••••"
          class="af-input"
          autocomplete="current-password"
        />
      </div>

      <!-- Erreurs -->
      <div v-if="errorMsg" class="af-error">{{ errorMsg }}</div>
      <div v-if="disabledMsg" class="af-disabled">🚫 {{ disabledMsg }}</div>

      <!-- Loading -->
      <div v-if="loading" class="af-loading">
        <div class="af-spinner"></div>
        <span>Chargement...</span>
      </div>

      <!-- Boutons -->
      <div class="af-actions">
        <button @click="login" :disabled="loading" class="af-btn af-btn-login">
          🔑 Se connecter
        </button>
        <button @click="register" :disabled="loading" class="af-btn af-btn-register">
          ✨ S'inscrire
        </button>
      </div>

      <!-- Retour -->
      <button @click="goToPlans" class="af-back">
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
  signOut,
} from "firebase/auth"

const route  = useRoute()
const router = useRouter()

const email        = ref("")
const password     = ref("")
const selectedPlan = ref("free")
const loading      = ref(false)
const errorMsg     = ref("")
const disabledMsg  = ref("")

const API_URL     = "https://backendfinal-production-afd2.up.railway.app"
const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

onMounted(() => {
  selectedPlan.value =
    route.query.plan ||
    localStorage.getItem("planChoisi") ||
    "free"
})

const redirectUser = async (user) => {
  const emailLower = user.email?.toLowerCase() || ""
  if (ADMIN_EMAILS.includes(emailLower)) {
    window.location.href = "https://mronlinestores.com/#/admin"
    return
  }
  try {
    const snap = await getDoc(doc(db, "users", user.uid))
    if (!snap.exists()) { router.push("/dashboard"); return }
    const data   = snap.data()
    const active = data.active !== false
    if (!active) {
      disabledMsg.value = "Votre compte a été désactivé. Contactez l'administrateur."
      await signOut(auth)
      return
    }
    router.push("/dashboard")
  } catch(err) {
    console.error("redirectUser:", err.message)
    router.push("/dashboard")
  }
}

const login = async () => {
  errorMsg.value = ""; disabledMsg.value = ""; loading.value = true
  try {
    const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    await redirectUser(cred.user)
  } catch(err) {
    const msgs = {
      "auth/user-not-found":     "Email introuvable.",
      "auth/wrong-password":     "Mot de passe incorrect.",
      "auth/invalid-email":      "Email invalide.",
      "auth/too-many-requests":  "Trop de tentatives. Réessayez plus tard.",
      "auth/invalid-credential": "Email ou mot de passe incorrect.",
    }
    errorMsg.value = msgs[err.code] || ("Erreur : " + err.message)
  } finally { loading.value = false }
}

const register = async () => {
  errorMsg.value = ""; disabledMsg.value = ""; loading.value = true
  try {
    if (ADMIN_EMAILS.includes(email.value.trim().toLowerCase())) {
      errorMsg.value = "Cet email est réservé à l'administration."
      return
    }
    const cred = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)
    const user = cred.user
    const uid  = user.uid

    await setDoc(doc(db, "users", uid), {
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
    })

    localStorage.setItem("user", JSON.stringify({ uid, email: user.email, plan: selectedPlan.value }))
    localStorage.setItem("planChoisi", selectedPlan.value)

    if (selectedPlan.value === "pro" || selectedPlan.value === "basic") {
      const res  = await fetch(`${API_URL}/create-billing-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, plan: selectedPlan.value, ownerUid: uid }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      errorMsg.value = "Erreur paiement : impossible de créer la session Stripe."
      return
    }
    router.push("/dashboard")
  } catch(err) {
    const msgs = {
      "auth/email-already-in-use": "Email déjà utilisé. Connectez-vous.",
      "auth/weak-password":        "Mot de passe trop faible (min. 6 caractères).",
      "auth/invalid-email":        "Email invalide.",
    }
    errorMsg.value = msgs[err.code] || ("Erreur : " + err.message)
  } finally { loading.value = false }
}

const goToPlans = () => router.push("/")
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.af-root {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0f0f1a 100%);
  padding: 32px 16px;
  font-family: 'DM Sans', sans-serif;
}

.af-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 36px 32px;
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}

/* Header */
.af-header { text-align: center; margin-bottom: 24px; }
.af-emoji  { font-size: 48px; margin-bottom: 10px; }
.af-title  { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 6px; }
.af-sub    { font-size: 14px; color: rgba(255,255,255,.55); }



/* Champs */
.af-field  { margin-bottom: 14px; }
.af-label  { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,.6); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .4px; }
.af-input  {
  width: 100%;
  padding: 13px 16px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 12px;
  font-size: 15px;
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color .2s, background .2s;
}
.af-input::placeholder { color: rgba(255,255,255,.35); }
.af-input:focus {
  border-color: rgba(108,99,255,.7);
  background: rgba(108,99,255,.12);
}

/* Messages */
.af-error    { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.35); color: #fca5a5; font-size: 13px; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; text-align: center; }
.af-disabled { background: rgba(234,179,8,.12);  border: 1px solid rgba(234,179,8,.3);  color: #fde68a; font-size: 13px; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; text-align: center; }

/* Loading */
.af-loading { display: flex; align-items: center; justify-content: center; gap: 10px; color: #a78bfa; font-size: 13px; margin-bottom: 14px; }
.af-spinner { width: 18px; height: 18px; border: 2px solid rgba(167,139,250,.3); border-top-color: #a78bfa; border-radius: 50%; animation: af-spin .7s linear infinite; }
@keyframes af-spin { to { transform: rotate(360deg); } }

/* Boutons */
.af-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.af-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 13px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all .2s;
}
.af-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

.af-btn-login {
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  color: #fff;
  box-shadow: 0 4px 20px rgba(108,99,255,.4);
}
.af-btn-login:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(108,99,255,.5); }

.af-btn-register {
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.85);
  border: 1px solid rgba(255,255,255,.15);
}
.af-btn-register:hover:not(:disabled) { background: rgba(255,255,255,.14); color: #fff; }

/* Retour */
.af-back {
  display: block;
  width: 100%;
  background: none;
  border: none;
  color: rgba(255,255,255,.4);
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  font-family: 'DM Sans', sans-serif;
  padding: 8px;
  transition: color .15s;
}
.af-back:hover { color: rgba(255,255,255,.75); }

/* Responsive */
@media (max-width: 480px) {
  .af-card  { padding: 28px 20px; border-radius: 20px; }
  .af-title { font-size: 20px; }
  .af-emoji { font-size: 40px; }
}
</style>
