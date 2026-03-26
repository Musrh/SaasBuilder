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
import { auth } from "../firebase"; // Configure Firebase Auth
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const email = ref("");
const password = ref("");
const isLogin = ref(true);

const route = useRoute();
const router = useRouter();
const selectedPlan = ref(null);

onMounted(() => {
  selectedPlan.value = route.query.plan || null; // Récupère le plan sélectionné
});

const toggleMode = () => {
  isLogin.value = !isLogin.value;
};

const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } else {
      await createUserWithEmailAndPassword(auth, email.value, password.value);
    }

    // Redirection vers Dashboard avec plan choisi
    router.push({ name: "Dashboard", query: { plan: selectedPlan.value } });
  } catch (err) {
    alert(err.message);
  }
};
</script>
