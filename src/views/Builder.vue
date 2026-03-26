<template>
  <div class="min-h-screen bg-gray-100 flex flex-col md:flex-row">

    <!-- 🔹 Sidebar -->
    <div class="w-full md:w-1/4 bg-white p-4 shadow-md">
      <h2 class="text-xl font-bold mb-4">Sections</h2>

      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec.type)"
        class="w-full mb-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        + {{ sec.name }}
      </button>
    </div>

    <!-- 🔹 Preview -->
    <div class="flex-1 p-6">
      <h2 class="text-xl font-bold mb-4">Aperçu du site</h2>

      <div class="bg-white rounded shadow p-4 min-h-[400px]">

        <div v-if="sections.length === 0" class="text-gray-400 text-center py-10">
          Aucune section pour le moment
        </div>

        <component
          v-for="(sec, index) in sections"
          :key="sec.id"
          :is="getComponent(sec.type)"
          :data="sec.props"
        />

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/* 🔹 Sections UI (simples pour commencer) */
const Logo = {
  props: ["data"],
  template: `<div class="p-4 bg-blue-100 text-center font-bold">LOGO</div>`,
};

const Menu = {
  props: ["data"],
  template: `<div class="p-4 bg-gray-800 text-white text-center">Menu | Accueil | Contact</div>`,
};

const Header = {
  props: ["data"],
  template: `<div class="p-8 bg-gray-200 text-center">
               <h1 class="text-2xl font-bold">Bienvenue</h1>
             </div>`,
};

/* 🔹 Mapping */
const componentMap = {
  Logo,
  Menu,
  Header,
};

/* 🔹 Sections disponibles */
const availableSections = [
  { name: "Logo", type: "Logo" },
  { name: "Menu", type: "Menu" },
  { name: "Header", type: "Header" },
];

/* 🔹 State */
const sections = ref([]);
let userId = null;

/* 🔹 Charger depuis Firestore */
onMounted(async () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    userId = user.uid;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      sections.value = snap.data().project?.sections || [];
    }
  });
});

/* 🔹 Ajouter section */
const addSection = async (type) => {
  const newSection = {
    id: Date.now(),
    type,
    props: {},
  };

  sections.value.push(newSection);

  await saveSections();
};

/* 🔹 Sauvegarde Firestore */
const saveSections = async () => {
  if (!userId) return;

  await updateDoc(doc(db, "users", userId), {
    "project.sections": sections.value,
  });
};

/* 🔹 Mapper component */
const getComponent = (type) => {
  return componentMap[type];
};
</script>
