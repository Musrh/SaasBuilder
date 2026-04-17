<template>
  <router-view />
  
  <section>
  <footer class="py-6 text-center border-t mt-10">
    <div class="container">
    <router-link to="/privacy-policy" class="text-gray-500 text-sm hover:underline">
      Privacy Policy
    </router-link>
      </div>
 <div class="container"> 
<router-link to="/remboursement" class="text-gray-500 text-sm hover:underline">
      Remboursement 
    </router-link>  
   </div>
    <div class="container">
<router-link to="/confidentialite" class="text-gray-500 text-sm hover:underline">
      Confidentialité
    </router-link>
  </div>
    <div class="container">
 <router-link to="/mentions" class="text-gray-500 text-sm hover:underline">
      Mentions légales 
    </router-link> 
      </div>
    <div class="container">
  <router-link to="/conditions" class="text-gray-500 text-sm hover:underline">
      Conditions
    </router-link>
  </div>
  </footer>
    </section>
    
</template>

<script>
export default {
  name: "App",
};
</script>
<style>
.container {
  padding: 20px;
}
</style>
