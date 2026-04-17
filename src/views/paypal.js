
// ============================================================
//  paypal.js — Configuration du serveur de paiement PayPal
//  Modifiez les valeurs ci-dessous avec vos propres données
// ============================================================

export const paypalConfig = {

  // ----------------------------------------------------------
  //  Client ID de votre application PayPal
  //  Trouvez-le sur : https://developer.paypal.com/dashboard/
  //  Apps & Credentials → Votre app → Client ID
  // ----------------------------------------------------------
  clientId: "VOTRE_CLIENT_ID_PAYPAL_ICI",

  // ----------------------------------------------------------
  //  Mode : "sandbox" (test) ou "live" (production)
  // ----------------------------------------------------------
  mode: "sandbox",

  // ----------------------------------------------------------
  //  Devise utilisée pour les paiements (ISO 4217)
  //  Exemples : "EUR", "USD", "GBP"
  // ----------------------------------------------------------
  currency: "EUR",

  // ----------------------------------------------------------
  //  Langue du bouton PayPal
  //  Exemples : "fr_FR", "en_US", "ar_MA"
  // ----------------------------------------------------------
  locale: "fr_FR",

  // ----------------------------------------------------------
  //  URL de votre backend pour créer la commande PayPal
  //  Exemple : "https://api.votresite.com/paypal/create-order"
  // ----------------------------------------------------------
  createOrderUrl: "https://votre-backend.com/paypal/create-order",

  // ----------------------------------------------------------
  //  URL de votre backend pour capturer le paiement
  //  Exemple : "https://api.votresite.com/paypal/capture-order"
  // ----------------------------------------------------------
  captureOrderUrl: "https://votre-backend.com/paypal/capture-order",

  // ----------------------------------------------------------
  //  URL de redirection après paiement réussi
  // ----------------------------------------------------------
  successUrl: "https://votresite.com/merci",

  // ----------------------------------------------------------
  //  Nom affiché dans la fenêtre PayPal
  // ----------------------------------------------------------
  brandName: "Mon Boutique",

}

// ============================================================
//  Fonction utilitaire : charger le SDK PayPal dynamiquement
// ============================================================
export const loadPaypalSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal)
    const script = document.createElement("script")
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=${paypalConfig.currency}&locale=${paypalConfig.locale}`
    script.onload = () => resolve(window.paypal)
    script.onerror = reject
    document.head.appendChild(script)
  })
}
