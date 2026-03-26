<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center p-6">
    
    <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
      
      <h2 class="text-3xl font-extrabold mb-6 text-center text-gray-800">
        {{ isLogin ? "Connexion" : "Inscription" }}
      </h2>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
          class="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          required
          class="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <button
          type="submit"
          class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          {{ isLogin ? "Se connecter" : "S'inscrire" }}
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-gray-600">
        {{ isLogin ? "Pas de compte ?" : "Déjà inscrit ?" }}
        <button @click="toggleMode" class="text-blue-500 font-semibold ml-1">
          {{ isLogin ? "Créer un compte" : "Se connecter" }}
        </button>
      </p>

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

// 🔹 Switch login/register
const toggleMode = () => {
  isLogin.value = !isLogin.value;
};

// 🔹 Submit form
const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      // 🔐 LOGIN
      await signInWithEmailAndPassword(auth, email.value, password.value);

    } else {
      // 📝 REGISTER
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      const user = userCred.user;

      // 🔥 Récupérer plan depuis localStorage
      const plan = parseInt(localStorage.getItem("planChoisi")) || 1;
      const expiry = localStorage.getItem("planExpiry");

      // 🔥 Sauvegarde Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email.value,
        plan: plan,
        createdAt: new Date(),
        expiresAt: expiry ? new Date(parseInt(expiry)) : null,
        project: {
          sections: [],
        },
      });
    }

    // 🚀 Redirection
    router.push({ name: "Dashboard" });

  } catch (err) {
    alert(err.message);
  }
};
</script>
