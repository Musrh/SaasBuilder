<template>
  <div class="p-6">

    <div v-if="loading">Loading...</div>

    <div v-else-if="user">

      <h1 class="text-2xl font-bold mb-4">
        Dashboard
      </h1>

      <p>Email: {{ user.email }}</p>
      <p>Plan: {{ user.plan }}</p>

      <button
        @click="goBuilder"
        class="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Ouvrir Builder
      </button>

      <button
        @click="logout"
        class="mt-4 ml-2 bg-red-500 text-white px-4 py-2 rounded"
      >
        Logout
      </button>

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
      router.push("/auth");
      return;
    }

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      user.value = snap.data();
    }

    loading.value = false;
  });
});

const goBuilder = () => {
  router.push("/builder");
};

const logout = async () => {
  await signOut(auth);
  router.push("/auth");
};
</script>
