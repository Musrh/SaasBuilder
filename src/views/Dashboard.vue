<template>
  <div class="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
    <div class="max-w-2xl w-full bg-white p-8 rounded-xl shadow">
      <h1 class="text-3xl font-bold mb-6 text-center">Bienvenue sur votre Dashboard !</h1>

      <div class="space-y-4 text-gray-700">
        <p><span class="font-semibold">Email :</span> {{ userEmail }}</p>
        <p><span class="font-semibold">Plan :</span> {{ planName }}</p>
        <p><span class="font-semibold">Date d'expiration :</span> {{ planExpiry }}</p>
      </div>

      <div class="mt-8 text-center">
        <button
          @click="startBuilder"
          class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          Start Building Your Site
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { auth, db } from "../firebase"; // Firebase Auth + Firestore
import { doc, getDoc } from "firebase/firestore";

// 🔹 Références Vue
const router = useRouter();
const route = useRoute();

const userEmail = ref("");
const planName = ref("");
const planExpiry = ref("");

// Mapping plan ID → nom
const planMap = { 1: "Plan Offert", 2: "Plan Pro", 3: "Plan Premium" };

// 🔹 Charger les infos du client connecté
onMounted(async () => {
  if (auth.currentUser) {
    userEmail.value = auth.currentUser.email;

    // Récupérer plan et date d'expiration depuis Firestore
    const userDoc = doc(db, "users", auth.currentUser.uid);
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      const data = docSnap.data();
      planName.value = planMap[data.plan] || "Non défini";
      planExpiry.value = data.planExpiry
        ? new Date(data.planExpiry.seconds * 1000).toLocaleDateString()
        : "Non défini";
    }
  }
});

// 🔹 Redirection vers Builder
const startBuilder = () => {
  router.push({ name: "Builder" });
};
</script>
