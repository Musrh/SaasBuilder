<template>
  <div class="admin-page">
    <h1>Administration</h1>

    <div class="admin-header">
      <input
        v-model="search"
        type="text"
        placeholder="Rechercher par email..."
        class="search-input"
      />

      <button class="refresh-btn" @click="loadOwners">
        Actualiser
      </button>
    </div>

    <div v-if="loading" class="loading">
      Chargement...
    </div>

    <div v-else-if="filteredOwners.length === 0" class="empty">
      Aucun utilisateur trouvé.
    </div>

    <div v-else class="table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Plan</th>
            <th>Payé</th>
            <th>Actif</th>
            <th>Abonnement</th>
            <th>Expiration</th>
            <th>Commandes</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="owner in filteredOwners" :key="owner.id">
            <td>
              {{ owner.email || "—" }}
            </td>

            <td>
              <select
                :value="owner.plan || 'free'"
                @change="changePlan(owner, $event.target.value)"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </td>

            <td>
              <span :class="owner.paye ? 'badge success' : 'badge danger'">
                {{ owner.paye ? "Oui" : "Non" }}
              </span>
            </td>

            <td>
              <span :class="owner.active !== false ? 'badge success' : 'badge danger'">
                {{ owner.active !== false ? "Oui" : "Non" }}
              </span>
            </td>

            <td>
              <span :class="owner.subscriptionActive ? 'badge success' : 'badge danger'">
                {{ owner.subscriptionActive ? "Active" : "Inactive" }}
              </span>
            </td>

            <td>
              {{ formatDate(owner.expiry) }}
            </td>

            <td>
              {{ owner.orderCount || 0 }}
            </td>

            <td class="actions">
              <button @click="toggleActive(owner)">
                {{ owner.active !== false ? "Désactiver" : "Activer" }}
              </button>

              <button @click="refreshOwner(owner)">
                Sync
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="error" class="error">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const owners = ref([]);
const loading = ref(false);
const error = ref("");
const search = ref("");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const filteredOwners = computed(() => {
  const term = search.value.trim().toLowerCase();

  if (!term) {
    return owners.value;
  }

  return owners.value.filter((owner) => {
    return String(owner.email || "")
      .toLowerCase()
      .includes(term);
  });
});

function getOwnerDocId(owner) {
  return owner?.uid || owner?.id || owner?.ownerId || owner?.storeId || null;
}

function toMillis(value) {
  if (!value) return null;

  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (typeof value?.seconds === "number") {
    return value.seconds * 1000;
  }

  return null;
}

function formatDate(value) {
  const millis = toMillis(value);

  if (!millis) {
    return "—";
  }

  return new Date(millis).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizeOwner(id, data) {
  return {
    id,
    uid: data.uid || id,
    ownerId: data.ownerId || data.uid || id,
    storeId: data.storeId || data.ownerId || data.uid || id,
    email: data.email || "",
    role: data.role || "",
    plan: data.plan || "free",
    paye: Boolean(data.paye),
    active: data.active !== false,
    subscriptionActive: Boolean(data.subscriptionActive),
    expiry: data.expiry ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    stripeAccountId: data.stripeAccountId ?? null,
    orderCount: data.orderCount || 0,
    ...data,
  };
}

function replaceOwnerLocally(ownerId, newData) {
  const index = owners.value.findIndex((owner) => {
    return owner.id === ownerId || owner.uid === ownerId;
  });

  if (index !== -1) {
    owners.value.splice(index, 1, {
      ...owners.value[index],
      ...newData,
    });
  }
}

async function loadOwners() {
  loading.value = true;
  error.value = "";

  try {
    const usersRef = collection(db, "users");

    let snapshot;

    try {
      const ownersQuery = query(usersRef, where("role", "==", "owner"));
      snapshot = await getDocs(ownersQuery);
    } catch {
      snapshot = await getDocs(usersRef);
    }

    owners.value = snapshot.docs.map((userDoc) => {
      return normalizeOwner(userDoc.id, userDoc.data());
    });
  } catch (err) {
    console.error("Erreur chargement owners :", err);
    error.value = "Erreur lors du chargement des utilisateurs.";
  } finally {
    loading.value = false;
  }
}

async function refreshOwner(owner) {
  try {
    const userId = getOwnerDocId(owner);

    if (!userId) {
      console.error("UID introuvable :", owner);
      return;
    }

    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      console.error("Utilisateur introuvable :", userId);
      return;
    }

    const freshOwner = normalizeOwner(snap.id, snap.data());
    replaceOwnerLocally(owner.id, freshOwner);
  } catch (err) {
    console.error("Erreur synchronisation owner :", err);
  }
}

const changePlan = async (owner, newPlan) => {
  try {
    const isPaid = newPlan !== "free"
    const wasFree = (owner.plan || "free") === "free"

    const update = {
      plan: newPlan,
      paye: isPaid,
      subscriptionActive: isPaid,
    }

    if (isPaid) {
      // ✅ CAS IMPORTANT : Free → Pro/Premium
      if (wasFree) {
        update.expiry = Date.now() + 30 * DAY_MS
      } else {
        // Déjà payant → on garde ou prolonge intelligemment
        const currentExpiry = toMillis(owner.expiry)
        update.expiry = currentExpiry && currentExpiry > Date.now()
          ? currentExpiry
          : Date.now() + 30 * DAY_MS
      }

      update.active = true
    } else {
      // Retour au free
      update.expiry = null
      update.active = true
    }

    await updateDoc(doc(db, "users", owner.id), update)
    replaceOwnerLocally(owner.id, update)
    await refreshOwnerFromFirestore(owner.id)

    showToast(
      "✅ Plan de " + owner.email + " → " + newPlan.toUpperCase() +
      (update.expiry ? " (expire le " + formatDate(update.expiry) + ")" : "")
    )

  } catch(e) {
    showToast("Erreur changePlan : " + e.message, "error")
  }
}



  

async function toggleActive(owner) {
  try {
    const userId = getOwnerDocId(owner);

    if (!userId) {
      console.error("UID utilisateur introuvable :", owner);
      alert("Impossible de modifier le statut : utilisateur introuvable.");
      return;
    }

    const currentActive = owner.active !== false;
    const nextActive = !currentActive;

    const updates = {
      active: nextActive,
      updatedAt: Date.now(),
    };

    const userRef = doc(db, "users", userId);

    await setDoc(userRef, updates, { merge: true });

    replaceOwnerLocally(owner.id, updates);
  } catch (err) {
    console.error("Erreur activation/désactivation :", err);
    alert("Erreur lors de la modification du statut.");
  }
}

onMounted(() => {
  loadOwners();
});
</script>

<style scoped>
.admin-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 24px;
  font-size: 28px;
  font-weight: 700;
}

.admin-header {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  font-size: 15px;
}

.refresh-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  cursor: pointer;
}

.refresh-btn:hover {
  background: #1d4ed8;
}

.loading,
.empty {
  padding: 24px;
  text-align: center;
  color: #666;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.admin-table th,
.admin-table td {
  padding: 12px;
  border-bottom: 1px solid #e5e5e5;
  text-align: left;
  font-size: 14px;
}

.admin-table th {
  background: #f7f7f7;
  font-weight: 700;
}

.admin-table select {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge.success {
  background: #dcfce7;
  color: #166534;
}

.badge.danger {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.actions button:hover {
  background: #f3f4f6;
}

.error {
  margin-top: 16px;
  color: #dc2626;
  font-weight: 600;
}

@media (max-width: 768px) {
  .admin-page {
    padding: 16px;
  }

  .admin-header {
    flex-direction: column;
  }
}
</style>
