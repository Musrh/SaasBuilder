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

      await setDoc(doc(db, "users", user.uid), {
        email: email.value,
        plan: "free",
        createdAt: serverTimestamp(),
        expiresAt: null,
        sections: []
      });
    }

    router.push("/dashboard");

  } catch (err) {
    alert(err.message);
  }
};
</script>
