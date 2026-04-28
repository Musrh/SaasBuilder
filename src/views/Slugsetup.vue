<!-- ============================================================
  SlugSetup.vue — Choix du slug avant d'accéder au Builder
  Affiché une seule fois au premier accès, ou modifiable ensuite
============================================================ -->
<template>
  <div class="ss-root">

    <!-- Header -->
    <header class="ss-header">
      <div class="ss-brand">🏗️ SaasBuilder</div>
      <button @click="logout" class="ss-logout">Déconnexion</button>
    </header>

    <main class="ss-main">

      <!-- Étape 1 : Choisir son slug -->
      <div v-if="step === 'slug'" class="ss-card">
        <div class="ss-icon">🌐</div>
        <h1 class="ss-title">Choisissez l'adresse de votre store</h1>
        <p class="ss-sub">
          Votre boutique sera accessible à cette adresse.<br/>
          Vous pourrez la modifier plus tard depuis le builder.
        </p>

        <!-- Prévisualisation URL -->
        <div class="ss-url-preview">
          <span class="ss-url-base">{{ BASE_DOMAIN }}/</span>
          <span class="ss-url-slug" :class="slugValid ? 'valid' : 'invalid'">
            {{ slugInput || 'votre-boutique' }}
          </span>
        </div>

        <!-- Input slug -->
        <div class="ss-field">
          <label class="ss-label">Nom de votre boutique (slug)</label>
          <div class="ss-input-wrap">
            <span class="ss-input-prefix">{{ BASE_DOMAIN }}/</span>
            <input
              v-model="slugInput"
              class="ss-input"
              placeholder="ma-boutique"
              @input="onSlugInput"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <p class="ss-input-hint">
            Lettres minuscules, chiffres et tirets uniquement. Min. 3 caractères.
          </p>
        </div>

        <!-- Statut disponibilité -->
        <div v-if="slugChecking" class="ss-status ss-status-checking">
          <div class="ss-spinner-sm"></div> Vérification...
        </div>
        <div v-else-if="slugInput.length >= 3 && slugTaken" class="ss-status ss-status-taken">
          ✗ « {{ slugInput }} » est déjà pris
        </div>
        <div v-else-if="slugInput.length >= 3 && slugValid && !slugTaken" class="ss-status ss-status-ok">
          ✓ Disponible !
        </div>
        <div v-else-if="slugInput.length > 0 && slugInput.length < 3" class="ss-status ss-status-warn">
          ⚠ Minimum 3 caractères
        </div>

        <!-- Suggestions basées sur l'email -->
        <div v-if="suggestions.length" class="ss-suggestions">
          <p class="ss-suggestions-label">Suggestions :</p>
          <div class="ss-suggestions-list">
            <button
              v-for="s in suggestions" :key="s"
              class="ss-suggestion-btn"
              @click="selectSuggestion(s)"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Bouton continuer -->
        <button
          @click="confirmSlug"
          :disabled="!slugValid || slugTaken || slugChecking || loading"
          class="ss-btn ss-btn-primary"
        >
          <span v-if="loading"><div class="ss-spinner-sm ss-spinner-white"></div> Enregistrement...</span>
          <span v-else>Continuer vers le builder →</span>
        </button>

        <!-- Option : utiliser email comme slug -->
        <button @click="useEmail" class="ss-btn-ghost">
          Utiliser mon email comme identifiant
        </button>
      </div>

      <!-- Étape 2 : Confirmation -->
      <div v-if="step === 'done'" class="ss-card ss-card-done">
        <div class="ss-icon">🎉</div>
        <h1 class="ss-title">Votre boutique est prête !</h1>
        <div class="ss-url-confirmed">
          <span class="ss-url-label">Votre adresse :</span>
          <a :href="storeUrl" target="_blank" class="ss-url-link">
            {{ storeUrl }}
          </a>
        </div>
        <p class="ss-done-hint">
          Vous pourrez modifier cette adresse et ajouter votre propre domaine depuis le builder (bouton Publier).
        </p>
        <button @click="goToBuilder" class="ss-btn ss-btn-primary">
          🏗️ Accéder au builder →
        </button>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { signOut } from "firebase/auth"

const router = useRouter()

// ── Config domaine ────────────────────────────────────────────
// Remplacez par votre domaine personnalisé si disponible
const BASE_DOMAIN = "musrh.github.io/SaasBuilder/#/site"

// ── État ──────────────────────────────────────────────────────
const step         = ref("slug")
const slugInput    = ref("")
const slugChecking = ref(false)
const slugTaken    = ref(false)
const loading      = ref(false)
const suggestions  = ref([])
const currentUser  = ref(null)
const savedSlug    = ref("")

let checkTimeout = null

// ── URL du store ──────────────────────────────────────────────
const storeUrl = computed(() =>
  `https://musrh.github.io/SaasBuilder/#/site/${slugInput.value}`
)

// ── Validation du slug ────────────────────────────────────────
const slugValid = computed(() => /^[a-z0-9-]{3,30}$/.test(slugInput.value))

// ── Montage ───────────────────────────────────────────────────
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) { router.push("/auth"); return }
    currentUser.value = user

    // Vérifier si l'utilisateur a déjà un slug
    const snap = await getDoc(doc(db, "users", user.uid))
    if (snap.exists() && snap.data().publishedSlug) {
      // Déjà configuré → aller directement au builder
      router.push("/saasgenerator")
      return
    }

    // Générer des suggestions depuis l'email
    generateSuggestions(user.email)
  })
})

// ── Générer suggestions depuis l'email ───────────────────────
const generateSuggestions = (email) => {
  if (!email) return
  const base = email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  const list = new Set()
  if (base.length >= 3) list.add(base)
  if (base.length >= 3) list.add(base + "-store")
  if (base.length >= 3) list.add(base + "-shop")
  if (base.length >= 3) list.add("boutique-" + base.slice(0, 10))
  suggestions.value = [...list].slice(0, 4)
}

// ── Input : normaliser + vérifier disponibilité ───────────────
const onSlugInput = () => {
  // Normaliser
  slugInput.value = slugInput.value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .slice(0, 30)

  slugTaken.value = false
  if (!slugValid.value) return

  // Debounce 500ms
  clearTimeout(checkTimeout)
  slugChecking.value = true
  checkTimeout = setTimeout(() => checkSlugAvailability(), 500)
}

// ── Vérifier disponibilité dans Firestore ─────────────────────
const checkSlugAvailability = async () => {
  try {
    const snap = await getDoc(doc(db, "slugs", slugInput.value))
    // Si le slug existe ET appartient à quelqu'un d'autre → pris
    if (snap.exists() && snap.data().uid !== currentUser.value?.uid) {
      slugTaken.value = true
    } else {
      slugTaken.value = false
    }
  } catch(e) {
    slugTaken.value = false
  } finally {
    slugChecking.value = false
  }
}

// ── Sélectionner une suggestion ───────────────────────────────
const selectSuggestion = async (s) => {
  slugInput.value = s
  slugChecking.value = true
  slugTaken.value = false
  await checkSlugAvailability()
}

// ── Utiliser l'email comme slug ───────────────────────────────
const useEmail = () => {
  if (!currentUser.value?.email) return
  const emailSlug = currentUser.value.email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30)
  slugInput.value = emailSlug
  onSlugInput()
}

// ── Confirmer le slug ─────────────────────────────────────────
const confirmSlug = async () => {
  if (!slugValid.value || slugTaken.value || !currentUser.value) return
  loading.value = true
  try {
    const uid  = currentUser.value.uid
    const slug = slugInput.value

    // Sauvegarder dans Firestore
    await setDoc(doc(db, "users", uid), {
      publishedSlug: slug,
      slugSetAt:     new Date().toISOString(),
    }, { merge: true })

    await setDoc(doc(db, "slugs", slug), {
      uid,
      slug,
      createdAt: new Date().toISOString(),
    })

    step.value = "done"
  } catch(e) {
    console.error("confirmSlug:", e)
  } finally {
    loading.value = false
  }
}

// ── Aller au builder ──────────────────────────────────────────
const goToBuilder = () => {
  router.push("/saasgenerator")
}

// ── Déconnexion ───────────────────────────────────────────────
const logout = async () => {
  await signOut(auth)
  router.push("/")
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.ss-root {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1040 60%, #0f0f1a 100%);
  font-family: 'DM Sans', sans-serif;
  color: #f0f0f0;
  display: flex;
  flex-direction: column;
}

/* Header */
.ss-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 58px;
  background: rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(12px);
}
.ss-brand  { font-size: 16px; font-weight: 700; color: #fff; }
.ss-logout { background: none; border: 1px solid rgba(255,255,255,.15); color: rgba(255,255,255,.5); font-size: 12px; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: .15s; font-family: 'DM Sans', sans-serif; }
.ss-logout:hover { color: #fff; border-color: rgba(255,255,255,.3); }

/* Main */
.ss-main {
  flex: 1; display: flex; align-items: flex-start;
  justify-content: center; padding: 48px 20px 60px;
}

/* Card */
.ss-card {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 24px;
  padding: 40px 36px;
  width: 100%; max-width: 520px;
  display: flex; flex-direction: column; gap: 20px;
  backdrop-filter: blur(16px);
  box-shadow: 0 24px 64px rgba(0,0,0,.4);
}
.ss-card-done { align-items: center; text-align: center; }

.ss-icon  { font-size: 48px; text-align: center; }
.ss-title { font-size: 24px; font-weight: 800; color: #fff; text-align: center; line-height: 1.2; }
.ss-sub   { font-size: 14px; color: rgba(255,255,255,.55); text-align: center; line-height: 1.6; }

/* Prévisualisation URL */
.ss-url-preview {
  background: rgba(108,99,255,.15);
  border: 1px solid rgba(108,99,255,.3);
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
  word-break: break-all;
}
.ss-url-base   { color: rgba(255,255,255,.5); }
.ss-url-slug   { transition: color .2s; }
.ss-url-slug.valid   { color: #a78bfa; }
.ss-url-slug.invalid { color: rgba(255,255,255,.3); }

/* Champ */
.ss-field { display: flex; flex-direction: column; gap: 8px; }
.ss-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,.6); text-transform: uppercase; letter-spacing: .5px; }
.ss-input-wrap {
  display: flex; align-items: center;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color .2s;
}
.ss-input-wrap:focus-within { border-color: rgba(108,99,255,.7); background: rgba(108,99,255,.1); }
.ss-input-prefix {
  padding: 13px 0 13px 16px;
  font-size: 13px;
  color: rgba(255,255,255,.35);
  white-space: nowrap;
  flex-shrink: 0;
}
.ss-input {
  flex: 1;
  padding: 13px 16px 13px 4px;
  background: none;
  border: none;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  min-width: 0;
}
.ss-input::placeholder { color: rgba(255,255,255,.25); font-weight: 400; }
.ss-input-hint { font-size: 11px; color: rgba(255,255,255,.35); }

/* Statuts */
.ss-status { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; }
.ss-status-checking { background: rgba(255,255,255,.06); color: rgba(255,255,255,.5); }
.ss-status-ok       { background: rgba(34,197,94,.15);   color: #22c55e; border: 1px solid rgba(34,197,94,.3); }
.ss-status-taken    { background: rgba(239,68,68,.12);   color: #ef4444; border: 1px solid rgba(239,68,68,.3); }
.ss-status-warn     { background: rgba(234,179,8,.1);    color: #fbbf24; border: 1px solid rgba(234,179,8,.25); }

/* Suggestions */
.ss-suggestions       { display: flex; flex-direction: column; gap: 8px; }
.ss-suggestions-label { font-size: 11px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .5px; }
.ss-suggestions-list  { display: flex; flex-wrap: wrap; gap: 8px; }
.ss-suggestion-btn {
  background: rgba(108,99,255,.15); border: 1px solid rgba(108,99,255,.3);
  color: #a78bfa; font-size: 13px; font-weight: 600;
  padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: .15s;
  font-family: 'DM Sans', sans-serif;
}
.ss-suggestion-btn:hover { background: rgba(108,99,255,.3); color: #fff; }

/* Boutons */
.ss-btn {
  width: 100%; padding: 15px; border: none; border-radius: 13px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  font-family: 'DM Sans', sans-serif; transition: all .2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ss-btn:disabled { opacity: .4; cursor: not-allowed; transform: none !important; }
.ss-btn-primary  { background: linear-gradient(135deg, #6c63ff, #4f46e5); color: #fff; box-shadow: 0 4px 20px rgba(108,99,255,.4); }
.ss-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(108,99,255,.5); }
.ss-btn-ghost    { background: none; border: none; color: rgba(255,255,255,.4); font-size: 13px; cursor: pointer; text-align: center; font-family: 'DM Sans', sans-serif; padding: 4px; transition: .15s; }
.ss-btn-ghost:hover { color: rgba(255,255,255,.75); }

/* Done */
.ss-url-confirmed { display: flex; flex-direction: column; gap: 6px; align-items: center; background: rgba(108,99,255,.15); border: 1px solid rgba(108,99,255,.3); border-radius: 12px; padding: 16px 20px; width: 100%; }
.ss-url-label     { font-size: 11px; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: .5px; }
.ss-url-link      { color: #a78bfa; font-size: 14px; font-weight: 600; word-break: break-all; text-decoration: none; }
.ss-url-link:hover { text-decoration: underline; }
.ss-done-hint     { font-size: 13px; color: rgba(255,255,255,.45); text-align: center; line-height: 1.6; }

/* Spinner */
.ss-spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(108,99,255,.3); border-top-color: #6c63ff; border-radius: 50%; animation: ss-spin .7s linear infinite; }
.ss-spinner-white { border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; }
@keyframes ss-spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 560px) {
  .ss-card  { padding: 28px 20px; border-radius: 20px; }
  .ss-title { font-size: 20px; }
  .ss-icon  { font-size: 40px; }
  .ss-main  { padding: 28px 12px 48px; }
  .ss-input-prefix { font-size: 11px; }
}
</style>
