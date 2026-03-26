<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const router = useRouter();

const user = ref({
  email: "",
  plan: 1,
  expiresAt: null,
  sections: []
});

const loading = ref(true);

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return router.push({ name: "AuthForm" });

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      user.value = {
        email: "",
        plan: 1,
        expiresAt: null,
        sections: [],
        ...snap.data()
      };
    }

    loading.value = false;
  });
});

const planMap = {
  1: "Offert",
  2: "Pro",
  3: "Premium"
};

const planName = computed(() => planMap[user.value.plan] || "Offert");

const planColor = computed(() => {
  return {
    1: "bg-gray-500",
    2: "bg-blue-500",
    3: "bg-purple-500",
  }[user.value.plan] || "bg-gray-500";
});

const formattedDate = computed(() => {
  if (!user.value.expiresAt) return "—";
  return new Date(user.value.expiresAt).toLocaleDateString();
});

const isExpired = computed(() => {
  if (!user.value.expiresAt) return false;
  return new Date() > new Date(user.value.expiresAt);
});

const goBuilder = () => {
  router.push({ name: "Builder" });
};

const logout = async () => {
  await signOut(auth);
  router.push({ name: "AuthForm" });
};
</script>
