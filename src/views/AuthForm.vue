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
        plan: localStorage.getItem("planChoisi") || "free",
        createdAt: new Date(),
        sections: []
      });
    }

    router.push("/dashboard");

  } catch (e) {
    alert(e.message);
  }
};
</script>
