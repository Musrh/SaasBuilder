<template>
  <div class="ss-root">

    <!-- Header -->
    <header class="ss-header">
      <div class="ss-brand">🏗️ SaasBuilder</div>
      <button @click="logout" class="ss-logout">Déconnexion</button>
    </header>

    <main class="ss-main">

      <!-- ── ÉTAPE 1 : Choisir son slug ── -->
      <div v-if="step === 'slug'" class="ss-card">
        <div class="ss-icon">🌐</div>
        <h1 class="ss-title">Choisissez l'adresse de votre store</h1>
        <p class="ss-sub">
          Votre boutique sera accessible à cette adresse.<br/>
          Vous pourrez la modifier plus tard depuis le builder.
        </p>

        <!-- Prévisualisation URL -->
        <div class="ss-url-preview">
          <span class="ss-url-base">mronlinestores.com/</span>
          <span class="ss-url-slug" :class="slugValid ? 'valid' : 'invalid'">
            {{ slugInput || 'votre-boutique' }}
          </span>
        </div>

        <!-- Input slug -->
        <div class="ss-field">
          <label class="ss-label">Nom de votre boutique (slug)</label>
          <div class="ss-input-wrap">
            <span class="ss-input-prefix">mronlinestores.com/</span>
            <input
              v-model="slugInput"
              class="ss-input"
              placeholder="ma-boutique"
              @input="onSlugInput"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <p class="ss-input-hint">Lettres minuscules, chiffres et tirets uniquement. Min. 3 caractères.</p>
        </div>

        <!-- Statut disponibilité -->
        <div v-if="slugChecking" class="ss-status ss-checking">
          <div class="ss-spinner-sm"></div> Vérification...
        </div>
        <div v-else-if="slugInput.length >= 3 && slugTaken" class="ss-status ss-taken">
          ✗ « {{ slugInput }} » est déjà pris
        </div>
        <div v-else-if="slugInput.length >= 3 && slugValid && !slugTaken" class="ss-status ss-ok">
          ✓ Disponible — mronlinestores.com/{{ slugInput }}
        </div>
        <div v-else-if="slugInput.length > 0 && slugInput.length < 3" class="ss-status ss-warn">
          ⚠ Minimum 3 caractères
        </div>

        <!-- Suggestions -->
        <div v-if="suggestions.length" class="ss-suggestions">
          <p class="ss-suggestions-label">Suggestions :</p>
          <div class="ss-suggestions-list">
            <button v-for="s in suggestions" :key="s" class="ss-suggestion" @click="selectSuggestion(s)">
              {{ s }}
            </button>
          </div>
        </div>

        <!-- Bouton continuer -->
        <button
          @click="confirmSlug"
          :disabled="!slugValid || slugTaken || slugChecking || loading"
          class="ss-btn ss-btn-primary"
        >
          <div v-if="loading" class="ss-spinner-sm ss-spinner-white"></div>
          <span>{{ loading ? 'Enregistrement...' : 'Continuer vers le builder →' }}</span>
        </button>

        <button @click="useEmail" class="ss-btn-ghost">
          Utiliser mon email comme identifiant
        </button>
      </div>

      <!-- ── ÉTAPE 2 : Confirmation + domaine custom ── -->
      <div v-if="step === 'done'" class="ss-card">
        <div class="ss-icon">🎉</div>
        <h1 class="ss-title">Votre boutique est prête !</h1>

        <!-- URL confirmée -->
        <div class="ss-url-confirmed">
          <span class="ss-url-clabel">Votre adresse publique</span>
          <a :href="storeUrl" target="_blank" class="ss-url-link">
            mronlinestores.com/{{ slugInput }}
          </a>
        </div>

        <!-- Section domaine personnalisé -->
        <div class="ss-domain-section">
          <div class="ss-domain-header" @click="showDomainInfo = !showDomainInfo">
            <span>🔗 Utiliser votre propre domaine</span>
            <span class="ss-domain-toggle">{{ showDomainInfo ? '▲' : '▼' }}</span>
          </div>

          <div v-if="showDomainInfo" class="ss-domain-body">
            <p class="ss-domain-desc">
              Pour utiliser <strong>votredomaine.com</strong> à la place de mronlinestores.com,
              configurez ces enregistrements DNS chez votre registrar (OVH, Namecheap, Cloudflare...) :
            </p>

            <!-- Enregistrements A -->
            <div class="ss-dns-block">
              <p class="ss-dns-label">Enregistrements A (pointent vers GitHub Pages)</p>
              <div class="ss-dns-table">
                <div v-for="ip in githubIPs" :key="ip" class="ss-dns-row">
                  <span class="ss-dns-type">A</span>
                  <span class="ss-dns-name">@</span>
                  <span class="ss-dns-value">{{ ip }}</span>
                  <button class="ss-copy-btn" @click="copyText(ip)" :title="'Copier ' + ip">
                    {{ copied === ip ? '✓' : '📋' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- CNAME www -->
            <div class="ss-dns-block">
              <p class="ss-dns-label">Enregistrement CNAME (pour www)</p>
              <div class="ss-dns-table">
                <div class="ss-dns-row">
                  <span class="ss-dns-type">CNAME</span>
                  <span class="ss-dns-name">www</span>
                  <span class="ss-dns-value">musrh.github.io</span>
                  <button class="ss-copy-btn" @click="copyText('musrh.github.io')">
                    {{ copied === 'musrh.github.io' ? '✓' : '📋' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="ss-dns-note">
              <strong>📌 Étapes :</strong><br/>
              1. Ajoutez ces enregistrements chez votre registrar<br/>
              2. Dans le builder → Publier → entrez votre domaine<br/>
              3. Activez HTTPS dans GitHub Pages Settings<br/>
              4. Propagation DNS : 15 min à 24h
            </div>

            <!-- Input domaine custom -->
            <div class="ss-domain-input-wrap">
              <input
                v-model="customDomain"
                class="ss-domain-input"
                placeholder="votredomaine.com"
              />
              <button @click="saveDomain" class="ss-domain-save-btn" :disabled="!customDomain.trim()">
                Sauvegarder
              </button>
            </div>
            <p v-if="domainSaved" class="ss-domain-saved">✓ Domaine sauvegardé dans votre profil</p>
          </div>
        </div>

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
import { doc, getDoc, setDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"

const router = useRouter()

// ── IPs GitHub Pages ──────────────────────────────────────────
const githubIPs = [
  "185.199.108.153",
  "185.199.109.153",
  "185.199.110.153",
  "185.199.111.153",
]

// ── État ──────────────────────────────────────────────────────
const step           = ref("slug")
const slugInput      = ref("")
const slugChecking   = ref(false)
const slugTaken      = ref(false)
const loading        = ref(false)
const suggestions    = ref([])
const currentUser    = ref(null)
const showDomainInfo = ref(false)
const customDomain   = ref("")
const domainSaved    = ref(false)
const copied         = ref("")

let checkTimeout = null

// ── URL du store ──────────────────────────────────────────────
const storeUrl = computed(() =>
  `https://mronlinestores.com/#/site/${slugInput.value}`
)

// ── Validation slug ───────────────────────────────────────────
const slugValid = computed(() => /^[a-z0-9-]{3,30}$/.test(slugInput.value))

// ── Montage ───────────────────────────────────────────────────
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) { router.push("/auth"); return }
    currentUser.value = user

    const snap = await getDoc(doc(db, "users", user.uid))
    if (snap.exists() && snap.data().publishedSlug) {
      router.push("/saasgenerator"); return
    }
    generateSuggestions(user.email)
  })
})

// ── Suggestions depuis email ──────────────────────────────────
const generateSuggestions = (email) => {
  if (!email) return
  const base = email.split("@")[0]
    .toLowerCase().replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "")
  const list = []
  if (base.length >= 3) list.push(base, base + "-store", base + "-shop", "boutique-" + base.slice(0, 10))
  suggestions.value = list.slice(0, 4)
}

// ── Input slug ────────────────────────────────────────────────
const onSlugInput = () => {
  slugInput.value = slugInput.value
    .toLowerCase().replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-").replace(/^-/, "").slice(0, 30)
  slugTaken.value = false
  if (!slugValid.value) return
  clearTimeout(checkTimeout)
  slugChecking.value = true
  checkTimeout = setTimeout(checkSlugAvailability, 500)
}

// ── Vérifier disponibilité ────────────────────────────────────
const checkSlugAvailability = async () => {
  try {
    const snap = await getDoc(doc(db, "slugs", slugInput.value))
    slugTaken.value = snap.exists() && snap.data().uid !== currentUser.value?.uid
  } catch { slugTaken.value = false }
  finally   { slugChecking.value = false }
}

const selectSuggestion = async (s) => {
  slugInput.value = s; slugChecking.value = true; slugTaken.value = false
  await checkSlugAvailability()
}

const useEmail = () => {
  if (!currentUser.value?.email) return
  slugInput.value = currentUser.value.email.split("@")[0]
    .toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30)
  onSlugInput()
}

// ── Confirmer le slug ─────────────────────────────────────────
const confirmSlug = async () => {
  if (!slugValid.value || slugTaken.value || !currentUser.value) return
  loading.value = true
  try {
    const uid  = currentUser.value.uid
    const slug = slugInput.value
    await setDoc(doc(db, "users", uid), {
      publishedSlug: slug, slugSetAt: new Date().toISOString(),
    }, { merge: true })
    await setDoc(doc(db, "slugs", slug), {
      uid, slug, createdAt: new Date().toISOString(),
    })
    step.value = "done"
  } catch(e) { console.error(e) }
  finally { loading.value = false }
}

// ── Sauvegarder domaine custom ────────────────────────────────
const saveDomain = async () => {
  if (!customDomain.value.trim() || !currentUser.value) return
  try {
    await setDoc(doc(db, "users", currentUser.value.uid), {
      customDomain: customDomain.value.trim().toLowerCase()
    }, { merge: true })
    domainSaved.value = true
    setTimeout(() => domainSaved.value = false, 3000)
  } catch(e) { console.error(e) }
}

// ── Copier dans le presse-papier ──────────────────────────────
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = text
    setTimeout(() => copied.value = "", 2000)
  } catch {
    // Fallback pour navigateurs sans clipboard API
    const ta = document.createElement("textarea")
    ta.value = text; ta.style.position = "fixed"
    document.body.appendChild(ta); ta.select()
    document.execCommand("copy")
    document.body.removeChild(ta)
    copied.value = text
    setTimeout(() => copied.value = "", 2000)
  }
}

const goToBuilder = () => router.push("/saasgenerator")
const logout      = async () => { await signOut(auth); router.push("/") }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }

.ss-root {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1040 60%, #0f0f1a 100%);
  font-family: 'DM Sans', sans-serif; color: #f0f0f0;
  display: flex; flex-direction: column;
}

/* Header */
.ss-header { display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:58px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.08);backdrop-filter:blur(12px); }
.ss-brand  { font-size:16px;font-weight:700;color:#fff; }
.ss-logout { background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.5);font-size:12px;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:.15s; }
.ss-logout:hover { color:#fff;border-color:rgba(255,255,255,.3); }

/* Main */
.ss-main { flex:1;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px 60px; }

/* Card */
.ss-card { background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:36px 28px;width:100%;max-width:500px;display:flex;flex-direction:column;gap:18px;backdrop-filter:blur(16px);box-shadow:0 24px 64px rgba(0,0,0,.4); }
.ss-icon  { font-size:44px;text-align:center; }
.ss-title { font-size:22px;font-weight:800;color:#fff;text-align:center;line-height:1.2; }
.ss-sub   { font-size:13px;color:rgba(255,255,255,.5);text-align:center;line-height:1.6; }

/* URL preview */
.ss-url-preview { background:rgba(108,99,255,.15);border:1px solid rgba(108,99,255,.3);border-radius:12px;padding:14px 18px;font-size:14px;font-weight:600;word-break:break-all; }
.ss-url-base    { color:rgba(255,255,255,.45); }
.ss-url-slug.valid   { color:#a78bfa; }
.ss-url-slug.invalid { color:rgba(255,255,255,.25); }

/* Field */
.ss-field { display:flex;flex-direction:column;gap:7px; }
.ss-label { font-size:11px;font-weight:700;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.6px; }
.ss-input-wrap { display:flex;align-items:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;overflow:hidden;transition:.2s; }
.ss-input-wrap:focus-within { border-color:rgba(108,99,255,.7);background:rgba(108,99,255,.1); }
.ss-input-prefix { padding:13px 0 13px 14px;font-size:12px;color:rgba(255,255,255,.35);white-space:nowrap;flex-shrink:0; }
.ss-input { flex:1;padding:13px 14px 13px 4px;background:none;border:none;color:#fff;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;outline:none;min-width:0; }
.ss-input::placeholder { color:rgba(255,255,255,.2);font-weight:400; }
.ss-input-hint { font-size:11px;color:rgba(255,255,255,.3); }

/* Statuts */
.ss-status   { display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;padding:8px 13px;border-radius:8px; }
.ss-checking { background:rgba(255,255,255,.06);color:rgba(255,255,255,.45); }
.ss-ok       { background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25); }
.ss-taken    { background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.25); }
.ss-warn     { background:rgba(234,179,8,.08);color:#fbbf24;border:1px solid rgba(234,179,8,.2); }

/* Suggestions */
.ss-suggestions { display:flex;flex-direction:column;gap:8px; }
.ss-suggestions-label { font-size:10px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px; }
.ss-suggestions-list  { display:flex;flex-wrap:wrap;gap:7px; }
.ss-suggestion { background:rgba(108,99,255,.15);border:1px solid rgba(108,99,255,.3);color:#a78bfa;font-size:13px;font-weight:600;padding:6px 13px;border-radius:8px;cursor:pointer;transition:.15s;font-family:'DM Sans',sans-serif; }
.ss-suggestion:hover  { background:rgba(108,99,255,.3);color:#fff; }

/* Boutons */
.ss-btn { width:100%;padding:14px;border:none;border-radius:13px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:.2s;display:flex;align-items:center;justify-content:center;gap:8px; }
.ss-btn:disabled { opacity:.4;cursor:not-allowed; }
.ss-btn-primary  { background:linear-gradient(135deg,#6c63ff,#4f46e5);color:#fff;box-shadow:0 4px 20px rgba(108,99,255,.35); }
.ss-btn-primary:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 8px 28px rgba(108,99,255,.45); }
.ss-btn-ghost    { background:none;border:none;color:rgba(255,255,255,.35);font-size:13px;cursor:pointer;text-align:center;font-family:'DM Sans',sans-serif;padding:4px;transition:.15s; }
.ss-btn-ghost:hover { color:rgba(255,255,255,.7); }

/* Done / URL confirmée */
.ss-url-confirmed { background:rgba(108,99,255,.15);border:1px solid rgba(108,99,255,.3);border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:6px; }
.ss-url-clabel    { font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px; }
.ss-url-link      { color:#a78bfa;font-size:14px;font-weight:700;word-break:break-all;text-decoration:none; }
.ss-url-link:hover { text-decoration:underline; }

/* Section domaine custom */
.ss-domain-section { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden; }
.ss-domain-header  { display:flex;align-items:center;justify-content:space-between;padding:14px 18px;cursor:pointer;font-size:14px;font-weight:600;color:rgba(255,255,255,.75);transition:.15s; }
.ss-domain-header:hover { background:rgba(255,255,255,.04); }
.ss-domain-toggle  { font-size:12px;color:rgba(255,255,255,.35); }
.ss-domain-body    { padding:0 18px 18px;display:flex;flex-direction:column;gap:14px;border-top:1px solid rgba(255,255,255,.07); }
.ss-domain-desc    { font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;padding-top:14px; }

/* DNS table */
.ss-dns-block { display:flex;flex-direction:column;gap:7px; }
.ss-dns-label { font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px; }
.ss-dns-table { display:flex;flex-direction:column;gap:4px; }
.ss-dns-row   { display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.2);border-radius:8px;padding:8px 12px;font-size:12px;font-family:monospace; }
.ss-dns-type  { background:rgba(108,99,255,.3);color:#a78bfa;padding:2px 7px;border-radius:5px;font-weight:700;font-size:11px;font-family:'DM Sans',sans-serif;flex-shrink:0; }
.ss-dns-name  { color:rgba(255,255,255,.5);flex-shrink:0;min-width:28px; }
.ss-dns-value { color:#f0f0f0;flex:1;font-size:12px; }
.ss-copy-btn  { background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.5);border-radius:5px;padding:4px 8px;cursor:pointer;font-size:12px;transition:.15s;flex-shrink:0; }
.ss-copy-btn:hover { background:rgba(108,99,255,.3);color:#a78bfa; }

.ss-dns-note { font-size:11px;color:rgba(255,255,255,.4);background:rgba(255,255,255,.04);border-radius:8px;padding:10px 12px;line-height:1.7;border-left:3px solid rgba(108,99,255,.4); }

/* Input domaine custom */
.ss-domain-input-wrap { display:flex;gap:8px; }
.ss-domain-input { flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:13px;padding:10px 13px;font-family:'DM Sans',sans-serif;outline:none;min-width:0; }
.ss-domain-input:focus { border-color:rgba(108,99,255,.5); }
.ss-domain-input::placeholder { color:rgba(255,255,255,.25); }
.ss-domain-save-btn { background:rgba(108,99,255,.3);border:1px solid rgba(108,99,255,.4);color:#a78bfa;font-size:13px;font-weight:600;padding:10px 14px;border-radius:10px;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;transition:.15s; }
.ss-domain-save-btn:hover:not(:disabled) { background:rgba(108,99,255,.5);color:#fff; }
.ss-domain-save-btn:disabled { opacity:.4;cursor:not-allowed; }
.ss-domain-saved { font-size:12px;color:#22c55e;font-weight:600; }

/* Spinner */
.ss-spinner-sm { width:16px;height:16px;border:2px solid rgba(108,99,255,.3);border-top-color:#6c63ff;border-radius:50%;animation:ss-spin .7s linear infinite;flex-shrink:0; }
.ss-spinner-white { border:2px solid rgba(255,255,255,.3);border-top-color:#fff; }
@keyframes ss-spin { to { transform:rotate(360deg); } }

/* Responsive */
@media(max-width:520px) {
  .ss-card { padding:24px 16px; }
  .ss-title { font-size:19px; }
  .ss-input-prefix { font-size:10px;padding-left:10px; }
  .ss-dns-row { flex-wrap:wrap; }
}
</style>
