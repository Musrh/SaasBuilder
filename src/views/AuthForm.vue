<template>
  <div class="af-root">
    <!-- Logo en haut à gauche -->
    <div class="af-topbar">
      <img :src="logo" alt="SaasBuilder" class="af-logo" />
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

        <div class="af-badges">
          
         <span class="af-badge"> 
     <button @click="goToGuide" class="af-back">
          Comment utiliser se site
      
        
     </button>
           </span>
        
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
              
              <li class="ok">✓Multi-pages</li>
              <li class="ok">✓Catalogue produits</li>
              <li class="ok">✓Formulaires</li>
              <li class="ok">✓Insertion videos</li>
              <li class="ok">✓ Gestion commandes</li>
              <li class="ok"> ✓Paiements clients(en mode test)</li>
            </ul>
          </div>
          <div class="af-plan af-plan-pro">
            <div class="af-plan-badge">Recommandé</div>
            <div class="af-plan-name">Pro</div>
            <div class="af-plan-price">10€<span>/mois</span></div>
            <div class="af-plan-tag">Tout ce qu'il vous faut pour vendre</div>
            <ul class="af-plan-list">
              
              <li class="ok">✓ Builder complet</li>
              <li class="ok">✓ Pages illimitées</li>
              <li class="ok">✓ Paiements Stripe (en mode production)</li>
              <li class="ok">✓ Catalogue produits</li>
              <li class="ok">✓ Formulaires</li>
              <li class="ok">✓ Insertion Videos</li>
              <li class="ok">✓ Gestion Commandes</li>
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

          <template v-if="!disabledUser">
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
          </template><!-- /!disabledUser -->

          <div v-if="errorMsg" class="af-error">{{ errorMsg }}</div>
          <div v-if="successMsg" class="af-success">{{ successMsg }}</div>
          <!-- Compte suspendu : carte de renouvellement -->
          <template v-if="disabledUser">
            <div class="af-suspended-card">
              <div class="af-suspended-icon">🔒</div>
              <h3 class="af-suspended-title">Compte suspendu</h3>
              <p class="af-suspended-msg">{{ disabledMsg }}</p>
              <p class="af-suspended-sub">
                Renouvelez votre abonnement pour retrouver l'accès à votre store et vos données.
              </p>
              <button
                class="af-btn af-btn-renew"
                @click="renewPayment"
                :disabled="renewLoading"
              >
                <span v-if="renewLoading" class="af-spinner-sm"/>
                {{ renewLoading ? 'Redirection...' : '💳 Renouveler mon abonnement' }}
              </button>
              <button
                class="af-suspended-logout"
                @click="signOut(auth); disabledUser = null; disabledMsg = ''"
              >
                Se connecter avec un autre compte
              </button>
            </div>
          </template>
          <div v-else-if="disabledMsg" class="af-disabled">🚫 {{ disabledMsg }}</div>

          <div v-if="loading && !disabledUser" class="af-loading">
            <div class="af-spinner"></div>
            <span>Chargement...</span>
          </div>

          <div v-if="pendingVerification && !disabledUser" class="af-verify-banner">
            <div class="af-verify-icon">📧</div>
            <div class="af-verify-text">
              <strong>Vérifiez votre boîte mail</strong>
              <span>Cliquez sur le lien dans l'email envoyé à <em>{{ email }}</em> pour activer votre compte.</span>
            </div>
            <button @click="resendVerification" :disabled="loading" class="af-btn-resend">
              Renvoyer l'email
            </button>
          </div>

          <div class="af-actions" v-if="!disabledUser">
            <button @click="login" :disabled="loading" class="af-btn af-btn-login">
              🔑 Se connecter
            </button>
            <button @click="register" :disabled="loading || pendingVerification" class="af-btn af-btn-register">
              ✨ S'inscrire
            </button>
          </div>

          <button @click="goToPlans" class="af-back" v-if="!disabledUser">
            ← Retour au choix du plan
          </button>
        </div>
      </div>
    </div>
  </div>
  
    <!-- ───────── FOOTER ───────── -->
    <footer class="ps-footer">
      <div class="ps-footer-inner">
        <div class="ps-footer-brand">
          © {{ new Date().getFullYear() }} SaasBuilder
        </div>
        <nav class="ps-footer-links">
          <router-link to="/privacy">Privacy Policy</router-link>
          <router-link to="/remboursement">Remboursement</router-link>
          <router-link to="/confidentialite">Confidentialité</router-link>
          <router-link to="/mentions">Mentions légales</router-link>
          <router-link to="/conditions">Conditions générales</router-link>
        </nav>
      </div>
    </footer>
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
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  getAuth,
} from "firebase/auth"

// Logo depuis dossier public (pas assets)
const logo = "/logo.png"

const route  = useRoute()
const router = useRouter()

const email               = ref("")
const password            = ref("")
const selectedPlan        = ref("free")
const loading             = ref(false)
const errorMsg            = ref("")
const successMsg          = ref("")
const disabledMsg         = ref("")
const pendingVerification = ref(false)
const unverifiedUser      = ref(null)
const renewLoading        = ref(false)
const disabledUser        = ref(null)   // { uid, email, plan } si compte suspendu

const API_URL     = "https://backendfinal-production-afd2.up.railway.app"
const ADMIN_EMAILS = ["musmamon@gmail.com", "musrh@gmail.com"]

onMounted(() => {
  selectedPlan.value =
    route.query.plan ||
    localStorage.getItem("planChoisi") ||
    "free"

  // Si ?logout=1 → signOut silencieux + afficher le formulaire
  if (route.query.logout === "1") {
    signOut(auth).catch(() => {})
    return   // stop ici, afficher le formulaire normalement
  }

  // Si user déjà connecté → rediriger (sans import dynamique)
  const fireAuth = getAuth()
  const unsub = onAuthStateChanged(fireAuth, async (user) => {
    unsub()  // écouter une seule fois
    if (!user) return  // pas connecté → afficher le formulaire

    try {
      const snap = await getDoc(doc(db, "users", user.uid))
      if (!snap.exists()) { router.push("/dashboard"); return }
      const data = snap.data()

      if (data.active === false) {
        disabledUser.value = { uid: user.uid, email: user.email, plan: data.plan || "pro" }
        disabledMsg.value  = "Votre compte a été suspendu pour non-paiement."
        return
      }

      if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        window.location.href = "https://mronlinestores.com/#/admin"
        return
      }

      router.push("/dashboard")
    } catch(e) {
      console.warn("onMounted auth check:", e.message)
    }
  })
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
      // Conserver la session pour permettre le renouvellement du paiement
      disabledUser.value = { uid: user.uid, email: user.email, plan: data.plan || "pro" }
      disabledMsg.value  = "Votre compte a été suspendu pour non-paiement."
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
  pendingVerification.value = false; unverifiedUser.value = null
  try {
    const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    if (!cred.user.emailVerified && !ADMIN_EMAILS.includes(cred.user.email?.toLowerCase() || "")) {
      unverifiedUser.value = cred.user
      pendingVerification.value = true
      await signOut(auth)
      errorMsg.value = "Votre adresse email n'est pas encore vérifiée. Consultez votre boîte mail ou renvoyez l'email ci-dessous."
      return
    }
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

    await sendEmailVerification(user)
    await signOut(auth)
    pendingVerification.value = true
    successMsg.value = "Compte créé ! Un email de vérification a été envoyé à " + user.email + ". Veuillez vérifier votre boîte mail avant de vous connecter."
    return
  } catch(err) {
    const msgs = {
      "auth/email-already-in-use": "Email déjà utilisé. Connectez-vous.",
      "auth/weak-password":        "Mot de passe trop faible (min. 6 caractères).",
      "auth/invalid-email":        "Email invalide.",
    }
    errorMsg.value = msgs[err.code] || ("Erreur : " + err.message)
  } finally { loading.value = false }
}

// ── Renouveler le paiement (compte suspendu) ────────────────────
const renewPayment = async () => {
  if (!disabledUser.value) return
  renewLoading.value = true
  try {
    const res  = await fetch(`${API_URL}/create-billing-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:    disabledUser.value.email,
        plan:     disabledUser.value.plan || "pro",
        ownerUid: disabledUser.value.uid,
      }),
    })
    const data = await res.json()
    if (data.url) { window.location.href = data.url; return }
    errorMsg.value = "Impossible de créer la session de paiement."
  } catch(e) {
    errorMsg.value = "Erreur réseau : " + e.message
  } finally { renewLoading.value = false }
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

const resendVerification = async () => {
  errorMsg.value = ""; successMsg.value = ""; loading.value = true
  try {
    if (unverifiedUser.value) {
      await sendEmailVerification(unverifiedUser.value)
      successMsg.value = "Email de vérification renvoyé. Vérifiez votre boîte mail."
      return
    }
    const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    if (!cred.user.emailVerified) {
      unverifiedUser.value = cred.user
      await sendEmailVerification(cred.user)
      await signOut(auth)
      successMsg.value = "Email de vérification renvoyé. Vérifiez votre boîte mail."
    } else {
      await redirectUser(cred.user)
    }
  } catch(err) {
    const msgs = {
      "auth/too-many-requests":  "Trop de tentatives. Réessayez plus tard.",
      "auth/invalid-credential": "Email ou mot de passe incorrect.",
      "auth/wrong-password":     "Mot de passe incorrect.",
      "auth/user-not-found":     "Email introuvable.",
    }
    errorMsg.value = msgs[err.code] || ("Erreur : " + err.message)
  } finally { loading.value = false }
}

const goToPlans = () => router.push("/")

const goToGuide = () => router.push("/guide")
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

.af-verify-banner {
  background: rgba(99,179,237,.1);
  border: 1px solid rgba(99,179,237,.35);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.af-verify-icon { font-size: 28px; text-align: center; }
.af-verify-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}
.af-verify-text strong { font-size: 14px; color: #90cdf4; font-weight: 700; }
.af-verify-text span   { font-size: 12px; color: rgba(255,255,255,.6); line-height: 1.5; }
.af-verify-text em     { color: #90cdf4; font-style: normal; }
.af-btn-resend {
  background: rgba(99,179,237,.18);
  border: 1px solid rgba(99,179,237,.4);
  color: #90cdf4;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: background .2s, color .2s;
  align-self: center;
}
.af-btn-resend:hover:not(:disabled) { background: rgba(99,179,237,.3); color: #fff; }
.af-btn-resend:disabled { opacity: .5; cursor: not-allowed; }

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

/* ── Carte compte suspendu ─────────────────────────────────────── */
.af-suspended-card {
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.25);
  border-radius: 16px;
  padding: 24px 20px;
  text-align: center;
  margin-bottom: 16px;
}
.af-suspended-icon  { font-size: 36px; margin-bottom: 10px; }
.af-suspended-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.af-suspended-msg   { font-size: 14px; color: #fca5a5; margin-bottom: 8px; }
.af-suspended-sub   { font-size: 12px; color: rgba(255,255,255,.45); line-height: 1.5; margin-bottom: 18px; }

.af-btn-renew {
  width: 100%; padding: 13px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; border: none; border-radius: 12px;
  font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
  box-shadow: 0 4px 16px rgba(16,185,129,.3);
  transition: all .2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 10px;
}
.af-btn-renew:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16,185,129,.4); }
.af-btn-renew:disabled { opacity: .6; cursor: not-allowed; }

.af-suspended-logout {
  background: none; border: none;
  color: rgba(255,255,255,.35); font-size: 12px;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
  padding: 6px; transition: color .15s; width: 100%;
}
.af-suspended-logout:hover { color: rgba(255,255,255,.6); }

.af-spinner-sm {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: af-spin .7s linear infinite;
}

  /* ───────── FOOTER ───────── */
.ps-footer {
  background: #0a0a14;
  border-top: 1px solid rgba(255,255,255,.08);
  color: rgba(255,255,255,.7);
  padding: 24px 16px;
  font-family: 'DM Sans', sans-serif;
}
.ps-footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.ps-footer-brand {
  font-size: 13px;
  color: rgba(255,255,255,.55);
}
.ps-footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.ps-footer-links a {
  color: rgba(255,255,255,.7);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: color .15s;
}
.ps-footer-links a:hover { color: #c4b5fd; text-decoration: underline; }
  
</style>
