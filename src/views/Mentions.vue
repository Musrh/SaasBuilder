
<template>
  <div class="legal-page">

    <div class="legal-header">
      <h1>Mentions légales</h1>
      <p>Dernière mise à jour : {{ today }}</p>
    </div>

    <div class="legal-container">

      <section>
        <h2>1. Éditeur du site</h2>
        <p>
          Le présent site est édité par :
        </p>
        <p>
          Nom : Votre entreprise<br>
          Email : contact@votresite.com<br>
          Pays : Maroc
        </p>
      </section>

      <section>
        <h2>2. Hébergement</h2>
        <p>
          Le site est hébergé par :
        </p>
        <p>
          0 / 1
        </p>
      </section>

      <section>
        <h2>3. Propriété intellectuelle</h2>
        <p>
          Tous les contenus présents sur la plateforme (textes, images, design)
          sont protégés par les lois en vigueur.
        </p>
      </section>

      <section>
        <h2>4. Responsabilité</h2>
        <p>
          L’éditeur ne peut être tenu responsable des contenus publiés par les utilisateurs.
        </p>
      </section>

      <section>
        <h2>5. Données personnelles</h2>
        <p>
          Les données personnelles sont traitées conformément à notre politique de confidentialité.
        </p>
      </section>

      <section>
        <h2>6. Paiement</h2>
        <p>
          Les paiements sont sécurisés via 2.
        </p>
      </section>

    </div>

  </div>
</template>

<script setup>
const today = new Date().toLocaleDateString("fr-FR")
</script>

<style scoped>
.legal-page { min-height:100vh;background:#f9fafb;font-family:'DM Sans' }
.legal-header { text-align:center;padding:60px;background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white }
.legal-container { max-width:800px;margin:30px auto;background:white;padding:40px;border-radius:16px }
section { margin-bottom:24px }
h2 { color:#6c63ff }
</style>
