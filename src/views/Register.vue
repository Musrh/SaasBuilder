<template>
  <div class="container">
    <h1>Inscription</h1>
    <form @submit.prevent="registerUser">
      <input v-model="username" placeholder="Nom d'utilisateur" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Mot de passe" required />
      <button type="submit">S'inscrire</button>
    </form>
  </div>
</template>

<script>
import { auth, db } from "../firebase.js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default {
  name: "Register",
  data() {
    return {
      username: "",
      email: "",
      password: "",
    };
  },
  methods: {
    async registerUser() {
      try {
        const plan = localStorage.getItem("selectedPlan") || "free";
        const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          username: this.username,
          email: this.email,
          plan: plan,
          createdAt: serverTimestamp(),
          project: { sections: [] },
        });

        alert("Inscription réussie !");
        this.$router.push("/login");
      } catch (err) {
        alert(err.message);
      }
    },
  },
};
</script>
