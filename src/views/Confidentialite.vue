
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
          de votre compte : nom, email et données liées à l'utilisation du service.
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
          Les paiements sont traités via Stripe.
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
          Vous pouvez demander l'accès, la modification ou la suppression de vos données à tout moment.
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
.legal-page {
  min-height: 100vh;
  background: #f9fafb;
  font-family: 'DM Sans', sans-serif;
  padding-bottom: 60px;
}

.legal-header {
  text-align: center;
  padding: 60px 20px 30px;
  background: linear-gradient(135deg, #6c63ff, #a78bfa);
  color: white;
}

.legal-header h1 {
  font-size: 36px;
  margin-bottom: 10px;
}

.legal-container {
  max-width: 800px;
  margin: 30px auto;
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

section {
  margin-bottom: 28px;
}

h2 {
  font-size: 20px;
  color: #6c63ff;
  margin-bottom: 10px;
}

p {
  color: #374151;
  line-height: 1.6;
  margin-bottom: 8px;
}

ul {
  color: #374151;
  line-height: 1.6;
  margin-left: 20px;
  margin-bottom: 8px;
}

li {
  margin-bottom: 4px;
}
</style>
