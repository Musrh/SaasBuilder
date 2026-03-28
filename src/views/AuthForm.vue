<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">

    <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-6">

      <!-- 🔥 TITRE -->
      <h1 class="text-2xl font-bold text-center mb-6">
        {{ isLogin ? "Connexion" : "Créer un compte" }}
      </h1>

      <!-- 🔥 FORM -->
      <div class="space-y-4">

        <!-- EMAIL -->
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <!-- PASSWORD -->
        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <!-- 🔥 BUTTON -->
        <button
          @click="handleSubmit"
          class="w-full py-3 rounded-lg text-white font-semibold transition"
          :class="isLogin 
            ? 'bg-blue-500 hover:bg-blue-600' 
            : 'bg-green-500 hover:bg-green-600'"
        >
          {{ isLogin ? "Se connecter" : "S'inscrire" }}
        </button>

      </div>

      <!-- 🔥 SWITCH MODE -->
      <div class="mt-6 text-center text-sm text-gray-600">
        <span>
          {{ isLogin ? "Pas de compte ?" : "Déjà un compte ?" }}
        </span>

        <button
          @click="isLogin = !isLogin"
          class="text-blue-500 font-semibold ml-1 hover:underline"
        >
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

    if (isLogin.value) {
      // 🔐 LOGIN
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } else {
      // 🆕 REGISTER
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      await setDoc(doc(db, "users", cred.user.uid), {
        email: email.value,
        plan: "free",
        createdAt: new Date(),
        sections: []
      });
    }

    router.push("/dashboard");

  } catch (e) {
    console.error(e);
    alert(e.message);
  }
};
</script>
