// ============================================================
//  stripe.js — Configuration Stripe (Frontend - Checkout)
// ============================================================

export const stripeConfig = {
  publishableKey:
    "pk_test_51T20K6AwgHqDmd0F8LcnioXKpuzSyQv7aPkDhhmtPEH9BA98KOzf6F43K2O4A5WjhHHVlguyp48W0bmqMbwSvcDm00YINXIME3",

  // ✅ Backend Railway (Checkout Session)
  backendUrl:
    "https://backend-master-production-cf50.up.railway.app/create-stripe-session",

  currency: "eur",
  storeName: "RmStore",

  successUrl:
    "https://musrh.github.io/SaaasGenerator/#/site/rmstore/merci",

  cancelUrl:
    "https://musrh.github.io/SaaasGenerator/#/site/rmstore/panier",

  mode: "test",
};

// ============================================================
// 🚀 CREATE STRIPE CHECKOUT SESSION
// ============================================================

export const createCheckoutSession = async ({
  items,
  email,
  adresseLivraison,
  clientId,
  plan = "basic",
}) => {
  try {
    console.log("🚀 Backend utilisé :", stripeConfig.backendUrl);

    // ================= VALIDATION MINIMALE =================
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Panier vide");
    }

    // ================= FORMAT BACKEND SAFE =================
    const formattedItems = items.map((item) => ({
      nom: item.nom || item.title || "Produit",
      prix: Number(item.prix || item.price || 0),
      quantity: Number(item.quantity || item.qty || 1),
    }));

    const payload = {
      items: formattedItems,
      email: email || "",
      adresseLivraison: adresseLivraison || "",
      clientId: clientId || "guest",
      plan,
    };

    console.log("📦 Payload envoyé backend =", payload);

    // ================= CALL BACKEND =================
    const response = await fetch(stripeConfig.backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // ================= ERROR HANDLING =================
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Backend error:", errorText);
      throw new Error("Erreur création session Stripe");
    }

    const data = await response.json();

    console.log("✅ Response backend =", data);

    if (!data.url) {
      throw new Error("URL Stripe manquante dans la réponse backend");
    }

    // ================= REDIRECT STRIPE =================
    window.location.href = data.url;
  } catch (error) {
    console.error("❌ Erreur paiement :", error.message);
    alert(error.message || "Erreur lors du paiement");
  }
};

// ============================================================
// 🚀 LOAD STRIPE SDK (OPTIONNEL)
// ============================================================

export const loadStripeSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      return resolve(window.Stripe(stripeConfig.publishableKey));
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";

    script.onload = () => {
      resolve(window.Stripe(stripeConfig.publishableKey));
    };

    script.onerror = () => {
      reject(new Error("Erreur chargement Stripe SDK"));
    };

    document.head.appendChild(script);
  });
};
