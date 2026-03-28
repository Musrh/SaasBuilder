<template>
  <div class="min-h-screen bg-gray-100 p-6">

    <!-- HEADER -->
    <div class="max-w-4xl mx-auto mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>

      <button
        @click="logout"
        class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
      >
        Déconnexion
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="!user" class="text-center text-gray-500">
      Chargement...
    </div>

    <!-- CONTENT -->
    <div v-else class="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">

      <!-- USER CARD -->
      <div class="bg-white p-6 rounded-2xl shadow">
        <h2 class="text-lg font-semibold mb-4 text-gray-700">Informations utilisateur</h2>

        <p class="mb-2">
          <span class="font-semibold">Email :</span>
          {{ user.email }}
        </p>

        <p class="mb-2">
          <span class="font-semibold">Plan :</span>
          <span class="px-2 py-1 rounded text-white text-sm"
            :class="planColor">
            {{ user.plan || "free" }}
          </span>
        </p>

        <p class="mb-2" v-if="expiryDate">
          <span class="font-semibold">Expiration :</span>
          {{ expiryDate }}
        </p>

        <p class="mb-2" v-if="daysLeft !== null">
          <span class="font-semibold">Jours restants :</span>
          <span :class="daysLeft < 5 ? 'text-red-500 font-bold' : 'text-green-600'">
            {{ daysLeft }} jours
          </span>
        </p>
      </div>

      <!-- ACTION CARD -->
      <div class="bg-white p-6 rounded-2xl shadow flex flex-col justify-between">

        <div>
          <h2 class="text-lg font-semibold mb-4 text-gray-700">Actions</h2>

          <button
            @click="goBuilder"
            class="w-full mb-3 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
          >
            🚀 Ouvrir le Builder
          </button>

          <button
            @click="upgradePlan"
            class="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition"
          >
            ⭐ Upgrade Plan
          </button>
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const user = ref(null);
const expiryTimestamp = ref(null);

/* LOAD USER */
onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return;

    const snap = await getDoc(doc(db, "users", u.uid));
    const data = snap.data();

    user.value = data;

    // 🔥 Exemple : expiration stockée en timestamp
    expiryTimestamp.value = data?.expiry || null;
  });
});

/* FORMAT DATE */
const expiryDate = computed(() => {
  if (!expiryTimestamp.value) return null;
  return new Date(expiryTimestamp.value).toLocaleDateString();
});

/* DAYS LEFT */
const daysLeft = computed(() => {
  if (!expiryTimestamp.value) return null;

  const now = Date.now();
  const diff = expiryTimestamp.value - now;

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

/* PLAN COLOR */
const planColor = computed(() => {
  if (!user.value?.plan) return "bg-gray-400";

  return user.value.plan === "free"
    ? "bg-gray-500"
    : user.value.plan === "pro"
    ? "bg-blue-500"
    : "bg-purple-600";
});

/* ACTIONS */
const goBuilder = () => {
  window.location.href = "#/builder";
};

const upgradePlan = () => {
  alert("Redirection vers paiement (Stripe / PayPal)");
};

/* LOGOUT */
const logout = async () => {
  await signOut(auth);
  window.location.href = "#/auth";
};
</script>
