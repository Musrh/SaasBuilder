<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">

    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

      <!-- TITLE -->
      <h1 class="text-3xl font-bold text-center mb-6">
        {{ isLogin ? "Connexion" : "Créer un compte" }}
      </h1>

      <!-- FORM -->
      <div class="space-y-4">

        <!-- EMAIL -->
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <!-- PASSWORD -->
        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <!-- BUTTON -->
        <button
          @click="handleSubmit"
          class="w-full py-3 rounded-xl text-white font-semibold transition"
          :class="isLogin 
            ? 'bg-blue-500 hover:bg-blue-600' 
            : 'bg-green-500 hover:bg-green-600'"
        >
          {{ isLogin ? "Se connecter" : "S'inscrire" }}
        </button>

      </div>

      <!-- SWITCH -->
      <div class="mt-6 text-center text-sm text-gray-600">
        <span>
          {{ isLogin ? "Pas de compte ?" : "Déjà un compte ?" }}
        </span>

        <button
          @click="isLogin = !isLogin"
          class="text-blue-500 ml-1 font-semibold hover:underline"
        >
          {{ isLogin ? "Créer un compte" : "Se connecter" }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";

import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";

/* STATE */
const email = ref("");
const password = ref("");
const isLogin = ref(true);

const router = useRouter();
const route = useRoute();

/* 🔥 AUTH LOGIC */
const handleSubmit = async () => {
  try {

    if (!email.value || !password.value) {
      alert("Remplis les champs");
      return;
    }

    // 🔥 Plan sélectionné
    const selectedPlan =
      route.query.plan ||
      localStorage.getItem("planChoisi") ||
      "free";

    let userCredential;

    // ================= LOGIN =================
    if (isLogin.value) {

      userCredential = await signInWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      const user = userCredential.user;

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        alert("Utilisateur introuvable");
        return;
      }

      const userData = snap.data();

      const plan = userData.plan || "free";
      const paye = userData.paye || false;

      localStorage.setItem("planChoisi", plan);

      // ================= FREE =================
      if (plan === "free") {
        router.push("/dashboard");
        return;
      }

      // ================= PRO =================
      if (plan === "pro") {

        if (paye) {
          // ✅ payé → Dashboard → Builder2
          router.push("/dashboard");
        } else {
          // ❌ pas payé → Panier
          router.push({
            path: "/panier",
            query: { plan: "pro", price: 5 }
          });
        }

        return;
      }

      // ================= PREMIUM =================
      if (plan === "premium") {

        if (paye) {
          // ✅ payé → Dashboard → Builder Premium
          router.push("/dashboard");
        } else {
          // ❌ pas payé → Panier
          router.push({
            path: "/panier",
            query: { plan: "premium", price: 10 }
          });
        }

        return;
      }

      // fallback
      router.push("/dashboard");
    }

    // ================= REGISTER =================
    else {

      userCredential = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      const user = userCredential.user;

      // 🔥 création Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email.value,
        plan: selectedPlan,
        paye: selectedPlan === "free", // ✅ FREE actif direct
        createdAt: Date.now(),
        expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        sections: []
      });

      localStorage.setItem("planChoisi", selectedPlan);

      // ================= FREE =================
      if (selectedPlan === "free") {
        router.push("/dashboard");
        return;
      }

      // ================= PRO =================
      if (selectedPlan === "pro") {
        router.push({
          path: "/panier",
          query: { plan: "pro", price: 5 }
        });
        return;
      }

      // ================= PREMIUM =================
      if (selectedPlan === "premium") {
        router.push({
          path: "/panier",
          query: { plan: "premium", price: 10 }
        });
        return;
      }
    }

  } catch (error) {
    console.error(error);
    alert(error.message || "Erreur");
  }
};
</script>
