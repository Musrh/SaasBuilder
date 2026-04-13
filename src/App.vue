<template>
  <router-view />
  <footer class="py-6 text-center border-t mt-10">
    <router-link to="/privacy-policy" class="text-gray-500 text-sm hover:underline">
      Privacy Policy
    </router-link>
  </footer>
</template>

<script>
export default {
  name: "App",
};
</script>
