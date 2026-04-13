<template>
  <router-view />
  <div>
  <footer class="py-6 text-center border-t mt-10">
    <router-link to="/privacy-policy" class="text-gray-500 text-sm hover:underline">
      Privacy Policy
    </router-link>
  </footer>
    </div>
</template>

<script>
export default {
  name: "App",
};
</script>
