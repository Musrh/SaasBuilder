<template>
  <div class="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
    <div class="max-w-2xl w-full bg-white p-8 rounded-xl shadow">
      <h1 class="text-3xl font-bold mb-6 text-center">Bienvenue sur votre Dashboard !</h1>

      <div class="space-y-4 text-gray-700">
        <p v-if="userEmail"><span class="font-semibold">Email :</span> {{ userEmail }}</p>
        <p v-if="planName"><span class="font-semibold">Plan choisi :</span> {{ planName }}</p>
        <p v-if="planExpiry"><span class="font-semibold">Date d'expiration :</span> {{ planExpiry }}</p>
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
import { useRouter } from "vue-router";
import { auth } from "../firebase"; // Assure-toi que firebase.js exporte auth

const router = useRouter();

// Références pour afficher infos utilisateur
const userEmail = ref("");
const planName = ref("");
const planExpiry = ref("");

const planMap = { 1: "Plan Offert", 2: "Plan Pro", 3: "Plan Premium" };

// 🔹 Charger les infos utilisateur au montage
onMounted(() => {
  const unsubscribe = auth.onAuthStateChanged(user => {
    if (user) {
      userEmail.value = user.email;

      // Plan choisi stocké dans localStorage lors de l'inscription
      const storedPlan = parseInt(localStorage.getItem("planChoisi")) || 1;
      planName.value = planMap[storedPlan] || "Plan Offert";

      const storedExpiry = localStorage.getItem("planExpiry");
      if (storedExpiry) {
        const date = new Date(parseInt(storedExpiry));
        planExpiry.value = date.toLocaleDateString();
      }
    } else {
      // Pas connecté → redirige vers AuthForm
      router.push({ name: "AuthForm" });
    }
  });

  // Nettoyage si besoin
  return () => unsubscribe();
});

// 🔹 Bouton start builder
const startBuilder = () => {
  // Vérifie si la route Builder existe dans router
  router.push({ name: "Builder" });
};
</script>
