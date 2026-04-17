
<template>
  <div class="legal-page">
    
    <!-- HEADER -->
    <div class="legal-header">
      <h1>Conditions Générales</h1>
      <p>Dernière mise à jour : {{ today }}</p>
    </div>

    <!-- CONTENT -->
    <div class="legal-container">

      <section>
        <h2>1. Conditions du compte</h2>
        <p>
          En créant un compte sur notre plateforme, vous acceptez de fournir des
          informations exactes, complètes et à jour.
        </p>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants ainsi
          que de toute activité effectuée depuis votre compte.
        </p>
      </section>

      <section>
        <h2>2. Activation du compte</h2>
        <p>
          L’activation de votre compte est immédiate après confirmation du paiement.
        </p>
        <p>
          Dans certains cas, une vérification supplémentaire peut être effectuée
          pour des raisons de sécurité.
        </p>
      </section>

      <section>
        <h2>3. Utilisation du service</h2>
        <p>
          Vous vous engagez à utiliser la plateforme dans le respect des lois en vigueur.
        </p>
        <p>
          Toute utilisation frauduleuse, abusive ou illégale entraînera la suspension
          immédiate du compte.
        </p>
      </section>

      <section>
        <h2>4. Vos responsabilités</h2>
        <p>
          Vous êtes entièrement responsable du contenu publié sur votre site
          (textes, images, produits, services, etc.).
        </p>
        <p>
          Nous déclinons toute responsabilité concernant les contenus ou les
          transactions réalisées via votre site.
        </p>
      </section>

      <section>
        <h2>5. Paiement, frais et taxes</h2>
        <p>
          Les services proposés sont payants selon les tarifs affichés.
        </p>
        <p>
          Vous acceptez de régler tous les frais associés à votre abonnement.
        </p>
        <p>
          Les paiements sont sécurisés via Stripe.
        </p>
      </section>

      <section>
        <h2>6. Confidentialité</h2>
        <p>
          Nous protégeons vos données personnelles et ne les revendons jamais.
        </p>
        <p>
          Toutes les transactions sont sécurisées afin de garantir la confidentialité
          de vos informations.
        </p>
      </section>

      <section>
        <h2>7. Modification des conditions</h2>
        <p>
          Nous nous réservons le droit de modifier ces conditions à tout moment.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Pour toute question, contactez notre support via la plateforme.
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
</style>
