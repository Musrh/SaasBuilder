<script setup>
import { ref } from "vue";

// ✅ chemins corrigés
import Logo from "../sections/Logo.vue";
import Menu from "../sections/Menu.vue";
import Header from "../sections/Header.vue";

const availableSections = [
  { name: "Logo", component: Logo },
  { name: "Menu", component: Menu },
  { name: "Header", component: Header },
];

const sections = ref([]);
const showSelector = ref(false);

const addSection = (section) => {
  sections.value.push(section);
  showSelector.value = false;
};
</script>
