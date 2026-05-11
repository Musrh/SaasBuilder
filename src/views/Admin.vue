<!-- ============================================================
  Admin.vue — Dashboard administrateur SaasBuilder
  Accessible uniquement pour l'email admin défini
  Route : /#/admin
============================================================ -->
<template>
  <div class="adm-root">

    <!-- HEADER -->
    <header class="adm-header">
      <div class="adm-brand">
        <span class="adm-logo">⚙</span>
        <span class="adm-title">Admin SaasBuilder</span>
      </div>
      <div class="adm-header-right">
        <span class="adm-admin-email">{{ currentUser?.email }}</span>
        <button class="adm-logout" @click="logout">Déconnexion</button>
      </div>
    </header>

    <!-- CHARGEMENT -->
    <div v-if="loading" class="adm-loading">
      <div class="adm-spinner"></div>
      <p>Chargement des stores...</p>
    </div>

    <!-- ACCÈS REFUSÉ -->
    <div v-else-if="!isAdmin" class="adm-denied">
      <span class="adm-denied-icon">🚫</span>
      <h2>Accès refusé</h2>
      <p>Vous n'avez pas les droits d'administration.</p>
      <button @click="$router.push('/')" class="adm-btn-back">← Retour</button>
    </div>

    <!-- CONTENU ADMIN -->
    <main v-else class="adm-main">

      <!-- Statistiques rapides -->
      <div class="adm-stats">
        <div class="adm-stat-card">
          <span class="adm-stat-icon">👥</span>
          <div>
            <div class="adm-stat-val">{{ owners.length }}</div>
            <div class="adm-stat-label">Propriétaires</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <span class="adm-stat-icon">✅</span>
          <div>
            <div class="adm-stat-val">{{ owners.filter(o=>o.active!==false && o.paye).length }}</div>
            <div class="adm-stat-label">Actifs payants</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <span class="adm-stat-icon">🆓</span>
          <div>
            <div class="adm-stat-val">{{ owners.filter(o=>o.plan==="free").length }}</div>
            <div class="adm-stat-label">Plans Free</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <span class="adm-stat-icon">🔴</span>
          <div>
            <div class="adm-stat-val">{{ owners.filter(o=>o.active===false).length }}</div>
            <div class="adm-stat-label">Désactivés</div>
          </div>
        </div>
        <div class="adm-stat-card adm-stat-warning" @click="filterPlan=''; search='expiring'">
          <span class="adm-stat-icon">⚠️</span>
          <div>
            <div class="adm-stat-val adm-stat-val-warn">{{ expiringSoon.length }}</div>
            <div class="adm-stat-label">Expirent dans 7j</div>
          </div>
        </div>
      </div>

      <!-- Barre de recherche -->
      <div class="adm-toolbar">
        <input
          v-model="search"
          class="adm-search"
          placeholder="🔍 Rechercher par email ou slug..."
        />
        <select v-model="filterPlan" class="adm-filter">
          <option value="">Tous les plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        <button class="adm-btn-refresh" @click="loadOwners">🔄 Actualiser</button>
        <button class="adm-btn-stripe-check" @click="loadStripeAccounts" :disabled="stripeLoading">
          {{ stripeLoading ? '⏳...' : '💳 Stripe (' + stripeAccounts.pending.length + ' en attente)' }}
        </button>
        <button
          class="adm-btn-check-expiry"
          @click="runCheckExpiry"
          :disabled="checkExpiryLoading"
          title="Désactiver les comptes expirés maintenant"
        >
          <span v-if="checkExpiryLoading" class="adm-spinner-sm"/>
          <span v-else>⏰ Vérifier expirés</span>
        </button>
        <button class="adm-btn-export" @click="exportCSV" title="Exporter en CSV">📥 Export CSV</button>
      </div>

      <!-- ── Stripe Connect : en attente de vérification ── -->
      <div v-if="stripeAccounts.pending.length" class="adm-stripe-pending-section">
        <h3 class="adm-stripe-title">
          💳 Stripe Connect — En attente de vérification
          <span class="adm-stripe-count">{{ stripeAccounts.pending.length }}</span>
        </h3>
        <div class="adm-stripe-list">
          <div v-for="acc in stripeAccounts.pending" :key="acc.uid" class="adm-stripe-item">
            <div class="adm-stripe-info">
              <span class="adm-stripe-email">{{ acc.email }}</span>
              <span class="adm-stripe-plan">{{ acc.plan }}</span>
              <span class="adm-stripe-account">{{ acc.stripeAccountId }}</span>
              <span class="adm-stripe-date" v-if="acc.stripeSubmittedAt">
                Soumis le {{ new Date(acc.stripeSubmittedAt).toLocaleDateString('fr-FR') }}
              </span>
            </div>
            <div class="adm-stripe-actions">
              <a
                :href="`https://dashboard.stripe.com/connect/accounts/${acc.stripeAccountId}`"
                target="_blank"
                class="adm-btn adm-btn-outline adm-btn-sm"
              >🔗 Voir dans Stripe</a>
              <button
                class="adm-btn adm-btn-success adm-btn-sm"
                @click="verifyStripe(acc.uid, true)"
                :disabled="stripeActionUid === acc.uid"
              >✅ Activer</button>
              <button
                class="adm-btn adm-btn-danger adm-btn-sm"
                @click="verifyStripe(acc.uid, false)"
                :disabled="stripeActionUid === acc.uid"
              >🚫 Rejeter</button>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLE DES PROPRIÉTAIRES -->
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Plan</th>
              <th>Inscrit le</th>
              <th>Expiration</th>
              <th>Slug publié</th>
              <th>Commandes</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredOwners.length === 0">
              <td colspan="7" class="adm-empty">Aucun propriétaire trouvé.</td>
            </tr>
            <tr
              v-for="owner in filteredOwners"
              :key="owner.id"
              :class="{ 'adm-row-disabled': owner.active === false }"
            >
              <!-- Email -->
              <td class="adm-td-email">
                <div class="adm-email-wrap">
                  <span class="adm-avatar">{{ (owner.email||'?')[0].toUpperCase() }}</span>
                  <span>{{ owner.email || '—' }}</span>
                </div>
              </td>

              <!-- Plan -->
              <td>
                <span :class="['adm-plan-badge', 'plan-' + (owner.plan||'free')]">
                  {{ (owner.plan || 'free').toUpperCase() }}
                </span>
              </td>

              <!-- Date inscription -->
              <td class="adm-td-date">
                {{ formatDate(owner.createdAt) }}
              </td>

              <!-- Date expiration -->
              <td class="adm-td-date">
                <span :class="isExpired(owner.expiry) ? 'adm-expired' : isExpiringSoon(owner.expiry) ? 'adm-expiring-soon' : 'adm-valid'">
                  {{ owner.expiry ? formatDate(owner.expiry) : '—' }}
                  <span v-if="isExpired(owner.expiry)"      class="adm-exp-badge">Expiré</span>
                  <span v-else-if="isExpiringSoon(owner.expiry)" class="adm-exp-badge adm-exp-soon">⚠ 7j</span>
                </span>
              </td>

              <!-- Slug -->
              <td class="adm-td-slug">
                <a
                  v-if="owner.publishedSlug"
                  :href="'https://musrh.github.io/SaasBuilder/#/site/' + owner.publishedSlug"
                  target="_blank"
                  class="adm-slug-link"
                >
                  {{ owner.publishedSlug }}
                  <span class="adm-ext">↗</span>
                </a>
                <span v-else class="adm-no-slug">Non publié</span>
              </td>

              <!-- Statut -->
              <td>
                <div style="display:flex;flex-direction:column;gap:3px">
                  <span :class="owner.active === false ? 'adm-status-off' : 'adm-status-on'">
                    {{ owner.active === false ? 'Désactivé' : 'Actif' }}
                  </span>
                  <!-- Compte Firestore=true mais expiry dépassé → cron pas encore tourné -->
                  <span
                    v-if="owner._rawActive && !owner.active && owner.plan !== 'free'"
                    class="adm-status-pending"
                    title="Expiré — sera désactivé au prochain cron (1h00)"
                  >⏳ À suspendre</span>
                </div>
              </td>

              <!-- Actions -->
              <td class="adm-td-actions">
                <!-- Activer / Désactiver -->
                <button
                  :class="owner.active === false ? 'adm-btn-activate' : 'adm-btn-disable'"
                  @click="toggleActive(owner)"
                  :disabled="toggling === owner.id"
                >
                  <span v-if="toggling === owner.id" class="adm-spinner-sm"></span>
                  <span v-else>{{ owner.active === false ? '✅ Activer' : '🔴 Désactiver' }}</span>
                </button>

                <!-- Modifier plan -->
                <select
                  class="adm-plan-select"
                  :value="owner.plan || 'free'"
                  @change="changePlan(owner, $event.target.value)"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>

                <!-- Prolonger expiration -->
                <button class="adm-btn-extend" @click="extendExpiry(owner, 30)" title="Prolonger de 30 jours">
                  +30j
                </button>

                <!-- Suspendre maintenant si expiré mais Firestore encore actif -->
                <button
                  v-if="owner._rawActive && !owner.active && owner.plan !== 'free'"
                  class="adm-btn-suspend-now"
                  @click="suspendNow(owner)"
                  :disabled="toggling === owner.id"
                  title="Appliquer la suspension maintenant"
                >
                  🔒 Suspendre
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </main>

    <!-- TOAST notifications -->
    <Transition name="toast">
      <div v-if="toast" class="adm-toast" :class="toastType">{{ toast }}</div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth"
import { collection, getDocs, getDoc, doc, updateDoc, setDoc, query, orderBy, where } from "firebase/firestore"
import { db } from "../firebase"

// ── Email(s) admin autorisés ──────────────────────────────────
// Modifiez cette liste selon vos besoins
const ADMIN_EMAILS = [
  "musmamon@gmail.com",   // ← remplacez par votre email admin
  "musrh@gmail.com",
]

const router      = useRouter()
const auth        = getAuth()
const currentUser = ref(null)
const loading     = ref(true)
const owners      = ref([])
const search      = ref("")
const filterPlan  = ref("")
const toggling    = ref(null)
const toast       = ref("")
const toastType   = ref("success")

const BACKEND          = "https://backendfinal-production-afd2.up.railway.app"
const checkExpiryLoading = ref(false)

const isAdmin = computed(() =>
  ADMIN_EMAILS.includes(currentUser.value?.email?.toLowerCase())
)

// Comptes qui expirent dans les 7 prochains jours (actifs, plan payant)
const expiringSoon = computed(() => {
  const now  = Date.now()
  const in7d = now + 7 * 24 * 60 * 60 * 1000
  return owners.value.filter(o =>
    o.active !== false &&
    o.plan !== "free" &&
    o.expiry &&
    o.expiry > now &&
    o.expiry <= in7d
  )
})

const filteredOwners = computed(() => {
  let list = owners.value
  const s  = search.value.toLowerCase()
  // Filtre spécial "expiring" : afficher seulement les comptes qui expirent bientôt
  if (s === "expiring") {
    list = expiringSoon.value
  } else if (s) {
    list = list.filter(o =>
      (o.email||"").toLowerCase().includes(s) ||
      (o.publishedSlug||"").toLowerCase().includes(s)
    )
  }
  if (filterPlan.value) list = list.filter(o => (o.plan||"free") === filterPlan.value)
  return list
})

// ── Chargement des propriétaires ─────────────────────────────
const loadOwners = async () => {
  loading.value = true
  try {
    const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")))
    owners.value = snap.docs.map(d => {
      const data   = d.data()
      const expiry = data.expiry || null
      const now    = Date.now()

      // Statut réel = active ET (free OU expiry non dépassé)
      const firestoreActive = data.active !== false
      const notExpired      = !expiry || data.plan === "free" || expiry > now
      const effectiveActive = firestoreActive && notExpired

      return {
        id: d.id,
        ...data,
        email:         data.email         || "—",
        plan:          data.plan          || "free",
        paye:          data.paye          || false,
        active:        effectiveActive,           // statut réel calculé
        _rawActive:    firestoreActive,            // valeur brute Firestore
        subscriptionActive: data.subscriptionActive === true,
        createdAt:     data.createdAt     || null,
        expiry,
        publishedSlug: data.publishedSlug || "",
      }
    })
  } catch(e) {
    showToast("Erreur chargement : " + e.message, "error")
  } finally {
    loading.value = false
  }
}

// ── Activer / Désactiver un propriétaire ──────────────────────
// Bascule le champ `active` : false → true, true → false (et undefined → false car compté actif)
const toggleActive = async (owner) => {
  if (toggling.value === owner.id) return  // éviter double-clic
  toggling.value = owner.id
  try {
    // État actuel considéré actif si != false (y compris undefined)
    const isCurrentlyActive = owner.active !== false
    const newActive = !isCurrentlyActive   // inverse strict
    await updateDoc(doc(db, "users", owner.id), { active: newActive })
    // Modifier dans owners.value → déclenche la réactivité Vue
    const tidx = owners.value.findIndex(o => o.id === owner.id)
    if (tidx !== -1) owners.value[tidx].active = newActive
    showToast(
      newActive
        ? "✅ " + owner.email + " activé"
        : "🔴 " + owner.email + " désactivé"
    )
  } catch(e) {
    showToast("Erreur : " + e.message, "error")
  } finally {
    toggling.value = null
  }
}

// ── Changer le plan ───────────────────────────────────────────
// Lorsqu'on passe à Pro/Premium, on FORCE la mise à jour de :
//   • plan, paye=true, subscriptionActive=true
//   • expiry = Date.now() + 30 jours  (corrige les anciens comptes free où expiry était null/vide)
//   • active=true (réactive le compte)
// Lorsqu'on revient à Free : plan=free, paye=false, subscriptionActive=false, expiry=null
const changePlan = async (owner, newPlan) => {
  // On ne bloque PAS si le plan est identique : permet de "réparer"
  // un compte Pro où expiry serait null/expiré.
  try {
    const isPaid    = newPlan !== "free"
    const newExpiry = isPaid
      ? Date.now() + 30 * 24 * 60 * 60 * 1000   // +30 jours en ms
      : null                                       // Free → pas d'expiry

    const update = {
      plan:               newPlan,
      paye:               isPaid,
      subscriptionActive: isPaid,    // ← cohérence avec le champ utilisé côté app
      expiry:             newExpiry, // ← jamais laissé vide pour un plan payant
      active:             true,      // réactive si désactivé
    }
    // setDoc merge:true garantit l'écriture même si le champ était null
    await setDoc(doc(db, "users", owner.id), update, { merge: true })

    // Relire Firestore pour confirmer que expiry est bien écrit
    const verify = await getDoc(doc(db, "users", owner.id))
    const confirmedExpiry = verify.exists() ? verify.data().expiry : newExpiry
    console.log("[Admin] expiry dans Firestore:", confirmedExpiry, "| attendu:", newExpiry)

    // Mettre à jour les champs locaux → re-render Vue immédiat
    const idx = owners.value.findIndex(o => o.id === owner.id)
    if (idx !== -1) {
      owners.value[idx].plan               = newPlan
      owners.value[idx].paye               = isPaid
      owners.value[idx].subscriptionActive = isPaid
      owners.value[idx].expiry             = confirmedExpiry ?? newExpiry
      owners.value[idx].active             = true
    }

    showToast(
      "✅ " + owner.email + " → " + newPlan.toUpperCase() +
      (newExpiry ? " · expire le " + formatDate(newExpiry) : "")
    )
  } catch(e) {
    showToast("Erreur changePlan : " + e.message, "error")
  }
}

// ── Prolonger l'expiration ────────────────────────────────────
const extendExpiry = async (owner, days) => {
  try {
    const base   = (owner.expiry && owner.expiry > Date.now()) ? owner.expiry : Date.now()
    const newExp = base + days * 24 * 60 * 60 * 1000
    await updateDoc(doc(db, "users", owner.id), { expiry: newExp })
    owner.expiry = newExp
    showToast(`+${days}j pour ${owner.email} → expire le ${formatDate(newExp)}`)
  } catch(e) {
    showToast("Erreur : " + e.message, "error")
  }
}

// ── Helpers ───────────────────────────────────────────────────
const exportCSV = () => {
  const rows = [
    ["Email","Plan","Payé","Inscrit le","Expiration","Slug","Commandes","Actif"],
    ...filteredOwners.value.map(o => [
      o.email,
      o.plan,
      o.paye ? "oui" : "non",
      o.createdAt ? formatDate(o.createdAt) : "",
      o.expiry    ? formatDate(o.expiry)    : "",
      o.publishedSlug || "",
      o.orderCount || 0,
      o.active !== false ? "oui" : "non",
    ])
  ]
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `stores-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const formatDate = (ts) => {
  if (!ts) return "—"
  const d = typeof ts === "number" ? new Date(ts) : ts?.toDate?.() || new Date(ts)
  return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
}

const isExpired     = (expiry) => expiry && expiry < Date.now()
const isExpiringSoon = (expiry) => {
  if (!expiry) return false
  const now = Date.now()
  return expiry > now && expiry <= now + 7 * 24 * 60 * 60 * 1000
}

let toastTimer = null
const showToast = (msg, type = "success") => {
  toast.value    = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = "" }, 3000)
}

// ── Déclencher la vérification des comptes expirés ─────────────
// ── Suspendre immédiatement un compte expiré ────────────────────
const suspendNow = async (owner) => {
  toggling.value = owner.id
  try {
    await updateDoc(doc(db, "users", owner.id), {
      active:             false,
      subscriptionActive: false,
      paye:               false,
      suspendedAt:        Date.now(),
      suspendedReason:    "expiry",
    })
    const idx = owners.value.findIndex(o => o.id === owner.id)
    if (idx !== -1) {
      owners.value[idx].active     = false
      owners.value[idx]._rawActive = false
    }
    showToast(`🔒 ${owner.email} suspendu`)
  } catch(e) {
    showToast("Erreur : " + e.message, "error")
  } finally {
    toggling.value = null
  }
}

// ── Stripe Connect : comptes en attente de vérification ─────────
const stripeAccounts   = ref({ pending: [], active: [], total: 0 })
const stripeLoading    = ref(false)
const stripeActionUid  = ref(null)

const BACKEND_FINAL = "https://backendfinal-production-afd2.up.railway.app"

const loadStripeAccounts = async () => {
  stripeLoading.value = true
  try {
    const idToken = await auth.currentUser?.getIdToken()
    const res     = await fetch(`${BACKEND_FINAL}/api/admin/stripe-accounts?idToken=${encodeURIComponent(idToken)}`)
    const data    = await res.json()
    if (data.error) throw new Error(data.error)
    stripeAccounts.value = data
  } catch(e) {
    showToast("Erreur Stripe: " + e.message, "error")
  } finally { stripeLoading.value = false }
}

const verifyStripe = async (ownerUid, approve) => {
  stripeActionUid.value = ownerUid
  try {
    const idToken = await auth.currentUser?.getIdToken()
    const res     = await fetch(`${BACKEND_FINAL}/api/admin/verify-stripe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, ownerUid, approve }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showToast(approve
      ? `✅ Stripe activé — ${data.chargesEnabled ? "charges OK" : "⚠ charges non activées"}`
      : "🚫 Stripe rejeté"
    )
    await loadStripeAccounts()
    await loadOwners()
  } catch(e) {
    showToast("Erreur: " + e.message, "error")
  } finally { stripeActionUid.value = null }
}

const runCheckExpiry = async () => {
  checkExpiryLoading.value = true
  try {
    const idToken = await auth.currentUser?.getIdToken()
    const res     = await fetch(`${BACKEND}/api/admin/check-expiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    showToast(
      data.disabled > 0
        ? `🔒 ${data.disabled} compte(s) désactivé(s) sur ${data.checked} vérifié(s)`
        : `✅ Aucun compte expiré parmi ${data.checked} vérifié(s)`
    )
    // Recharger la liste pour refléter les changements
    await loadOwners()
  } catch(e) {
    showToast("Erreur : " + e.message, "error")
  } finally {
    checkExpiryLoading.value = false
  }
}

const logout = async () => {
  await signOut(auth)
  router.push("/")
}

// ── Init ──────────────────────────────────────────────────────
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    if (!user) { router.push("/"); return }
    if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      await loadOwners()
    } else {
      loading.value = false
    }
  })
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

.adm-root{min-height:100vh;background:#0f0f1a;color:#e2e8f0;font-family:'DM Sans',sans-serif}

/* HEADER */
.adm-header{background:#1a1a2e;border-bottom:1px solid #2d2d44;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.4)}
.adm-brand{display:flex;align-items:center;gap:10px}
.adm-logo{font-size:22px}
.adm-title{font-size:17px;font-weight:700;color:#a78bfa}
.adm-header-right{display:flex;align-items:center;gap:12px}
.adm-admin-email{font-size:13px;color:#94a3b8}
.adm-logout{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#f87171;border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer;transition:.2s}
.adm-logout:hover{background:rgba(239,68,68,.25)}

/* LOADING / DENIED */
.adm-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px;color:#94a3b8}
.adm-spinner{width:36px;height:36px;border:3px solid #2d2d44;border-top-color:#a78bfa;border-radius:50%;animation:adm-spin .7s linear infinite}
.adm-spinner-sm{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:adm-spin .7s linear infinite;display:inline-block}
@keyframes adm-spin{to{transform:rotate(360deg)}}
.adm-denied{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:12px;text-align:center}
.adm-denied-icon{font-size:48px}
.adm-denied h2{font-size:24px;color:#f87171}
.adm-denied p{color:#94a3b8}
.adm-btn-back{background:#6c63ff;color:#fff;border:none;border-radius:10px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}

/* MAIN */
.adm-main{padding:24px;max-width:1400px;margin:0 auto}

/* STATS */
.adm-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px}
.adm-stat-card{background:#1a1a2e;border:1px solid #2d2d44;border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:14px}
.adm-stat-icon{font-size:28px;flex-shrink:0}
.adm-stat-val{font-size:28px;font-weight:700;color:#a78bfa;line-height:1}
.adm-stat-label{font-size:12px;color:#64748b;margin-top:3px}

/* TOOLBAR */
.adm-toolbar{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.adm-search{flex:1;min-width:200px;background:#1a1a2e;border:1px solid #2d2d44;color:#e2e8f0;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;transition:.15s}
.adm-search:focus{border-color:#a78bfa}
.adm-search::placeholder{color:#475569}
.adm-filter{background:#1a1a2e;border:1px solid #2d2d44;color:#e2e8f0;border-radius:10px;padding:10px 12px;font-size:13px;cursor:pointer}
.adm-btn-refresh{background:#2d2d44;border:1px solid #3d3d5c;color:#a78bfa;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;white-space:nowrap}
.adm-btn-refresh:hover{background:#3d3d5c}

/* TABLE */
.adm-table-wrap{overflow-x:auto;border-radius:14px;border:1px solid #2d2d44}
.adm-table{width:100%;border-collapse:collapse;font-size:13px}
.adm-table thead tr{background:#1a1a2e}
.adm-table th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #2d2d44;white-space:nowrap}
.adm-table tbody tr{background:#12121f;border-bottom:1px solid #1e1e30;transition:background .15s}
.adm-table tbody tr:hover{background:#1a1a2e}
.adm-table tbody tr:last-child{border-bottom:none}
.adm-row-disabled{opacity:.6}
.adm-empty{text-align:center;padding:40px;color:#475569;font-size:14px}
td{padding:12px 16px;vertical-align:middle}

/* Cells */
.adm-email-wrap{display:flex;align-items:center;gap:8px}
.adm-avatar{width:28px;height:28px;background:linear-gradient(135deg,#6c63ff,#a78bfa);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
.adm-td-email{max-width:220px}
.adm-td-email span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;display:block}
.adm-td-date{white-space:nowrap;color:#94a3b8;font-size:12px}
.adm-td-slug a{color:#a78bfa;text-decoration:none;font-size:12px}
.adm-td-slug a:hover{text-decoration:underline}
.adm-ext{font-size:10px;opacity:.6}
.adm-no-slug{color:#475569;font-size:12px}
.adm-expired{color:#f87171}
.adm-valid{color:#4ade80}
.adm-exp-badge{background:rgba(239,68,68,.15);color:#f87171;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:4px}

/* Plan badges */
.adm-plan-badge{padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.plan-free{background:rgba(100,116,139,.2);color:#94a3b8}
.plan-pro{background:rgba(108,99,255,.2);color:#a78bfa}
.plan-premium{background:rgba(234,179,8,.2);color:#fbbf24}

/* Status */
.adm-status-on{background:rgba(74,222,128,.15);color:#4ade80;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}
.adm-status-off{background:rgba(239,68,68,.15);color:#f87171;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600}

/* Action buttons */
.adm-td-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.adm-btn-activate{background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.3);color:#4ade80;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:.2s;white-space:nowrap}
.adm-btn-activate:hover{background:rgba(74,222,128,.25)}
.adm-btn-disable{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#f87171;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:.2s;white-space:nowrap}
.adm-btn-disable:hover{background:rgba(239,68,68,.22)}
.adm-plan-select{background:#1e1e30;border:1px solid #2d2d44;color:#e2e8f0;border-radius:8px;padding:5px 8px;font-size:12px;cursor:pointer}
.adm-btn-extend{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.25);color:#fbbf24;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s;white-space:nowrap}
.adm-btn-extend:hover{background:rgba(251,191,36,.22)}

/* TOAST */
.adm-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #2d2d44;color:#e2e8f0;padding:12px 22px;border-radius:12px;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:2000;white-space:nowrap}
.adm-toast.error{background:#2d1515;border-color:rgba(239,68,68,.3);color:#f87171}
.toast-enter-active,.toast-leave-active{transition:all .3s}
.toast-enter-from,.toast-leave-to{opacity:0;transform:translateX(-50%) translateY(12px)}

@media(max-width:768px){
  .adm-main{padding:12px}
  .adm-stats{grid-template-columns:repeat(2,1fr)}
  .adm-td-actions{flex-direction:column;align-items:flex-start}
}

.adm-btn-export{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px}
.adm-btn-export:hover{background:linear-gradient(135deg,#059669,#047857)}
.adm-td-orders{text-align:center}
.adm-orders-badge{background:rgba(108,99,255,.15);color:#6c63ff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px;border:1px solid rgba(108,99,255,.3)}


/* Stat warning (expirés bientôt) */
.adm-stat-warning{cursor:pointer;border-color:rgba(245,158,11,.25)!important}
.adm-stat-warning:hover{border-color:rgba(245,158,11,.5)!important;background:rgba(245,158,11,.05)!important}
.adm-stat-val-warn{color:#fbbf24}

/* Badge expire bientôt */
.adm-expiring-soon{color:#fbbf24}
.adm-exp-soon{background:rgba(245,158,11,.15);color:#fbbf24;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:4px}

/* Bouton check-expiry */
.adm-btn-check-expiry{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);color:#fbbf24;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;white-space:nowrap;display:flex;align-items:center;gap:6px}
.adm-btn-check-expiry:hover:not(:disabled){background:rgba(245,158,11,.22)}
.adm-btn-check-expiry:disabled{opacity:.5;cursor:not-allowed}

/* Statut en attente de suspension */
.adm-status-pending {
  background: rgba(245,158,11,.12);
  color: #fbbf24;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

/* Bouton suspendre maintenant */
.adm-btn-suspend-now {
  background: rgba(239,68,68,.12);
  border: 1px solid rgba(239,68,68,.3);
  color: #f87171;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: .2s;
  white-space: nowrap;
}
.adm-btn-suspend-now:hover:not(:disabled) { background: rgba(239,68,68,.22); }
.adm-btn-suspend-now:disabled { opacity: .5; cursor: not-allowed; }

/* ── Stripe pending section ───────────────────────────────────── */
.adm-btn-stripe-check {
  background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25);
  color: #818cf8; border-radius: 10px; padding: 10px 14px;
  font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;
  font-family: 'DM Sans', sans-serif; transition: .15s;
}
.adm-btn-stripe-check:hover { background: rgba(99,102,241,.2); }
.adm-stripe-pending-section {
  background: rgba(245,158,11,.05); border: 1px solid rgba(245,158,11,.2);
  border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
}
.adm-stripe-title {
  font-size: 14px; font-weight: 700; color: #fbbf24;
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
}
.adm-stripe-count {
  background: rgba(245,158,11,.2); color: #fbbf24;
  font-size: 11px; padding: 2px 8px; border-radius: 100px;
}
.adm-stripe-list { display: flex; flex-direction: column; gap: 10px; }
.adm-stripe-item {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 12px 16px; gap: 12px; flex-wrap: wrap;
}
.adm-stripe-info { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.adm-stripe-email { font-size: 13px; font-weight: 600; color: #e2e8f0; }
.adm-stripe-plan  { font-size: 11px; color: #6c63ff; }
.adm-stripe-account { font-size: 10px; color: #6b7280; font-family: monospace; }
.adm-stripe-date  { font-size: 11px; color: #9ca3af; }
.adm-stripe-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.adm-btn-success {
  background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.3);
  color: #34d399;
}
.adm-btn-success:hover:not(:disabled) { background: rgba(16,185,129,.22); }
</style>
