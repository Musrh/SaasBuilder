<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">

    <!-- CARD -->
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

      <!-- LOGO / TITLE -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          {{ isLogin ? "Connexion" : "Créer un compte" }}
        </h1>
        <p class="text-gray-500 text-sm mt-2">
          Accédez à votre espace en toute sécurité
        </p>
      </div>

      <!-- FORM -->
      <div class="space-y-4">

        <!-- EMAIL -->
        <div>
          <label class="text-sm text-gray-600">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="exemple@email.com"
            class="w-full mt-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        <!-- PASSWORD -->
        <div>
          <label class="text-sm text-gray-600">Mot de passe</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full mt-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        <!-- BUTTON -->
        <button
          @click="handleSubmit"
          class="w-full py-3 rounded-xl font-semibold text-white transition duration-300 shadow-md"
          :class="isLogin
            ? 'bg-blue-500 hover:bg-blue-600 active:scale-95'
            : 'bg-green-500 hover:bg-green-600 active:scale-95'"
        >
          {{ isLogin ? "Se connecter" : "S'inscrire" }}
        </button>

      </div>

      <!-- DIVIDER -->
      <div class="my-6 border-t"></div>

      <!-- SWITCH -->
      <div class="text-center text-sm text-gray-600">
        <span>
          {{ isLogin ? "Pas encore de compte ?" : "Déjà inscrit ?" }}
        </span>

        <button
          @click="isLogin = !isLogin"
          class="ml-1 text-blue-500 font-semibold hover:underline"
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
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } else {
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
