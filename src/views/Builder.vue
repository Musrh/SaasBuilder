import { ref, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const state = ref({
  sections: []
});

const userId = ref(null);

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return;

    userId.value = u.uid;

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      state.value.sections = snap.data().sections || [];
    }
  });
});

const addSection = async (type) => {
  const newSection = {
    id: crypto.randomUUID(),
    type,
    props: { title: "Bienvenue" }
  };

  state.value.sections.push(newSection);

  await updateDoc(doc(db, "users", userId.value), {
    sections: state.value.sections
  });
};
