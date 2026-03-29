<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const router = useRouter();

const user = ref(null);
const expiry = ref(null);

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return;

    const snap = await getDoc(doc(db, "users", u.uid));
    user.value = snap.data();
    expiry.value = user.value?.expiry;
  });
});

const expiryDate = computed(() => {
  if (!expiry.value) return null;
  return new Date(expiry.value).toLocaleDateString();
});

const daysLeft = computed(() => {
  if (!expiry.value) return null;
  return Math.ceil((expiry.value - Date.now()) / (1000 * 60 * 60 * 24));
});

const goBuilder = () => {
  if (!user.value) return;

  switch (user.value.plan) {
    case "free":
      router.push("/builder1");
      break;
    case "pro":
      router.push("/builder");
      break;
    case "premium":
      router.push("/builder3");
      break;
  }
};

const upgrade = () => {
  router.push("/#"); // ou PlanSection
};

const logout = async () => {
  await signOut(auth);
  router.push("/auth");
};
</script>
