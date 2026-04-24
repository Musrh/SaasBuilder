<template>
  <div class="adm-root">
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

    <div v-if="loading" class="adm-loading">
      <div class="adm-spinner"></div>
      <p>Chargement des stores...</p>
    </div>

    <div v-else-if="!isAdmin" class="adm-denied">
      <span class="adm-denied-icon">🚫</span>
      <h2>Accès refusé</h2>
      <p>Vous n'avez pas les droits d'administration.</p>
      <button @click="$router.push('/')" class="adm-btn-back">← Retour</button>
    </div>

    <main v-else class="adm-main">
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
            <div class="adm-stat-val">{{ owners.filter((o) => o.active !== false && o.paye).length }}</div>
            <div class="adm-stat-label">Actifs payants</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <span class="adm-stat-icon">🆓</span>
          <div>
            <div class="adm-stat-val">{{ owners.filter((o) => o.plan === 'free').length }}</div>
            <div class="adm-stat-label">Plans Free</div>
          </div>
        </div>
        <div class="adm-stat-card">
          <span class="adm-stat-icon">🔴</span>
          <div>
            <div class="adm-stat-val">{{ owners.filter((o) => o.active === false).length }}</div>
            <div class="adm-stat-label">Désactivés</div>
          </div>
        </div>
      </div>

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
        <button class="adm-btn-export" @click="exportCSV" title="Exporter en CSV">📥 Export CSV</button>
      </div>

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
              <td class="adm-td-email">
                <div class="adm-email-wrap">
                  <span class="adm-avatar">{{ (owner.email || '?')[0].toUpperCase() }}</span>
                  <span>{{ owner.email || '—' }}</span>
                </div>
              </td>

              <td>
                <span :class="['adm-plan-badge', 'plan-' + (owner.plan || 'free')]">
                  {{ (owner.plan || 'free').toUpperCase() }}
                </span>
              </td>

              <td class="adm-td-date">{{ formatDate(owner.createdAt) }}</td>

              <td class="adm-td-date">
                <span :class="isExpired(owner.expiry) ? 'adm-expired' : 'adm-valid'">
                  {{ owner.expiry ? formatDate(owner.expiry) : '—' }}
                  <span v-if="isExpired(owner.expiry)" class="adm-exp-badge">Expiré</span>
                </span>
              </td>

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

              <td>{{ owner.orderCount || 0 }}</td>

              <td>
                <span :class="owner.active === false ? 'adm-status-off' : 'adm-status-on'">
                  {{ owner.active === false ? 'Désactivé' : 'Actif' }}
                </span>
              </td>

              <td class="adm-td-actions">
                <button
                  :class="owner.active === false ? 'adm-btn-activate' : 'adm-btn-disable'"
                  @click="toggleActive(owner)"
                  :disabled="toggling === owner.id"
                >
                  <span v-if="toggling === owner.id" class="adm-spinner-sm"></span>
                  <span v-else>{{ owner.active === false ? '✅ Activer' : '🔴 Désactiver' }}</span>
                </button>

                <select
                  class="adm-plan-select"
                  :value="owner.plan || 'free'"
                  @change="changePlan(owner, $event.target.value)"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>

                <button class="adm-btn-extend" @click="extendExpiry(owner, 30)" title="Prolonger de 30 jours">
                  +30j
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <Transition name="toast">
      <div v-if="toast" class="adm-toast" :class="toastType">{{ toast }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore'
import { db } from '../firebase'

const ADMIN_EMAILS = ['musmamon@gmail.com', 'musrh@gmail.com']

const router = useRouter()
const auth = getAuth()

const currentUser = ref(null)
const loading = ref(true)
const owners = ref([])
const search = ref('')
const filterPlan = ref('')
const toggling = ref(null)
const toast = ref('')
const toastType = ref('success')

/* =========================
   ADMIN CHECK
========================= */
const isAdmin = computed(() =>
  ADMIN_EMAILS.includes(currentUser.value?.email?.toLowerCase())
)

/* =========================
   NORMALIZE DATA (SAFE)
========================= */
const normalizeOwner = (id, data = {}) => ({
  id,
  uid: data.uid || id,
  email: data.email || '—',
  plan: data.plan || 'free',
  paye: Boolean(data.paye),
  active: Boolean(data.active),
  createdAt: data.createdAt || null,
  expiry: data.expiry || null,
  publishedSlug: data.publishedSlug || '',
  orderCount: Number(data.orderCount || 0),
})

const resolveOwnerDocId = (owner) =>
  owner?.id || owner?.uid || null

const replaceOwnerLocally = (updatedOwner) => {
  const i = owners.value.findIndex(o => o.id === updatedOwner.id)
  if (i !== -1) owners.value.splice(i, 1, updatedOwner)
}

/* =========================
   🔥 LOAD USERS (FIXED)
========================= */
const loadOwners = async () => {
  loading.value = true

  try {
    console.log("🔥 Loading users...")

    // ✅ FIX : PAS DE orderBy (évite blocage)
    const snap = await getDocs(collection(db, 'users'))

    console.log("✅ Users loaded:", snap.size)

    owners.value = snap.docs.map(d =>
      normalizeOwner(d.id, d.data())
    )

  } catch (e) {
    console.error("❌ LOAD ERROR:", e)
    showToast('Erreur chargement : ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

/* =========================
   🔥 TOGGLE STABLE
========================= */
const toggleActive = async (owner) => {
  const docId = resolveOwnerDocId(owner)
  if (!docId || toggling.value === owner.id) return

  toggling.value = owner.id

  try {
    const newActive = !Boolean(owner.active)

    console.log("TOGGLE:", owner.active, "→", newActive)

    await updateDoc(doc(db, 'users', docId), {
      active: newActive,
    })

    // update UI immédiat
    replaceOwnerLocally({
      ...owner,
      active: newActive,
    })

    // resync Firestore
    setTimeout(async () => {
      const fresh = await getDoc(doc(db, 'users', docId))
      if (fresh.exists()) {
        replaceOwnerLocally(
          normalizeOwner(fresh.id, fresh.data())
        )
      }
    }, 300)

    showToast(
      newActive
        ? `✅ ${owner.email} activé`
        : `🔴 ${owner.email} désactivé`
    )

  } catch (e) {
    console.error("❌ TOGGLE ERROR:", e)
    showToast('Erreur : ' + e.message, 'error')
  } finally {
    toggling.value = null
  }
}

/* =========================
   FILTER
========================= */
const filteredOwners = computed(() => {
  let list = [...owners.value]
  const s = search.value.toLowerCase()

  if (s) {
    list = list.filter(o =>
      (o.email || '').toLowerCase().includes(s) ||
      (o.publishedSlug || '').toLowerCase().includes(s)
    )
  }

  if (filterPlan.value) {
    list = list.filter(o => o.plan === filterPlan.value)
  }

  return list
})

/* =========================
   HELPERS
========================= */
const formatDate = (v) => {
  if (!v) return '—'
  const d = typeof v.toDate === 'function' ? v.toDate() : new Date(v)
  return d.toLocaleDateString('fr-FR')
}

const showToast = (msg, type = 'success') => {
  toast.value = msg
  toastType.value = type
  setTimeout(() => (toast.value = ''), 3000)
}

const logout = async () => {
  await signOut(auth)
  router.push('/')
}

/* =========================
   INIT
========================= */
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    currentUser.value = user

    if (!user) return router.push('/')

    if (isAdmin.value) {
      await loadOwners()
    } else {
      loading.value = false
    }
  })
})
</script>
    
  

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.adm-root {
  min-height: 100vh;
  background: #0f0f1a;
  color: #e2e8f0;
  font-family: 'DM Sans', sans-serif;
}

.adm-header {
  background: #1a1a2e;
  border-bottom: 1px solid #2d2d44;
  padding: 0 24px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 20;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.adm-brand,
.adm-header-right,
.adm-email-wrap,
.adm-td-actions {
  display: flex;
  align-items: center;
}

.adm-brand { gap: 10px; }
.adm-header-right { gap: 12px; }
.adm-logo { font-size: 22px; }
.adm-title { font-size: 17px; font-weight: 700; color: #a78bfa; }
.adm-admin-email { font-size: 13px; color: #94a3b8; }

.adm-logout,
.adm-btn-back,
.adm-btn-refresh,
.adm-btn-export,
.adm-btn-disable,
.adm-btn-activate,
.adm-btn-extend,
.adm-plan-select {
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.2s ease;
}

.adm-logout {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 6px 14px;
}

.adm-logout:hover { background: rgba(239, 68, 68, 0.25); }

.adm-loading,
.adm-denied {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}

.adm-loading { color: #94a3b8; }
.adm-denied h2 { font-size: 24px; color: #f87171; }
.adm-denied p { color: #94a3b8; }
.adm-denied-icon { font-size: 48px; }
.adm-btn-back { background: #6c63ff; color: #fff; padding: 10px 24px; }

.adm-spinner,
.adm-spinner-sm {
  border-radius: 999px;
  animation: adm-spin 0.7s linear infinite;
}

.adm-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #2d2d44;
  border-top-color: #a78bfa;
}

.adm-spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  display: inline-block;
}

@keyframes adm-spin {
  to { transform: rotate(360deg); }
}

.adm-main {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.adm-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.adm-stat-card {
  background: #1a1a2e;
  border: 1px solid #2d2d44;
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.adm-stat-icon { font-size: 28px; }
.adm-stat-val { font-size: 28px; font-weight: 700; color: #a78bfa; line-height: 1; }
.adm-stat-label { font-size: 12px; color: #64748b; margin-top: 3px; }

.adm-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.adm-search,
.adm-filter,
.adm-plan-select {
  background: #1a1a2e;
  border: 1px solid #2d2d44;
  color: #e2e8f0;
}

.adm-search {
  flex: 1;
  min-width: 220px;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
}

.adm-search:focus { border-color: #a78bfa; }
.adm-search::placeholder { color: #475569; }
.adm-filter,
.adm-plan-select {
  padding: 10px 12px;
  font-size: 13px;
}

.adm-btn-refresh,
.adm-btn-export {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.adm-btn-refresh {
  background: #2d2d44;
  border-color: #3d3d5c;
  color: #a78bfa;
}

.adm-btn-refresh:hover,
.adm-btn-export:hover { transform: translateY(-1px); }

.adm-btn-export {
  background: rgba(56, 189, 248, 0.12);
  border-color: rgba(56, 189, 248, 0.28);
  color: #7dd3fc;
}

.adm-table-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid #2d2d44;
}

.adm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 1100px;
}

.adm-table thead tr { background: #1a1a2e; }

.adm-table th,
.adm-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #1e1e30;
  vertical-align: middle;
}

.adm-table th {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom-color: #2d2d44;
  white-space: nowrap;
}

.adm-table tbody tr {
  background: #12121f;
  transition: background 0.15s ease;
}

.adm-table tbody tr:hover { background: #1a1a2e; }
.adm-row-disabled { opacity: 0.58; }
.adm-empty { text-align: center; padding: 40px; color: #64748b; }

.adm-email-wrap { gap: 10px; }
.adm-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(167, 139, 250, 0.18);
  color: #c4b5fd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.adm-td-date,
.adm-td-slug { white-space: nowrap; }
.adm-no-slug { color: #64748b; }
.adm-slug-link { color: #7dd3fc; text-decoration: none; }
.adm-slug-link:hover { text-decoration: underline; }
.adm-ext { margin-left: 4px; }

.adm-plan-badge,
.adm-status-on,
.adm-status-off,
.adm-exp-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
}

.plan-free { background: rgba(148, 163, 184, 0.14); color: #cbd5e1; }
.plan-pro { background: rgba(59, 130, 246, 0.16); color: #93c5fd; }
.plan-premium { background: rgba(168, 85, 247, 0.16); color: #d8b4fe; }
.adm-status-on { background: rgba(34, 197, 94, 0.16); color: #86efac; }
.adm-status-off { background: rgba(239, 68, 68, 0.16); color: #fca5a5; }
.adm-valid { color: #e2e8f0; }
.adm-expired { color: #fecaca; }
.adm-exp-badge { margin-left: 8px; background: rgba(239, 68, 68, 0.18); color: #fca5a5; }

.adm-td-actions {
  gap: 8px;
  flex-wrap: wrap;
}

.adm-btn-disable,
.adm-btn-activate,
.adm-btn-extend {
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 700;
}

.adm-btn-disable {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.28);
  color: #fca5a5;
}

.adm-btn-activate {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(34, 197, 94, 0.28);
  color: #86efac;
}

.adm-btn-extend {
  background: rgba(250, 204, 21, 0.14);
  border-color: rgba(250, 204, 21, 0.3);
  color: #fde68a;
}

.adm-btn-disable:disabled,
.adm-btn-activate:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.adm-toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  max-width: calc(100vw - 32px);
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 50;
}

.adm-toast.success {
  background: #10281b;
  color: #bbf7d0;
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.adm-toast.error {
  background: #2a1010;
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 768px) {
  .adm-header,
  .adm-main { padding-left: 14px; padding-right: 14px; }
  .adm-header { min-height: 72px; align-items: flex-start; padding-top: 12px; padding-bottom: 12px; }
  .adm-header-right { align-items: flex-end; flex-direction: column; }
  .adm-table { min-width: 980px; }
}
</style>
