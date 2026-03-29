<template>
  <div class="min-h-screen flex items-center justify-center bg-green-50">

    <div class="bg-white p-8 rounded-xl shadow text-center">

      <h1 class="text-3xl font-bold text-green-600 mb-4">
        ✅ Paiement réussi
      </h1>

      <p class="mb-6 text-gray-600">
        Votre abonnement est activé
      </p>

      <button
        @click="goDashboard"
        class="bg-green-500 text-white px-6 py-3 rounded-lg"
      >
        Accéder au Dashboard
      </button>

    </div>

  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { auth, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

const router = useRouter();

onMounted(() => {

  const plan = localStorage.getItem("planChoisi");

  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    if (!plan) return;

    try {
      // 🔥 UPDATE FIRESTORE APRÈS PAIEMENT
      await updateDoc(doc(db, "users", user.uid), {
        plan: plan,
        expiry: Date.now() + 30 * 24 * 60 * 60 * 1000
      });

      console.log("PLAN MIS À JOUR :", plan);

    } catch (e) {
      console.error(e);
    }
  });
});

const goDashboard = () => {
  router.push("/dashboard");
};
</script>
