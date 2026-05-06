<template>
  <div class="af-root">
    <!-- Logo en haut à gauche -->
    <div class="af-topbar">
      <img src="/logo.png" alt="SaasBuilder" class="af-logo" />
    </div>

    <div class="af-layout">
      <!-- Colonne gauche : présentation + offres -->
      <div class="af-left">
        <h1 class="af-hero-title">
          Créez votre boutique en ligne en minutes
        </h1>
        <p class="af-hero-sub">
          Lancez un store professionnel sans écrire une ligne de code.
        </p>

        <!-- Features -->
        <div class="af-features">
          <div class="af-feature">
            <div class="af-feature-icon">🏗️</div>
            <div>
              <div class="af-feature-title">Builder visuel</div>
              <div class="af-feature-desc">Glissez-déposez vos sections. Aucun code requis.</div>
            </div>
          </div>
          <div class="af-feature">
            <div class="af-feature-icon">💳</div>
            <div>
              <div class="af-feature-title">Paiements intégrés</div>
              <div class="af-feature-desc">Stripe Connect pour recevoir les paiements directement.</div>
            </div>
          </div>
          <div class="af-feature">
            <div class="af-feature-icon">📦</div>
            <div>
              <div class="af-feature-title">Gestion commandes</div>
              <div class="af-feature-desc">Dashboard complet pour suivre vos ventes en temps réel.</div>
            </div>
          </div>
          <div class="af-feature">
            <div class="af-feature-icon">🌍</div>
            <div>
              <div class="af-feature-title">Multi-langues</div>
              <div class="af-feature-desc">Votre store en Français, Anglais, Arabe et Espagnol.</div>
            </div>
          </div>
        </div>

        <!-- Badges -->
        <div class="af-badges">
          <span class="af-badge">🔒 Paiement sécurisé</span>
          <span class="af-badge">⚡ Sans engagement</span>
          <span class="af-badge">🛟 Support inclus</span>
        </div>

        <!-- Offres -->
        <h2 class="af-offers-title">Nos offres</h2>
        <div class="af-plans">
          <div class="af-plan">
            <div class="af-plan-name">Gratuit</div>
            <div class="af-plan-price">0€<span>/mois</span></div>
            <div class="af-plan-tag">Pour commencer sans risque</div>
            <ul class="af-plan-list">
              <li class="ok">✓ Builder visuel</li>
              <li class="no">✗ Paiements clients</li>
              <li class="no">✗ Multi-pages</li>
              <li class="no">✗ Catalogue produits</li>
            </ul>
          </div>
          <div class="af-plan af-plan-pro">
            <div class="af-plan-badge">Recommandé</div>
            <div class="af-plan-name">Pro</div>
            <div class="af-plan-price">5€<span>/mois</span></div>
            <div class="af-plan-tag">Tout ce qu'il vous faut pour vendre</div>
            <ul class="af-plan-list">
              <li class="ok">✓ Pages illimitées</li>
              <li class="ok">✓ Builder complet</li>
              <li class="ok">✓ Paiements Stripe</li>
              <li class="ok">✓ Catalogue produits</li>
              <li class="ok">✓ Support prioritaire</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Colonne droite : formulaire -->
      <div class="af-right">
        <div class="af-card">
          <div class="af-header">
            <div class="af-emoji">👋</div>
            <h2 class="af-title">Connexion / Inscription</h2>
            <p class="af-sub">Accédez à votre espace SaasBuilder</p>
          </div>

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

          <!-- Mot de passe oublié -->
          <div class="af-forgot-row">
            <button
              type="button"
              class="af-forgot"
              :disabled="loading"
              @click="forgotPassword"
            >
              Mot de passe oublié ?
            </button>
          </div>

          <div v-if="errorMsg" class="af-error">{{ errorMsg }}</div>
          <div v-if="successMsg" class="af-success">{{ successMsg }}</div>
          <div v-if="disabledMsg" class="af-disabled">🚫 {{ disabledMsg }}</div>

          <div v-if="loading" class="af-loading">
            <div class="af-spinner"></div>
            <span>Chargement...</span>
          </div>

          <div class="af-actions">
            <button @click="login" :disabled="loading" class="af-btn af-btn-login">
              🔑 Se connecter
            </button>
            <button @click="register" :disabled="loading" class="af-btn af-btn-register">
              ✨ S'inscrire
            </button>
          </div>

          <button @click="goToPlans" class="af-back">
            ← Retour au choix du plan
          </button>
        </div>
      </div>
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
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth"

const route  = useRoute()
const router = useRouter()

const email        = ref("")
const password     = ref("")
const selectedPlan = ref("free")
const loading      = ref(false)
const errorMsg     = ref("")
const successMsg   = ref("")
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
    const redirectTo = route.query.redirect
    if (redirectTo && !String(redirectTo).includes("/auth")) {
      router.push(String(redirectTo))
    } else {
      router.push("/dashboard")
    }
  } catch(err) {
    console.error("redirectUser:", err.message)
    router.push("/dashboard")
  }
}

const login = async () => {
  errorMsg.value = ""; successMsg.value = ""; disabledMsg.value = ""; loading.value = true
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
  errorMsg.value = ""; successMsg.value = ""; disabledMsg.value = ""; loading.value = true
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

const forgotPassword = async () => {
  errorMsg.value = ""; successMsg.value = ""; disabledMsg.value = ""
  const target = email.value.trim()
  if (!target) {
    errorMsg.value = "Entrez votre email pour réinitialiser le mot de passe."
    return
  }
  loading.value = true
  try {
    await sendPasswordResetEmail(auth, target)
    successMsg.value = "Email de réinitialisation envoyé. Vérifiez votre boîte mail."
  } catch (err) {
    const msgs = {
      "auth/user-not-found": "Aucun compte associé à cet email.",
      "auth/invalid-email":  "Email invalide.",
      "auth/too-many-requests": "Trop de tentatives. Réessayez plus tard.",
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
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0f0f1a 100%);
  padding: 24px 16px 48px;
  font-family: 'DM Sans', sans-serif;
}

/* Topbar logo */
.af-topbar {
  max-width: 1200px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
}
.af-logo {
  height: 44px;
  width: auto;
  object-fit: contain;
}

/* Layout 2 colonnes */
.af-layout {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 40px;
  align-items: start;
}

/* Left */
.af-left { color: #fff; }
.af-hero-title {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #fff, #c4b5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.af-hero-sub {
  font-size: 16px;
  color: rgba(255,255,255,.7);
  margin-bottom: 28px;
}

.af-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 22px;
}
.af-feature {
  display: flex;
  gap: 12px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  padding: 14px;
}
.af-feature-icon { font-size: 24px; }
.af-feature-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.af-feature-desc  { font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.4; }

.af-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 32px;
}
.af-badge {
  background: rgba(108,99,255,.15);
  border: 1px solid rgba(108,99,255,.3);
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}

.af-offers-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
}
.af-plans {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.af-plan {
  position: relative;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
}
.af-plan-pro {
  border-color: rgba(108,99,255,.5);
  background: linear-gradient(160deg, rgba(108,99,255,.18), rgba(255,255,255,.04));
  box-shadow: 0 12px 32px rgba(108,99,255,.2);
}
.af-plan-badge {
  position: absolute;
  top: -10px;
  right: 14px;
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}
.af-plan-name  { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.7); text-transform: uppercase; letter-spacing: .5px; }
.af-plan-price { font-size: 32px; font-weight: 700; margin: 6px 0 4px; }
.af-plan-price span { font-size: 14px; color: rgba(255,255,255,.55); font-weight: 500; }
.af-plan-tag   { font-size: 12px; color: rgba(255,255,255,.55); margin-bottom: 14px; }
.af-plan-list  { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.af-plan-list li { font-size: 13px; }
.af-plan-list .ok { color: #86efac; }
.af-plan-list .no { color: rgba(255,255,255,.35); }

/* Right card (formulaire existant) */
.af-right { display: flex; justify-content: center; }
.af-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 36px 32px;
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
  position: sticky;
  top: 24px;
}

.af-header { text-align: center; margin-bottom: 24px; }
.af-emoji  { font-size: 48px; margin-bottom: 10px; }
.af-title  { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 6px; }
.af-sub    { font-size: 14px; color: rgba(255,255,255,.55); }

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

/* Forgot password */
.af-forgot-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.af-forgot {
  background: none;
  border: none;
  color: #a78bfa;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  padding: 4px 2px;
  transition: color .15s;
}
.af-forgot:hover:not(:disabled) { color: #c4b5fd; text-decoration: underline; }
.af-forgot:disabled { opacity: .5; cursor: not-allowed; }

.af-error    { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.35); color: #fca5a5; font-size: 13px; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; text-align: center; }
.af-success  { background: rgba(34,197,94,.12);  border: 1px solid rgba(34,197,94,.3);  color: #86efac; font-size: 13px; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; text-align: center; }
.af-disabled { background: rgba(234,179,8,.12);  border: 1px solid rgba(234,179,8,.3);  color: #fde68a; font-size: 13px; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; text-align: center; }

.af-loading { display: flex; align-items: center; justify-content: center; gap: 10px; color: #a78bfa; font-size: 13px; margin-bottom: 14px; }
.af-spinner { width: 18px; height: 18px; border: 2px solid rgba(167,139,250,.3); border-top-color: #a78bfa; border-radius: 50%; animation: af-spin .7s linear infinite; }
@keyframes af-spin { to { transform: rotate(360deg); } }

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
@media (max-width: 960px) {
  .af-layout { grid-template-columns: 1fr; gap: 32px; }
  .af-card { position: static; }
}
@media (max-width: 560px) {
  .af-features, .af-plans { grid-template-columns: 1fr; }
  .af-hero-title { font-size: 28px; }
}
@media (max-width: 480px) {
  .af-card  { padding: 28px 20px; border-radius: 20px; }
  .af-title { font-size: 20px; }
  .af-emoji { font-size: 40px; }
}
</style>
