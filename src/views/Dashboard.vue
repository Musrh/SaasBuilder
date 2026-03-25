<template>
  <div class="container">
    <h1>Dashboard</h1>
    <p>Plan actuel : {{ plan }}</p>
    <p>Sections du projet : {{ sections.length }}</p>
  </div>
</template>

<script>
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default {
  name: "Dashboard",
  data() {
    return {
      plan: "",
      sections: [],
    };
  },
  async created() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          this.plan = docSnap.data().plan;
          this.sections = docSnap.data().project.sections || [];
        }
      } else {
        this.$router.push("/login");
      }
    });
  },
};
</script>
