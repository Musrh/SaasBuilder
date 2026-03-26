<template>
  <div class="p-6">

    <h1 class="text-2xl font-bold mb-4">
      Builder
    </h1>

    <!-- Loading -->
    <div v-if="loading">
      Chargement...
    </div>

    <div v-else>

      <!-- ACTIONS -->
      <button
        @click="addSection"
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        + Ajouter Header
      </button>

      <button
        @click="saveSections"
        class="ml-2 bg-green-500 text-white px-4 py-2 rounded"
      >
        Sauvegarder
      </button>

      <!-- LISTE -->
      <div class="mt-6">

        <div
          v-for="section in sections"
          :key="section.id"
          class="border p-4 mb-2"
        >
          <strong>{{ section.type }}</strong>

          <input
            v-model="section.props.title"
            class="border p-2 w-full mt-2"
          />
        </div>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const sections = ref([]);
const loading = ref(true);
let userId = null;

// 🔥 LOAD USER DATA
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {

    if (!user) {
      alert("Non connecté");
      return;
    }

    userId = user.uid;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      sections.value = snap.data().sections || [];
    }

    loading.value = false;
  });
});

// ➕ ADD SECTION
const addSection = () => {
  sections.value.push({
    id: Date.now(),
    type: "Header",
    props: {
      title: "Titre ici"
    }
  });
};

// 💾 SAVE FIRESTORE
const saveSections = async () => {
  if (!userId) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      sections: sections.value
    });

    alert("Sauvegardé !");
  } catch (e) {
    console.error(e);
    alert("Erreur sauvegarde");
  }
};
</script>
