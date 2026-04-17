
<template>
  <div class="legal-page">

    <div class="legal-header">
      <h1>Politique de Confidentialité</h1>
      <p>Dernière mise à jour : {{ today }}</p>
    </div>

    <div class="legal-container">

      <section>
        <h2>1. Données collectées</h2>
        <p>
          Nous collectons les informations nécessaires à la création et à la gestion
          de votre compte : nom, email et données liées à l’utilisation du service.
        </p>
      </section>

      <section>
        <h2>2. Utilisation des données</h2>
        <p>
          Vos données sont utilisées uniquement pour :
        </p>
        <ul>
          <li>Gérer votre compte</li>
          <li>Améliorer nos services</li>
          <li>Assurer la sécurité de la plateforme</li>
        </ul>
      </section>

      <section>
        <h2>3. Paiement sécurisé</h2>
        <p>
          Les paiements sont traités via 0.
          Nous ne stockons aucune information bancaire.
        </p>
      </section>

      <section>
        <h2>4. Protection des données</h2>
        <p>
          Nous mettons en œuvre des mesures de sécurité avancées pour protéger vos données.
        </p>
      </section>

      <section>
        <h2>5. Partage des données</h2>
        <p>
          Nous ne vendons ni ne louons vos données personnelles à des tiers.
        </p>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la modification ou la suppression de vos données à tout moment.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          Pour toute question concernant vos données, contactez notre support.
        </p>
      </section>

    </div>

  </div>
</template>

<script setup>
const today = new Date().toLocaleDateString("fr-FR")
</script>

<style scoped>
/* même style que Conditions.vue */
.legal-page { min-height:100vh;background:#f9fafb;font-family:'DM Sans',sans-serif }
.legal-header { text-align:center;padding:60px 20px;background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white }
.legal-container { max-width:800px;margin:30px auto;background:white;padding:40px;border-radius:16px }
section { margin-bottom:24px }
h2 { color:#6c63ff }
</style>
