<!-- SaaasGenerator/src/views/NotFound.vue -->
<template>
  <div class="nf-root">
    <div class="nf-box">
      <div class="nf-code">404</div>
      <h1>Page introuvable</h1>
      <p>L'adresse que vous cherchez n'existe pas ou a été déplacée.</p>
      <button @click="$router.push('/')">← Retour à l'accueil</button>
    </div>
  </div>
</template>
<style scoped>
.nf-root{min-height:100vh;background:#0f0f11;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif}
.nf-box{text-align:center;padding:40px 20px}
.nf-code{font-size:96px;font-weight:900;color:#2a2a2f;line-height:1;margin-bottom:16px}
h1{font-size:24px;color:#f0f0f0;margin-bottom:10px}
p{font-size:15px;color:#8a8a9a;margin-bottom:28px}
button{background:#6c63ff;color:white;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
button:hover{background:#5b52ee}
</style>
