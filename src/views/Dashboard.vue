<template>
  <div class="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
    <div class="max-w-2xl w-full bg-white p-8 rounded-xl shadow">
      <h1 class="text-3xl font-bold mb-6 text-center">Bienvenue sur votre Dashboard !</h1>

      <div class="space-y-4 text-gray-700">
        <p><span class="font-semibold">Email :</span> {{ userEmail }}</p>
        <p><span class="font-semibold">Plan choisi :</span> {{ planName }}</p>
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

const router = useRouter();

const userEmail = ref("client@example.com");
const planName = ref("Plan Offert");
const planExpiry = ref("");

// Mapping plan ID → nom
const planMap = { 1: "Plan Offert", 2: "Plan Pro", 3: "Plan Premium" };

// 🔹 Charger les infos depuis localStorage
onMounted(() => {
  // Email et plan sauvegardés après AuthForm
  const storedEmail = localStorage.getItem("emailUtilisateur");
  const storedPlan = parseInt(localStorage.getItem("planChoisi")) || 1;
  const storedExpiry = localStorage.getItem("planExpiry"); // timestamp optionnel

  if (storedEmail) userEmail.value = storedEmail;
  planName.value = planMap[storedPlan] || "Plan Offert";

  if (storedExpiry) {
    const date = new Date(parseInt(storedExpiry));
    planExpiry.value = date.toLocaleDateString();
  }
});

// 🔹 Bouton pour aller à Builder.vue
const startBuilder = () => {
  router.push({ name: "Builder" });
};
</script>
