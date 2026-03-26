<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-6 flex justify-center">
    
    <div class="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8">

      <h1 class="text-3xl font-extrabold mb-6 text-center text-gray-800">
        Dashboard
      </h1>

      <!-- 🔹 Infos utilisateur -->
      <div v-if="loading" class="text-center text-gray-500">
        Chargement...
      </div>

      <div v-else class="space-y-4 text-gray-700">

        <p><span class="font-semibold">Email :</span> {{ user.email }}</p>

        <p>
          <span class="font-semibold">Plan :</span>
          <span class="px-3 py-1 rounded-full text-white text-sm"
            :class="planColor">
            {{ planName }}
          </span>
        </p>

        <p>
          <span class="font-semibold">Expiration :</span>
          {{ formattedDate }}
        </p>

        <p v-if="isExpired" class="text-red-500 font-semibold">
          ⚠️ Votre plan est expiré
        </p>

      </div>

      <!-- 🔹 Actions -->
      <div class="mt-8 flex flex-col gap-4">

        <button
          @click="goBuilder"
          :disabled="isExpired"
          class="bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:bg-gray-400"
        >
          Créer / Modifier mon site
        </button>

        <button
          @click="logout"
          class="bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
        >
          Déconnexion
        </button>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const router = useRouter();

const user = ref({});
const loading = ref(true);

// 🔹 Plan mapping
const planMap = {
  1: "Offert",
  2: "Pro",
  3: "Premium",
};

// 🔹 Charger données Firestore
onMounted(async () => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) {
      router.push({ name: "AuthForm" });
      return;
    }

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      user.value = snap.data();
    }

    loading.value = false;
  });
});

// 🔹 Plan name
const planName = computed(() => {
  return planMap[user.value.plan] || "Offert";
});

// 🔹 Couleur plan
const planColor = computed(() => {
  return {
    1: "bg-gray-500",
    2: "bg-blue-500",
    3: "bg-purple-500",
  }[user.value.plan] || "bg-gray-500";
});

// 🔹 Format date
const formattedDate = computed(() => {
  if (!user.value.expiresAt) return "—";

  const date = user.value.expiresAt.toDate
    ? user.value.expiresAt.toDate()
    : new Date(user.value.expiresAt);

  return date.toLocaleDateString();
});

// 🔹 Expiration
const isExpired = computed(() => {
  if (!user.value.expiresAt) return false;

  const now = new Date();
  const expiry = user.value.expiresAt.toDate
    ? user.value.expiresAt.toDate()
    : new Date(user.value.expiresAt);

  return now > expiry;
});

// 🔹 Aller au builder
const goBuilder = () => {
  router.push({ name: "Builder" });
};

// 🔹 Logout
const logout = async () => {
  await signOut(auth);
  router.push({ name: "AuthForm" });
};
</script>
