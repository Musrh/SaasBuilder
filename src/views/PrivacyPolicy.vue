
<template>
  <div class="legal-page">

    <div class="legal-header">
      <h1>Conditions de Vente & Politique de Confidentialité</h1>
      <p>Dernière mise à jour : {{ today }}</p>
    </div>

    <div class="legal-container">

      <section>
        <h2>Garanties et Retours</h2>
        <p><strong>Garantie légale :</strong><br>
          1 ans en Europe, 1 an aux États-Unis et au Royaume-Uni pour défauts matériels.
        </p>
        <p><strong>Droit de rétractation :</strong><br>
          Retour possible sous 14 jours pour tous les pays.
        </p>
        <p><strong>Produits défectueux :</strong><br>
          Remboursement ou remplacement gratuit partout dans le monde.
        </p>
      </section>

      <section>
        <h2>Paiement et Sécurité</h2>
        <p>Paiements sécurisés via Stripe et PayPal.</p>
        <p>Aucune information bancaire n'est stockée sur nos serveurs.</p>
        <p>Monnaie : paiement en € ou $ selon pays.</p>
      </section>

      <section>
        <h2>Livraison</h2>
        <p>Expédition internationale sous 7 à 30 jours.</p>
        <p>Numéro de suivi envoyé par email.</p>
        <p>Taxes et douanes à la charge du client.</p>
      </section>

      <section>
        <h2>Protection des données</h2>
        <p>Les données sont utilisées uniquement pour :</p>
        <ul>
          <li>Gestion des commandes</li>
          <li>Support client</li>
          <li>Marketing</li>
        </ul>
        <p>Conformité RGPD, CCPA et lois locales.</p>
        <p>Vous pouvez :</p>
        <ul>
          <li>Accéder à vos données</li>
          <li>Les modifier</li>
          <li>Les supprimer</li>
        </ul>
        <p>Utilisation de cookies pour améliorer l'expérience utilisateur.</p>
      </section>

      <section>
        <h2>Responsabilité</h2>
        <p>
          Nous ne sommes pas responsables d'une mauvaise utilisation des produits.
          Le client doit vérifier la conformité avec la législation de son pays.
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
