<template>
  <div class="p-6">
    <h1>Dashboard</h1>

    <div v-if="!user">Loading...</div>

    <div v-else>
      <p>{{ user.email }}</p>
      <p>{{ user.plan }}</p>

      <button @click="goBuilder">Builder</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const user = ref(null);

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return;

    const snap = await getDoc(doc(db, "users", u.uid));
    user.value = snap.data();
  });
});

const goBuilder = () => {
  window.location.href = "#/builder";
};
</script>
