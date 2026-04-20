<!-- ============================================================
  Admin.vue — Dashboard administrateur SaasBuilder
  Accessible uniquement pour les emails admin définis
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

    <!-- LOADING -->
    <div v-if="loading" class="adm-loading">
      <div class="adm-spinner"></div>
      <p>Chargement des stores...</p>
    </div>

    <!-- ACCÈS REFUSÉ -->
    <div v-else-if="!isAdmin" class="adm-denied">
      <div class="adm-denied-icon">🚫</div>
      <h2>Accès refusé</h2>
      <p>Vous n'avez pas les droits d'administration.</p>
      <button @click="$router.push('/')" class="adm-btn-back">← Retour</button>
    </div>

    <!-- DASHBOARD -->
    <main v-else class="adm-main">

      <!-- STATS -->
      <div class="adm-stats">
        <div class="adm-stat-card">
          <div class="adm-stat-icon">👥</div>
          <div>
            <div class="adm-stat-val">{{ owners.length }}</div>
            <div class="adm-stat-label">Propriétaires</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <div class="adm-stat-icon">✅</div>
          <div>
            <div class="adm-stat-val">{{ owners.filter(o => o.active !== false && o.paye).length }}</div>
            <div class="adm-stat-label">Actifs payants</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <div class="adm-stat-icon">🆓</div>
          <div>
            <div class="adm-stat-val">{{ owners.filter(o => o.plan === 'free').length }}</div>
            <div class="adm-stat-label">Plans Free</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <div class="adm-stat-icon">🔴</div>
          <div>
            <div class="adm-stat-val">{{ owners.filter(o => o.active === false).length }}</div>
            <div class="adm-stat-label">Désactivés</div>
          </div>
        </div>
      </div>

      <!-- TOOLBAR -->
      <div class="adm-toolbar">
        <input
          v-model="search"
          type="text"
          class="adm-search"
          placeholder="🔍 Rechercher email ou slug..."
        />
        <select v-model="filterPlan" class="adm-filter">
          <option value="">Tous les plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        <button class="adm-btn-refresh" @click="loadOwners">🔄 Actualiser</button>
        <button class="adm-btn-export" @click="exportCSV" title="Exporter en CSV">📥 Export CSV</button>
      </div>

      <!-- TABLE -->
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
              <td colspan="8" class="adm-empty">Aucun propriétaire trouvé.</td>
            </tr>
            <tr
              v-for="owner in filteredOwners"
              :key="owner.id"
              :class="{ 'adm-row-disabled': owner.active === false }"
            >
              <!-- Email -->
              <td class="adm-td-email">
                <div class="adm-email-wrap">
                  <div class="adm-avatar">{{ (owner.email || '?')[0].toUpperCase() }}</div>
                  <span>{{ owner.email || '—' }}</span>
                </div>
              </td>

              <!-- Plan -->
              <td>
                <span class="adm-plan-badge" :class="'plan-' + (owner.plan || 'free')">
                  {{ (owner.plan || 'free').toUpperCase() }}
                </span>
              </td>

              <!-- Inscrit le -->
              <td class="adm-td-date">{{ formatDate(owner.createdAt) }}</td>

              <!-- Expiration -->
              <td class="adm-td-date">
                <span :class="isExpired(owner.expiry) ? 'adm-expired' : 'adm-valid'">
                  {{ owner.expiry ? formatDate(owner.expiry) : '—' }}
                </span>
                <span v-if="isExpired(owner.expiry)" class="adm-exp-badge">Expiré</span>
              </td>

              <!-- Slug publié -->
              <td class="adm-td-slug">
                <a
                  v-if="owner.publishedSlug"
                  :href="`/#/site/${owner.publishedSlug}`"
                  target="_blank"
                >
                  {{ owner.publishedSlug }} <span class="adm-ext">↗</span>
                </a>
                <span v-else class="adm-no-slug">Non publié</span>
              </td>

              <!-- Commandes -->
              <td class="adm-td-orders">
                <span class="adm-orders-badge">{{ owner.orderCount || 0 }}</span>
              </td>

              <!-- Statut -->
              <td>
                <span :class="owner.active === false ? 'adm-status-off' : 'adm-status-on'">
                  {{ owner.active === false ? 'Désactivé' : 'Actif' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="adm-td-actions">
                <!-- Toggle actif -->
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
                <button
                  class="adm-btn-extend"
                  @click="extendExpiry(owner, 30)"
                  title="Prolonger de 30 jours"
                >+30j</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </main>

    <!-- TOAST -->
    <transition name="toast">
      <div v-if="toast" class="adm-toast" :class="toastType">
        {{ toast }}
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../firebase' // adapte le chemin si besoin

// ── Liste des emails admin (en minuscules) ────────────────────
const ADMIN_EMAILS = [
  'musrh@gmail.com',
  // Ajoute d'autres emails admin ici
]

const router      = useRouter()
const auth        = getAuth()
const currentUser = ref(null)
const loading     = ref(true)
const owners      = ref([])
const search      = ref('')
const filterPlan  = ref('')
const toggling    = ref(null)
const toast       = ref('')
const toastType   = ref('success')

const isAdmin = computed(() =>
  ADMIN_EMAILS.includes(currentUser.value?.email?.toLowerCase())
)

const filteredOwners = computed(() => {
  let list = owners.value
  const s  = search.value.toLowerCase()
  if (s) {
    list = list.filter(o =>
      (o.email || '').toLowerCase().includes(s) ||
      (o.publishedSlug || '').toLowerCase().includes(s)
    )
  }
  if (filterPlan.value) {
    list = list.filter(o => (o.plan || 'free') === filterPlan.value)
  }
  return list
})

// ── Chargement des propriétaires ─────────────────────────────
const loadOwners = async () => {
  loading.value = true
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    )
    owners.value = snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        email:         data.email         || '—',
        plan:          data.plan          || 'free',
        paye:          data.paye          || false,
        active:        data.active        !== false, // true par défaut
        createdAt:     data.createdAt     || null,
        expiry:        data.expiry        || null,
        publishedSlug: data.publishedSlug || '',
        orderCount:    data.orderCount    || 0,
      }
    })
  } catch (e) {
    showToast('Erreur chargement : ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

// ── Activer / Désactiver un propriétaire ──────────────────────
const toggleActive = async (owner) => {
  toggling.value = owner.id
  try {
    const newActive = owner.active === false ? true : false
    await updateDoc(doc(db, 'users', owner.id), { active: newActive })
    owner.active = newActive
    showToast(newActive
      ? `✅ ${owner.email} activé`
      : `🔴 ${owner.email} désactivé`)
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error')
  } finally {
    toggling.value = null
  }
}

// ── Changer le plan ───────────────────────────────────────────
const changePlan = async (owner, newPlan) => {
  try {
    const update = {
      plan: newPlan,
      paye: newPlan !== 'free',
    }
    if (newPlan !== 'free') {
      update.expiry = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 jours
    }
    await updateDoc(doc(db, 'users', owner.id), update)
    owner.plan = newPlan
    owner.paye = update.paye
    if (update.expiry) owner.expiry = update.expiry
    showToast(`Plan de ${owner.email} → ${newPlan.toUpperCase()}`)
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error')
  }
}

// ── Prolonger l'expiration ────────────────────────────────────
const extendExpiry = async (owner, days) => {
  try {
    const base = (owner.expiry && owner.expiry > Date.now())
      ? owner.expiry
      : Date.now()
    const newExp = base + days * 24 * 60 * 60 * 1000
    await updateDoc(doc(db, 'users', owner.id), { expiry: newExp })
    owner.expiry = newExp
    showToast(`+${days}j pour ${owner.email} → expire le ${formatDate(newExp)}`)
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error')
  }
}

// ── Export CSV ────────────────────────────────────────────────
const exportCSV = () => {
  const rows = [
    ['Email', 'Plan', 'Payé', 'Inscrit le', 'Expiration', 'Slug', 'Commandes', 'Actif'],
    ...filteredOwners.value.map(o => [
      o.email,
      o.plan,
      o.paye ? 'oui' : 'non',
      o.createdAt ? formatDate(o.createdAt) : '',
      o.expiry    ? formatDate(o.expiry)    : '',
      o.publishedSlug || '',
      o.orderCount || 0,
      o.active !== false ? 'oui' : 'non',
    ])
  ]
  const csv = rows
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `stores-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return '—'
  const d = typeof ts === 'number'
    ? new Date(ts)
    : ts?.toDate?.() || new Date(ts)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

const isExpired = (expiry) => expiry && expiry < Date.now()

let toastTimer = null
const showToast = (msg, type = 'success') => {
  toast.value     = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
}

const logout = async () => {
  await signOut(auth)
  router.push('/')
}

// ── Init ──────────────────────────────────────────────────────
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user
    if (!user) { router.push('/'); return }
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
* { box-sizing: border-box; margin: 0; padding: 0; }

.adm-root { min-height: 100vh; background: #0f0f1a; color: #e2e8f0; font-family: 'DM Sans', sans-serif; }

/* HEADER */
.adm-header { background: #1a1a2e; border-bottom: 1px solid #2d2d44; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 12px rgba(0,0,0,.4); }
.adm-brand { display: flex; align-items: center; gap: 10px; }
.adm-logo { font-size: 22px; }
.adm-title { font-size: 17px; font-weight: 700; color: #a78bfa; }
.adm-header-right { display: flex; align-items: center; gap: 12px; }
.adm-admin-email { font-size: 13px; color: #94a3b8; }
.adm-logout { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.3); color: #f87171; border-radius: 8px; padding: 6px 14px; font-size: 13px; cursor: pointer; transition: .2s; }
.adm-logout:hover { background: rgba(239,68,68,.25); }

/* LOADING / DENIED */
.adm-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; color: #94a3b8; }
.adm-spinner { width: 36px; height: 36px; border: 3px solid #2d2d44; border-top-color: #a78bfa; border-radius: 50%; animation: adm-spin .7s linear infinite; }
.adm-spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: adm-spin .7s linear infinite; display: inline-block; }
@keyframes adm-spin { to { transform: rotate(360deg); } }
.adm-denied { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; text-align: center; }
.adm-denied-icon { font-size: 48px; }
.adm-denied h2 { font-size: 24px; color: #f87171; }
.adm-denied p { color: #94a3b8; }
.adm-btn-back { background: #6c63ff; color: #fff; border: none; border-radius: 10px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }

/* MAIN */
.adm-main { padding: 24px; max-width: 1400px; margin: 0 auto; }

/* STATS */
.adm-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
.adm-stat-card { background: #1a1a2e; border: 1px solid #2d2d44; border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; }
.adm-stat-icon { font-size: 28px; flex-shrink: 0; }
.adm-stat-val { font-size: 28px; font-weight: 700; color: #a78bfa; line-height: 1; }
.adm-stat-label { font-size: 12px; color: #64748b; margin-top: 3px; }

/* TOOLBAR */
.adm-toolbar { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.adm-search { flex: 1; min-width: 200px; background: #1a1a2e; border: 1px solid #2d2d44; color: #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 14px; outline: none; transition: .15s; }
.adm-search:focus { border-color: #a78bfa; }
.adm-search::placeholder { color: #475569; }
.adm-filter { background: #1a1a2e; border: 1px solid #2d2d44; color: #e2e8f0; border-radius: 10px; padding: 10px 12px; font-size: 13px; cursor: pointer; }
.adm-btn-refresh { background: #2d2d44; border: 1px solid #3d3d5c; color: #a78bfa; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: .15s; white-space: nowrap; }
.adm-btn-refresh:hover { background: #3d3d5c; }
.adm-btn-export { background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; }
.adm-btn-export:hover { background: linear-gradient(135deg, #059669, #047857); }

/* TABLE */
.adm-table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid #2d2d44; }
.adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.adm-table thead tr { background: #1a1a2e; }
.adm-table th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #2d2d44; white-space: nowrap; }
.adm-table tbody tr { background: #12121f; border-bottom: 1px solid #1e1e30; transition: background .15s; }
.adm-table tbody tr:hover { background: #1a1a2e; }
.adm-table tbody tr:last-child { border-bottom: none; }
.adm-row-disabled { opacity: .6; }
.adm-empty { text-align: center; padding: 40px; color: #475569; font-size: 14px; }
.adm-table td { padding: 12px 16px; vertical-align: middle; }

/* Cells */
.adm-email-wrap { display: flex; align-items: center; gap: 8px; }
.adm-avatar { width: 28px; height: 28px; background: linear-gradient(135deg, #6c63ff, #a78bfa); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.adm-td-email { max-width: 220px; }
.adm-td-email span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; display: block; }
.adm-td-date { white-space: nowrap; color: #94a3b8; font-size: 12px; }
.adm-td-slug a { color: #a78bfa; text-decoration: none; font-size: 12px; }
.adm-td-slug a:hover { text-decoration: underline; }
.adm-ext { font-size: 10px; opacity: .6; }
.adm-no-slug { color: #475569; font-size: 12px; }
.adm-expired { color: #f87171; }
.adm-valid { color: #4ade80; }
.adm-exp-badge { background: rgba(239,68,68,.15); color: #f87171; font-size: 10px; padding: 1px 6px; border-radius: 4px; margin-left: 4px; }

/* Plan badges */
.adm-plan-badge { padding: 3px 10px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.plan-free { background: rgba(100,116,139,.2); color: #94a3b8; }
.plan-pro { background: rgba(108,99,255,.2); color: #a78bfa; }
.plan-premium { background: rgba(234,179,8,.2); color: #fbbf24; }

/* Status */
.adm-status-on { background: rgba(74,222,128,.15); color: #4ade80; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
.adm-status-off { background: rgba(239,68,68,.15); color: #f87171; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }

/* Action buttons */
.adm-td-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.adm-btn-activate { background: rgba(74,222,128,.15); border: 1px solid rgba(74,222,128,.3); color: #4ade80; border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: .2s; white-space: nowrap; }
.adm-btn-activate:hover { background: rgba(74,222,128,.25); }
.adm-btn-disable { background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.25); color: #f87171; border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: .2s; white-space: nowrap; }
.adm-btn-disable:hover { background: rgba(239,68,68,.22); }
.adm-plan-select { background: #1e1e30; border: 1px solid #2d2d44; color: #e2e8f0; border-radius: 8px; padding: 5px 8px; font-size: 12px; cursor: pointer; }
.adm-btn-extend { background: rgba(251,191,36,.12); border: 1px solid rgba(251,191,36,.25); color: #fbbf24; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: .2s; white-space: nowrap; }
.adm-btn-extend:hover { background: rgba(251,191,36,.22); }

/* Orders */
.adm-td-orders { text-align: center; }
.adm-orders-badge { background: rgba(108,99,255,.15); color: #6c63ff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 100px; border: 1px solid rgba(108,99,255,.3); }

/* TOAST */
.adm-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1a1a2e; border: 1px solid #2d2d44; color: #e2e8f0; padding: 12px 22px; border-radius: 12px; font-size: 14px; box-shadow: 0 8px 32px rgba(0,0,0,.4); z-index: 2000; white-space: nowrap; }
.adm-toast.error { background: #2d1515; border-color: rgba(239,68,68,.3); color: #f87171; }
.toast-enter-active, .toast-leave-active { transition: all .3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }

@media (max-width: 768px) {
  .adm-main { padding: 12px; }
  .adm-stats { grid-template-columns: repeat(2, 1fr); }
  .adm-td-actions { flex-direction: column; align-items: flex-start; }
}
</style>
