
<template>
  <div class="legal-page">

    <div class="legal-header">
      <h1>Politique de remboursement</h1>
      <p>Dernière mise à jour : {{ today }}</p>
    </div>

    <div class="legal-container">

      <section>
        <h2>1. Conditions générales</h2>
        <p>
          Les paiements effectués sur la plateforme sont en principe non remboursables.
        </p>
      </section>

      <section>
        <h2>2. Cas de remboursement</h2>
        <p>Un remboursement peut être accordé uniquement dans les cas suivants :</p>
        <ul>
          <li>Erreur de facturation</li>
          <li>Paiement en double</li>
          <li>Problème technique empêchant l'utilisation du service</li>
        </ul>
      </section>

      <section>
        <h2>3. Demande</h2>
        <p>
          Toute demande doit être effectuée dans un délai de 7 jours après le paiement.
        </p>
      </section>

      <section>
        <h2>4. Traitement</h2>
        <p>
          Les remboursements sont effectués via le même moyen de paiement (Stripe).
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
