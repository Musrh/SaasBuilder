<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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

      const plan = parseInt(localStorage.getItem("planChoisi")) || 1;
      const expiry = localStorage.getItem("planExpiry");

      // 🔥 STRUCTURE UNIQUE CLEAN
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        plan: plan,

        createdAt: serverTimestamp(),
        expiresAt: expiry ? new Date(parseInt(expiry)) : null,

        sections: [
          {
            id: crypto.randomUUID(),
            type: "Header",
            props: {
              title: "Bienvenue 👋"
            }
          }
        ]
      });
    }

    router.push({ name: "Dashboard" });

  } catch (err) {
    alert(err.message);
  }
};
</script>
