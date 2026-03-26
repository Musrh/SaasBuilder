<template>
  <div class="p-6">

    <h1 class="text-2xl font-bold mb-4">
      Dashboard
    </h1>

    <!-- Loading -->
    <div v-if="loading">
      Loading...
    </div>

    <!-- Not logged -->
    <div v-else-if="!user">
      <p>Utilisateur non connecté</p>
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded mt-2"
        @click="goAuth"
      >
        Login
      </button>
    </div>

    <!-- User data -->
    <div v-else>

      <div class="border p-4 rounded mb-4">
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>Plan:</strong> {{ user.plan }}</p>
        <p><strong>Sections:</strong> {{ user.sections?.length || 0 }}</p>
      </div>

      <div class="flex gap-2">
        <button
          class="bg-green-500 text-white px-4 py-2 rounded"
          @click="goBuilder"
        >
          Ouvrir Builder
        </button>

        <button
          class="bg-red-500 text-white px-4 py-2 rounded"
          @click="logout"
        >
          Logout
        </button>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const router = useRouter();

const user = ref(null);
const loading = ref(true);

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {

    if (!u) {
      user.value = null;
      loading.value = false;
      return;
    }

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      user.value = snap.data();
    } else {
      user.value = {
        email: u.email,
        plan: "free",
        sections: []
      };
    }

    loading.value = false;
  });
});

const goBuilder = () => {
  router.push("/builder");
};

const goAuth = () => {
  router.push("/auth");
};

const logout = async () => {
  await signOut(auth);
  router.push("/auth");
};
</script>
