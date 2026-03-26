<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
      <h2 class="text-3xl font-bold mb-6 text-center">{{ isLogin ? "Connexion" : "Inscription" }}</h2>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Mot de passe</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          {{ isLogin ? "Se connecter" : "S'inscrire" }}
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-gray-600">
        {{ isLogin ? "Pas de compte ?" : "Vous avez déjà un compte ?" }}
        <button @click="toggleMode" class="text-blue-500 font-semibold hover:underline ml-1">
          {{ isLogin ? "S'inscrire" : "Se connecter" }}
        </button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

// ⚡ Ici tu peux remplacer par ton auth Firebase
const email = ref("");
const password = ref("");
const isLogin = ref(true);

const route = useRoute();
const router = useRouter();
const selectedPlan = ref(null);

onMounted(() => {
  // Récupère le plan choisi depuis la query
  selectedPlan.value = route.query.plan || null;
  if (!selectedPlan.value) {
    alert("Aucun plan sélectionné ! Redirection vers la sélection de plan.");
    router.push({ name: "PlanSelection" });
  }
});

const toggleMode = () => (isLogin.value = !isLogin.value);

const handleSubmit = async () => {
  try {
    // Ici tu peux mettre ton login/register Firebase
    // Exemple simplifié :
    console.log(isLogin.value ? "Login" : "Register", email.value, selectedPlan.value);

    // Redirection vers Dashboard après succès
    router.push({ name: "Dashboard", query: { plan: selectedPlan.value } });
  } catch (err) {
    alert(err.message);
  }
};
</script>
