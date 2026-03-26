
<template>
  <div class="p-6">

    <h1 class="text-2xl font-bold mb-4">
      Builder SaaS
    </h1>

    <div v-if="!userId">
      Loading user...
    </div>

    <div v-else>

      <button
        @click="addHeader"
        class="bg-blue-500 text-white px-4 py-2 rounded"
      >
        + Ajouter Header
      </button>

      <button
        @click="save"
        class="ml-2 bg-green-500 text-white px-4 py-2 rounded"
      >
        Save
      </button>

      <hr class="my-4" />

      <div v-for="section in sections" :key="section.id" class="p-3 border mb-2">
        <strong>{{ section.type }}</strong>

        <div v-if="section.type === 'Header'">
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

const userId = ref(null);
const sections = ref([]);

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return;

    userId.value = u.uid;

    const snap = await getDoc(doc(db, "users", u.uid));

    if (snap.exists()) {
      sections.value = snap.data().sections || [];
    }
  });
});

const addHeader = () => {
  sections.value.push({
    id: crypto.randomUUID(),
    type: "Header",
    props: {
      title: "Bienvenue"
    }
  });
};

const save = async () => {
  if (!userId.value) return;

  await updateDoc(doc(db, "users", userId.value), {
    sections: sections.value
  });

  alert("Saved !");
};
</script>
