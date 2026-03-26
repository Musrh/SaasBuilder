<template>
  <div class="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
    <div class="max-w-2xl w-full bg-white p-8 rounded-xl shadow">
      <h1 class="text-3xl font-bold mb-6 text-center">Bienvenue sur votre Dashboard !</h1>

      <div class="space-y-4 text-gray-700">
        <p><span class="font-semibold">Email :</span> {{ userEmail }}</p>
        <p><span class="font-semibold">Plan choisi :</span> {{ planName }}</p>
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

const router = useRouter();
const route = useRoute();

const userEmail = ref("");
const planName = ref("");

// Mapping plan ID → nom
const planMap = { 1: "Plan Offert", 2: "Plan Pro", 3: "Plan Premium" };

onMounted(() => {
  // Récupération du plan et email depuis query ou localStorage
  userEmail.value = route.query.email || "client@example.com";
  const planId = route.query.plan || 1;
  planName.value = planMap[planId];
});

// Redirection vers Builder.vue
const startBuilder = () => {
  router.push({ name: "Builder" });
};
</script>
