<template>
  <div class="p-6">

    <h1 class="text-2xl font-bold mb-4">
      {{ isLogin ? "Connexion" : "Inscription" }}
    </h1>

    <input v-model="email" placeholder="Email" class="border p-2 mb-2 w-full" />
    <input v-model="password" type="password" placeholder="Password" class="border p-2 mb-2 w-full" />

    <button @click="handleSubmit" class="bg-blue-500 text-white px-4 py-2">
      OK
    </button>

    <br /><br />

    <button @click="isLogin = !isLogin">
      Switch mode
    </button>

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
