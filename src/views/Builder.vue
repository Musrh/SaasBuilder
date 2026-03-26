<template>
  <div class="min-h-screen bg-gray-100 flex">

    <!-- 🔹 Sidebar -->
    <div class="w-1/4 bg-white p-4 shadow">
      <h2 class="font-bold mb-4">Sections</h2>

      <button
        v-for="sec in availableSections"
        :key="sec.type"
        @click="addSection(sec.type)"
        class="w-full mb-2 p-2 bg-blue-500 text-white rounded"
      >
        + {{ sec.name }}
      </button>
    </div>

    <!-- 🔹 Preview -->
    <div class="flex-1 p-4">
      <h2 class="font-bold mb-4">Aperçu</h2>

      <div class="bg-white p-4 rounded shadow">

        <div
          v-for="(sec, index) in sections"
          :key="sec.id"
          @click="selectSection(index)"
          class="mb-2 border cursor-pointer"
          :class="selectedIndex === index ? 'border-blue-500' : 'border-transparent'"
        >
          <component
            :is="getComponent(sec.type)"
            :data="sec.props"
          />
        </div>

      </div>
    </div>

    <!-- 🔹 Editor -->
    <div class="w-1/4 bg-white p-4 shadow">
      <h2 class="font-bold mb-4">Édition</h2>

      <div v-if="selectedSection">

        <label class="block mb-2">Titre</label>
        <input
          v-model="selectedSection.props.title"
          @input="updateSection"
          class="w-full border p-2 mb-4"
        />

        <label class="block mb-2">Sous-titre</label>
        <input
          v-model="selectedSection.props.subtitle"
          @input="updateSection"
          class="w-full border p-2"
        />

      </div>

      <div v-else class="text-gray-400">
        Sélectionne une section
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/* 🔹 Sections */
const Header = {
  props: ["data"],
  template: `
    <div class="p-6 bg-gray-200 text-center">
      <h1 class="text-2xl font-bold">{{ data.title || "Titre" }}</h1>
      <p>{{ data.subtitle || "Sous-titre" }}</p>
    </div>
  `,
};

const Logo = {
  template: `<div class="p-4 bg-blue-100 text-center">LOGO</div>`,
};

const Menu = {
  template: `<div class="p-4 bg-gray-800 text-white text-center">Menu</div>`,
};

/* 🔹 Mapping */
const componentMap = { Header, Logo, Menu };

/* 🔹 Sections disponibles */
const availableSections = [
  { name: "Header", type: "Header" },
  { name: "Logo", type: "Logo" },
  { name: "Menu", type: "Menu" },
];

/* 🔹 State */
const sections = ref([]);
const selectedIndex = ref(null);
let userId = null;

/* 🔹 Selected section */
const selectedSection = computed(() => {
  return sections.value[selectedIndex.value];
});

/* 🔹 Load Firestore */
onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    userId = user.uid;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
      sections.value = snap.data().project?.sections || [];
    }
  });
});

/* 🔹 Add section */
const addSection = async (type) => {
  sections.value.push({
    id: Date.now(),
    type,
    props: {
      title: "",
      subtitle: "",
    },
  });

  await save();
};

/* 🔹 Select */
const selectSection = (index) => {
  selectedIndex.value = index;
};

/* 🔹 Update */
const updateSection = async () => {
  await save();
};

/* 🔹 Save Firestore */
const save = async () => {
  if (!userId) return;

  await updateDoc(doc(db, "users", userId), {
    "project.sections": sections.value,
  });
};

/* 🔹 Mapper */
const getComponent = (type) => componentMap[type];
</script>
