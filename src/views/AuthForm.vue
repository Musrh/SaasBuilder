<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">

    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

      <h1 class="text-3xl font-bold text-center mb-6">
        {{ isLogin ? "Connexion" : "Créer un compte" }}
      </h1>

      <div class="space-y-4">

        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400"
        />

        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400"
        />

        <button
          @click="handleSubmit"
          class="w-full py-3 rounded-xl text-white font-semibold transition"
          :class="isLogin ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'"
        >
          {{ isLogin ? "Se connecter" : "S'inscrire" }}
        </button>

      </div>

      <div class="mt-6 text-center text-sm">
        <span>{{ isLogin ? "Pas de compte ?" : "Déjà un compte ?" }}</span>
        <button @click="isLogin = !isLogin" class="text-blue-500 ml-1">
          {{ isLogin ? "Créer un compte" : "Se connecter" }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const email = ref("");
const password = ref("");
const isLogin = ref(true);
const router = useRouter();

const handleSubmit = async () => {
  try {
    if (!email.value || !password.value) {
      alert("Remplis les champs");
      return;
    }

    const selectedPlan = localStorage.getItem("planChoisi") || "free";

    if (isLogin.value) {
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } else {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      await setDoc(doc(db, "users", cred.user.uid), {
        email: email.value,
        plan: selectedPlan,
        createdAt: Date.now(),
        expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        sections: []
      });
    }

    router.push("/dashboard");

  } catch (e) {
    alert(e.message);
  }
};
</script>
