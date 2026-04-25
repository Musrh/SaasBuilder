<template>
  <div class="admin-page">
    <h1>Panneau Admin</h1>

    <div v-if="loading" class="loading">
      Chargement...
    </div>

    <div v-else-if="owners.length === 0" class="empty">
      Aucun utilisateur trouvé.
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Plan</th>
            <th>Payé</th>
            <th>Actif</th>
            <th>Expiration</th>
            <th>Commandes</th>
            <th>Créé le</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="owner in owners" :key="owner.uid || owner.id">
            <td>
              {{ owner.email || "—" }}
            </td>

            <td>
              <select
                :value="owner.plan || 'free'"
                @change="changePlan(owner, $event.target.value)"
              >
                <option value="free">Gratuit</option>
                <option value="pro">Pro</option>
              </select>
            </td>

            <td>
              <span :class="owner.paye ? 'badge success' : 'badge muted'">
                {{ owner.paye ? "Oui" : "Non" }}
              </span>
            </td>

            <td>
              <span :class="owner.active !== false ? 'badge success' : 'badge danger'">
                {{ owner.active !== false ? "Actif" : "Désactivé" }}
              </span>
            </td>

            <td>
              {{ formatDate(owner.expiry) }}
            </td>

            <td>
              {{ owner.orderCount || 0 }}
            </td>

            <td>
              {{ formatDate(owner.createdAt) }}
            </td>

            <td class="actions">
              <button
                type="button"
                @click="toggleActive(owner)"
                :class="owner.active !== false ? 'danger-button' : 'success-button'"
              >
                {{ owner.active !== false ? "Désactiver" : "Activer" }}
              </button>

              <button
                type="button"
                @click="refreshOwner(owner)"
              >
                Actualiser
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="errorMessage" class="error">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const owners = ref([]);
const loading = ref(false);
const errorMessage = ref("");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function toMillis(value) {
  if (!value) return null;

  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "object" && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return null;
}

function normalizeOwner(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    uid: data.uid || docSnap.id,
    ownerId: data.ownerId || docSnap.id,
    email: data.email || "",
    role: data.role || "",
    plan: data.plan || "free",
    paye: data.paye === true,
    active: data.active !== false,
    subscriptionActive: data.subscriptionActive === true,
    expiry: toMillis(data.expiry),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    orderCount: data.orderCount || 0,
    storeId: data.storeId || "",
    stripeAccountId: data.stripeAccountId || null,
  };
}

function getOwnerDocId(owner) {
  return owner.uid || owner.id || owner.ownerId;
}

function replaceOwnerLocally(ownerId, updates) {
  const index = owners.value.findIndex((owner) => {
    return owner.uid === ownerId || owner.id === ownerId || owner.ownerId === ownerId;
  });

  if (index !== -1) {
    owners.value.splice(index, 1, {
      ...owners.value[index],
      ...updates,
    });
  }
}

function formatDate(value) {
  const millis = toMillis(value);

  if (!millis) {
    return "—";
  }

  return new Date(millis).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function loadOwners() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const snap = await getDocs(collection(db, "users"));

    owners.value = snap.docs
      .map(normalizeOwner)
      .filter((user) => user.role === "owner" || user.ownerId || user.storeId);
  } catch (error) {
    console.error("Erreur chargement utilisateurs :", error);
    errorMessage.value = "Erreur lors du chargement des utilisateurs.";
  } finally {
    loading.value = false;
  }
}

async function refreshOwner(owner) {
  try {
    const ownerId = getOwnerDocId(owner);

    if (!ownerId) {
      alert("Utilisateur introuvable.");
      return;
    }

    const snap = await getDoc(doc(db, "users", ownerId));

    if (!snap.exists()) {
      alert("Utilisateur introuvable dans Firestore.");
      return;
    }

    const freshOwner = normalizeOwner(snap);
    replaceOwnerLocally(ownerId, freshOwner);
  } catch (error) {
    console.error("Erreur actualisation utilisateur :", error);
    alert("Erreur lors de l'actualisation.");
  }
}

async function changePlan(owner, newPlan) {
  try {
    const ownerId = getOwnerDocId(owner);

    if (!ownerId) {
      alert("Utilisateur introuvable.");
      return;
    }

    const now = Date.now();

    const updates = {
      plan: newPlan,
      updatedAt: now,
    };

    if (newPlan === "pro") {
      updates.paye = true;
      updates.active = true;
      updates.subscriptionActive = true;

      // Correction importante :
      // chaque passage vers Pro ajoute une expiration à 30 jours
      // à partir de la date du changement.
      updates.expiry = now + THIRTY_DAYS_MS;
    }

    if (newPlan === "free") {
      updates.paye = false;
      updates.subscriptionActive = false;
      updates.expiry = null;
    }

    await updateDoc(doc(db, "users", ownerId), updates);

    replaceOwnerLocally(ownerId, updates);

    await refreshOwner({
      ...owner,
      ...updates,
    });

    alert("Plan mis à jour avec succès.");
  } catch (error) {
    console.error("Erreur changement plan :", error);
    alert("Erreur lors du changement de plan.");
  }
}

async function toggleActive(owner) {
  try {
    const ownerId = getOwnerDocId(owner);

    if (!ownerId) {
      alert("Utilisateur introuvable.");
      return;
    }

    const currentActive = owner.active !== false;
    const newActive = !currentActive;

    const updates = {
      active: newActive,
      updatedAt: Date.now(),
    };

    await updateDoc(doc(db, "users", ownerId), updates);

    replaceOwnerLocally(ownerId, updates);

    await refreshOwner({
      ...owner,
      ...updates,
    });

    alert(newActive ? "Compte activé." : "Compte désactivé.");
  } catch (error) {
    console.error("Erreur activation/désactivation :", error);
    alert("Erreur lors de la modification de l'état du compte.");
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
}

.loading,
.empty {
  padding: 24px;
  background: #f5f5f5;
  border-radius: 8px;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #e5e5e5;
  text-align: left;
  white-space: nowrap;
}

th {
  background: #f8f8f8;
  font-weight: 600;
}

select {
  padding: 8px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: white;
}

button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #2563eb;
  color: white;
  font-weight: 500;
}

button:hover {
  opacity: 0.9;
}

.actions {
  display: flex;
  gap: 8px;
}

.success-button {
  background: #16a34a;
}

.danger-button {
  background: #dc2626;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 13px;
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

.badge.muted {
  background: #f3f4f6;
  color: #4b5563;
}

.error {
  margin-top: 16px;
  color: #dc2626;
  font-weight: 600;
}

@media (max-width: 768px) {
  .admin-page {
    padding: 12px;
  }

  th,
  td {
    padding: 10px;
    font-size: 14px;
  }

  .actions {
    flex-direction: column;
  }
}
</style>
