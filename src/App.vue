<template>
  <router-view />
  <div>
  <footer class="py-6 text-center border-t mt-10">
    <router-link to="/privacy-policy" class="text-gray-500 text-sm hover:underline">
      Privacy Policy
    </router-link>
  
<router-link to="/remboursement" class="text-gray-500 text-sm hover:underline">
      Remboursement 
    </router-link>  
<router-link to="/confidentialite" class="text-gray-500 text-sm hover:underline">
      Confidentialité
    </router-link>
  
 <router-link to="/mentions" class="text-gray-500 text-sm hover:underline">
      Mentions légales 
    </router-link> 
  <router-link to="/conditions" class="text-gray-500 text-sm hover:underline">
      Conditions
    </router-link>
  
  </footer>
    </div>
</template>

<script>
export default {
  name: "App",
};
</script>
