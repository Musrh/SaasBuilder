<template>
  <div class="min-h-screen bg-gray-100 p-6">

    <!-- HEADER -->
    <div class="max-w-4xl mx-auto flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Dashboard</h1>

      <button
        @click="logout"
        class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
      >
        Déconnexion
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="!user" class="text-center mt-10">
      Chargement...
    </div>

    <!-- CONTENT -->
    <div v-else class="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">

      <!-- INFOS -->
      <div class="bg-white p-6 rounded-xl shadow">
        <h2 class="font-bold mb-4 text-lg">Informations</h2>

        <p><b>Email :</b> {{ user.email }}</p>

        <p class="mt-2">
          <b>Plan :</b>
          <span
            class="px-2 py-1 rounded text-white text-sm"
            :class="planColor"
          >
            {{ user.plan }}
          </span>
        </p>

        <p class="mt-2" v-if="expiryDate">
          <b>Expiration :</b> {{ expiryDate }}
        </p>

        <p class="mt-2" v-if="daysLeft !== null">
          <b>Jours restants :</b>
          <span :class="daysLeft < 5 ? 'text-red-500' : 'text-green-600'">
            {{ daysLeft }}
          </span>
        </p>
      </div>

      <!-- ACTIONS -->
      <div class="bg-white p-6 rounded-xl shadow">

        <button
          @click="goBuilder"
          class="w-full mb-3 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
        >
          🚀 Accéder au Builder
        </button>

        <button
          v-if="user.plan !== 'premium'"
          @click="upgrade"
          class="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition"
        >
          ⭐ Upgrade
        </button>

        <p class="mt-4 text-sm text-gray-500">
          {{ planDescription }}
        </p>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "vue-router";

const router = useRouter();

const user = ref(null);
const expiry = ref(null);

/* LOAD USER */
onMounted(() => {
  onAuthStateChanged(auth, async (u) => {

    // 🔥 SI PAS CONNECTÉ → ACCUEIL
    if (!u) {
      router.push("/");
      return;
    }

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      user.value = snap.data();
      expiry.value = user.value?.expiry;
    }
  });
});

/* DATE FORMAT */
const expiryDate = computed(() => {
  if (!expiry.value) return null;
  return new Date(expiry.value).toLocaleDateString();
});

/* DAYS LEFT */
const daysLeft = computed(() => {
  if (!expiry.value) return null;
  return Math.ceil((expiry.value - Date.now()) / (1000 * 60 * 60 * 24));
});

/* PLAN COLOR */
const planColor = computed(() => {
  if (!user.value) return "";

  return user.value.plan === "free"
    ? "bg-gray-500"
    : user.value.plan === "pro"
    ? "bg-blue-500"
    : "bg-purple-600";
});

/* PLAN DESCRIPTION */
const planDescription = computed(() => {
  if (!user.value) return "";

  if (user.value.plan === "free") return "Plan gratuit : 1 seule page";
  if (user.value.plan === "pro") return "Plan Pro : multi pages";
  if (user.value.plan === "premium") return "Plan Premium : e-commerce";

  return "";
});

/* BUILDER REDIRECTION */
const goBuilder = () => {
  if (!user.value) return;

  if (user.value.plan === "free") {
    router.push("/builder1");
  } else if (user.value.plan === "pro") {
    router.push("/builder");
  } else if (user.value.plan === "premium") {
    router.push("/builder3");
  }
};

/* UPGRADE */
const upgrade = () => {
  router.push("/panier?plan=pro&price=5");
};

/* LOGOUT */
const logout = async () => {
  try {
    await signOut(auth);

    // 🔥 CLEAN STORAGE
    localStorage.clear();

    // 🔥 REDIRECT HOME
    router.push("/");

  } catch (error) {
    console.error(error);
    alert("Erreur lors de la déconnexion");
  }
};
</script>
