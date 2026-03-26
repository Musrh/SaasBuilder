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
          class="w-full border rounded-lg px-4 py-2"
        />

        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          required
          class="w-full border rounded-lg px-4 py-2"
        />

        <button
          type="submit"
          class="w-full bg-blue-500 text-white py-2 rounded-lg"
        >
          {{ isLogin ? "Se connecter" : "S'inscrire" }}
        </button>

      </form>

      <p class="mt-4 text-center text-sm">
        <button @click="toggleMode" class="text-blue-500">
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

const toggleMode = () => {
  isLogin.value = !isLogin.value;
};

const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } else {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      const user = userCred.user;

      const plan = localStorage.getItem("selectedPlan") || "free";

      await setDoc(doc(db, "users", user.uid), {
        email: email.value,
        username: email.value.split("@")[0],
        plan: plan,
        createdAt: new Date(),
        expiresAt: null,
        sections: [
          {
            id: crypto.randomUUID(),
            type: "Header",
            props: {
              title: "Bienvenue"
            }
          }
        ]
      });
    }

    router.push("/dashboard");

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};
</script>
