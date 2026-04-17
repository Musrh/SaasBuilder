<!-- ============================================================
  StoreAuth.vue — SaasBuilder/src/views/StoreAuth.vue
  
  Page connexion/inscription pour les CLIENTS du store.
  Route : /#/auth?store=mjstore&redirect=/site/mjstore
  
  - Visible par tout le monde (non connecté)
  - Après connexion → redirige vers le store
  - Le propriétaire du store a sa propre auth dans /#/
  - Design épuré reprenant l'identité du store (logo + nom)
============================================================ -->

<template>
  <div class="sa-root">
    <div class="sa-card">

      <!-- Logo + Nom du store -->
      <div class="sa-brand">
        <img v-if="storeLogo" :src="storeLogo" class="sa-brand-logo" alt="logo"/>
        <div v-else class="sa-brand-icon">◈</div>
        <h1 class="sa-brand-name">{{ storeName || "Notre boutique" }}</h1>
      </div>

      <!-- Tabs Connexion / Inscription -->
      <div class="sa-tabs">
        <button :class="['sa-tab', { active: mode==='login' }]"    @click="mode='login'">
          Se connecter
        </button>
        <button :class="['sa-tab', { active: mode==='register' }]" @click="mode='register'">
          Créer un compte
        </button>
      </div>

      <!-- ── CONNEXION ──────────────────────────────────── -->
      <div v-if="mode==='login'" class="sa-form">
        <div class="sa-field">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="votre@email.com" class="sa-input" @keydown.enter="submit"/>
        </div>
        <div class="sa-field">
          <label>Mot de passe</label>
          <input v-model="password" type="password" placeholder="••••••••" class="sa-input" @keydown.enter="submit"/>
        </div>
        <button class="sa-forgot" @click="forgotPassword">Mot de passe oublié ?</button>
      </div>

      <!-- ── INSCRIPTION ────────────────────────────────── -->
      <div v-else class="sa-form">
        <div class="sa-field">
          <label>Prénom et Nom</label>
          <input v-model="displayName" type="text" placeholder="Jean Dupont" class="sa-input"/>
        </div>
        <div class="sa-field">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="votre@email.com" class="sa-input"/>
        </div>
        <div class="sa-field">
          <label>Mot de passe</label>
          <input v-model="password" type="password" placeholder="Minimum 6 caractères" class="sa-input" @keydown.enter="submit"/>
        </div>
        <div class="sa-field">
          <label>Confirmer le mot de passe</label>
          <input v-model="confirmPassword" type="password" placeholder="••••••••" class="sa-input" @keydown.enter="submit"/>
        </div>
      </div>

      <!-- Erreur -->
      <p v-if="error" class="sa-error">{{ error }}</p>

      <!-- Succès -->
      <p v-if="successMsg" class="sa-success">{{ successMsg }}</p>

      <!-- Bouton principal -->
      <button class="sa-submit" @click="submit" :disabled="loading">
        <span v-if="loading" class="sa-spinner"></span>
        <span v-else>{{ mode==='login' ? 'Se connecter' : 'Créer mon compte' }}</span>
      </button>

      <!-- Séparateur -->
      <div class="sa-separator">
        <span>ou</span>
      </div>

      <!-- Google -->
      <button class="sa-google-btn" @click="signInWithGoogle" :disabled="loading">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continuer avec Google
      </button>

      <!-- Retour au store -->
      <button class="sa-back" @click="goToStore">
        ← Retour au store
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { db } from "../firebase.js"
import { doc, getDoc, setDoc } from "firebase/firestore"
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth"

const router = useRouter()
const route  = useRoute()
const auth   = getAuth()

// ── State ─────────────────────────────────────────────────────
const mode            = ref("login")
const email           = ref("")
const password        = ref("")
const confirmPassword = ref("")
const displayName     = ref("")
const error           = ref("")
const successMsg      = ref("")
const loading         = ref(false)

// Infos du store (chargées depuis Firestore)
const storeName = ref("")
const storeLogo = ref("")
const storeUid  = ref("")

// ── Paramètres URL ─────────────────────────────────────────────
// /#/auth?store=mjstore ou /#/auth?uid=jTkXWx...
const storeParam    = route.query.store || route.query.uid || ""
const redirectParam = route.query.redirect || ""

// ── Charger les infos du store ─────────────────────────────────
onMounted(async () => {
  // Si déjà connecté → rediriger
  onAuthStateChanged(auth, (user) => {
    if (user) goAfterAuth()
  })

  if (!storeParam) return
  try {
    // Résoudre slug → uid si besoin
    let uid = storeParam
    if (storeParam.length < 20) {
      // Probablement un slug
      const slugSnap = await getDoc(doc(db, "slugs", storeParam))
      if (slugSnap.exists()) uid = slugSnap.data().uid
    }
    storeUid.value = uid

    const userSnap = await getDoc(doc(db, "users", uid))
    if (userSnap.exists()) {
      storeName.value = userSnap.data().siteName || ""
      storeLogo.value = userSnap.data().siteLogo || ""
    }
  } catch(e) { console.warn("Store load error:", e) }
})

// ── Navigation après auth ──────────────────────────────────────
const goAfterAuth = () => {
  if (redirectParam) {
    router.push(redirectParam)
  } else if (storeParam) {
    router.push(`/site/${storeParam}`)
  } else {
    router.push("/")
  }
}

const goToStore = () => {
  if (storeParam) router.push(`/site/${storeParam}`)
  else router.push("/")
}

// ── Soumission du formulaire ───────────────────────────────────
const submit = async () => {
  error.value      = ""
  successMsg.value = ""

  if (!email.value || !password.value) {
    error.value = "Email et mot de passe obligatoires."
    return
  }

  if (mode.value === "register") {
    if (password.value.length < 6) {
      error.value = "Le mot de passe doit faire au moins 6 caractères."
      return
    }
    if (password.value !== confirmPassword.value) {
      error.value = "Les mots de passe ne correspondent pas."
      return
    }
    if (!displayName.value.trim()) {
      error.value = "Votre nom est obligatoire."
      return
    }
  }

  loading.value = true
  try {
    if (mode.value === "login") {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)
      // Mettre à jour le profil
      await updateProfile(cred.user, { displayName: displayName.value.trim() })
      // Créer le document client dans Firestore
      await setDoc(doc(db, "customers", cred.user.uid), {
        uid:         cred.user.uid,
        email:       email.value.trim().toLowerCase(),
        displayName: displayName.value.trim(),
        storeUid:    storeUid.value || storeParam,
        createdAt:   new Date().toISOString(),
        role:        "customer",
      }, { merge: true })
    }
    goAfterAuth()
  } catch(e) {
    const msgs = {
      "auth/user-not-found":     "Aucun compte trouvé avec cet email.",
      "auth/wrong-password":     "Mot de passe incorrect.",
      "auth/email-already-in-use": "Un compte existe déjà avec cet email.",
      "auth/invalid-email":      "Format d'email invalide.",
      "auth/too-many-requests":  "Trop de tentatives. Réessayez plus tard.",
      "auth/weak-password":      "Mot de passe trop faible (min 6 caractères).",
    }
    error.value = msgs[e.code] || e.message
  } finally {
    loading.value = false
  }
}

// ── Connexion Google ───────────────────────────────────────────
const signInWithGoogle = async () => {
  error.value = ""
  loading.value = true
  try {
    const provider = new GoogleAuthProvider()
    const result   = await signInWithPopup(auth, provider)
    // Créer/mettre à jour le profil client
    await setDoc(doc(db, "customers", result.user.uid), {
      uid:         result.user.uid,
      email:       result.user.email,
      displayName: result.user.displayName || "",
      photoURL:    result.user.photoURL || "",
      storeUid:    storeUid.value || storeParam,
      createdAt:   new Date().toISOString(),
      role:        "customer",
    }, { merge: true })
    goAfterAuth()
  } catch(e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Mot de passe oublié ────────────────────────────────────────
const forgotPassword = async () => {
  if (!email.value) { error.value = "Entrez votre email d'abord."; return }
  try {
    await sendPasswordResetEmail(auth, email.value.trim())
    successMsg.value = "Email de réinitialisation envoyé ✓"
  } catch(e) {
    error.value = e.message
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

.sa-root{min-height:100vh;background:linear-gradient(135deg,#f5f3ff,#ede9fe);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',sans-serif}
.sa-card{background:white;border-radius:24px;padding:36px 32px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(108,99,255,.15);display:flex;flex-direction:column;gap:18px}

/* Brand */
.sa-brand{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.sa-brand-logo{width:64px;height:64px;border-radius:14px;object-fit:contain}
.sa-brand-icon{width:64px;height:64px;background:linear-gradient(135deg,#6c63ff,#a78bfa);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;color:white}
.sa-brand-name{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:#1a1a2e}

/* Tabs */
.sa-tabs{display:flex;background:#f3f4f6;border-radius:10px;padding:3px;gap:3px}
.sa-tab{flex:1;padding:9px;background:none;border:none;border-radius:8px;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.sa-tab.active{background:white;color:#6c63ff;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.1)}

/* Form */
.sa-form{display:flex;flex-direction:column;gap:12px}
.sa-field{display:flex;flex-direction:column;gap:5px}
.sa-field label{font-size:12px;font-weight:600;color:#374151}
.sa-input{padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;color:#1a1a2e;transition:border-color .15s}
.sa-input:focus{border-color:#6c63ff;box-shadow:0 0 0 3px rgba(108,99,255,.1)}
.sa-forgot{background:none;border:none;color:#6c63ff;font-size:12px;cursor:pointer;text-align:right;font-family:'DM Sans',sans-serif;padding:0;align-self:flex-end}
.sa-forgot:hover{text-decoration:underline}

/* Messages */
.sa-error{background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:10px 14px;border-radius:9px;font-size:13px;line-height:1.5}
.sa-success{background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;padding:10px 14px;border-radius:9px;font-size:13px}

/* Submit */
.sa-submit{width:100%;padding:14px;background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.sa-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(108,99,255,.4)}
.sa-submit:disabled{opacity:.6;cursor:not-allowed}
.sa-spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:sa-spin .6s linear infinite}
@keyframes sa-spin{to{transform:rotate(360deg)}}

/* Separator */
.sa-separator{display:flex;align-items:center;gap:12px;color:#9ca3af;font-size:12px}
.sa-separator::before,.sa-separator::after{content:'';flex:1;border-top:1px solid #e5e7eb}

/* Google */
.sa-google-btn{width:100%;padding:12px;background:white;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;color:#374151;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .15s}
.sa-google-btn:hover:not(:disabled){background:#f9fafb;border-color:#6c63ff}
.sa-google-btn:disabled{opacity:.6}

/* Back */
.sa-back{background:none;border:none;color:#9ca3af;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:center;transition:color .15s;padding:4px}
.sa-back:hover{color:#6c63ff}

@media(max-width:420px){.sa-card{padding:28px 20px;border-radius:0;min-height:100vh}}
</style>
