<template>
  <div class="container">
    <h1>Connexion</h1>
    <form @submit.prevent="loginUser">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Mot de passe" required />
      <button type="submit">Se connecter</button>
    </form>
  </div>
</template>

<script>
import { auth } from "../firebase.js";
import { signInWithEmailAndPassword } from "firebase/auth";

export default {
  name: "Login",
  data() {
    return {
      email: "",
      password: "",
    };
  },
  methods: {
    async loginUser() {
      try {
        await signInWithEmailAndPassword(auth, this.email, this.password);
        alert("Connexion réussie !");
        this.$router.push("/dashboard");
      } catch (err) {
        alert(err.message);
      }
    },
  },
};
</script>
