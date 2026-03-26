import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const router = useRouter();

const user = ref(null);
const loading = ref(true);

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      router.push("/auth");
      return;
    }

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      user.value = snap.data();
    }

    loading.value = false;
  });
});

const logout = async () => {
  await signOut(auth);
  router.push("/auth");
};
