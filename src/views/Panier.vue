<template>
  <div class="p-4 max-w-3xl mx-auto">

    <h1 class="text-2xl font-bold mb-4">
      {{ titles.cart }}
    </h1>

    <!-- USER NOT LOGGED -->
    <div v-if="!user">
      <p class="text-red-600 font-semibold">
        {{ titles.mustLogin }}
      </p>
      <button
        @click="$router.push('/login')"
        class="bg-black text-white px-4 py-2 mt-3 rounded"
      >
        {{ titles.login }}
      </button>
    </div>

    <!-- ================= PLANS SAAS ================= -->
    <div v-else class="mb-6">

      <h2 class="font-bold mb-2">Plans SaaS</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- PRO -->
        <div class="border p-4 rounded-xl">
          <h3 class="font-bold">Pro</h3>
          <p class="text-gray-600">Fonctionnalités avancées</p>
          <p class="font-bold mt-2">19.99 €</p>

          <button
            @click="buyPlan('pro', 19.99)"
            class="bg-blue-600 text-white px-4 py-2 mt-3 rounded w-full"
          >
            Acheter Pro
          </button>
        </div>

        <!-- PREMIUM -->
        <div class="border p-4 rounded-xl">
          <h3 class="font-bold">Premium</h3>
          <p class="text-gray-600">SaaS complet + backend client</p>
          <p class="font-bold mt-2">49.99 €</p>

          <button
            @click="buyPlan('premium', 49.99)"
            class="bg-purple-600 text-white px-4 py-2 mt-3 rounded w-full"
          >
            Acheter Premium
          </button>
        </div>

      </div>
    </div>

    <!-- ================= CART ITEMS ================= -->
    <div v-if="cart.length">

      <h2 class="font-bold mb-2">Produits</h2>

      <ul class="mb-6">
        <li
          v-for="item in cart"
          :key="item.id"
          class="flex justify-between"
        >
          <span>{{ item.nom }} x {{ item.quantity }}</span>
          <span>{{ (item.prix * item.quantity).toFixed(2) }} €</span>
        </li>
      </ul>

      <!-- ADDRESS -->
      <h2 class="font-semibold mb-2">{{ titles.address }}</h2>

      <input v-model="adresse1" :placeholder="titles.address1" class="input" />
      <input v-model="adresse2" :placeholder="titles.address2" class="input" />
      <input v-model="codePostal" :placeholder="titles.postalCode" class="input" />
      <input v-model="ville" :placeholder="titles.city" class="input" />
      <input v-model="pays" :placeholder="titles.country" class="input" />

      <!-- PAY BUTTONS -->
      <div class="flex gap-4 mt-4">

        <button
          @click="checkoutStripe"
          class="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Stripe
        </button>

        <button
          @click="checkoutPaypal"
          class="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          PayPal
        </button>

      </div>
    </div>

    <p v-else>{{ titles.cartEmpty }}</p>

  </div>
</template>

<script>
import { mapState } from "vuex";
import axios from "axios";

export default {
  data() {
    return {
      adresse1: "",
      adresse2: "",
      codePostal: "",
      ville: "",
      pays: "",
    };
  },

  computed: {
    ...mapState(["cart", "user"]),

    currentLang() {
      return this.$store.getters["language/currentLanguage"] || "fr";
    },

    titles() {
      return {
        fr: {
          cart: "Votre Panier",
          mustLogin: "Vous devez être connecté pour payer.",
          login: "Se connecter",
          address: "Adresse",
          address1: "Adresse 1",
          address2: "Adresse 2",
          postalCode: "Code postal",
          city: "Ville",
          country: "Pays",
          cartEmpty: "Votre panier est vide."
        },
        en: {
          cart: "Your Cart",
          mustLogin: "You must be logged in.",
          login: "Login",
          address: "Address",
          address1: "Address 1",
          address2: "Address 2",
          postalCode: "Postal Code",
          city: "City",
          country: "Country",
          cartEmpty: "Cart is empty."
        }
      }[this.currentLang];
    }
  },

  methods: {

    getAdresse() {
      return `${this.adresse1} ${this.adresse2}, ${this.codePostal} ${this.ville}, ${this.pays}`;
    },

    // ================= SAAS PLAN BUY =================
    async buyPlan(plan, price) {
      try {
        const response = await axios.post(
          "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
          {
            items: [
              {
                nom: "Plan " + plan,
                prix: price,
                quantity: 1
              }
            ],
            email: this.user.email,
            adresseLivraison: this.getAdresse(),
            plan: plan,
            clientId: this.user.uid
          }
        );

        window.location.href = response.data.url;

      } catch (err) {
        console.error(err);
        alert("Erreur paiement plan");
      }
    },

    // ================= STRIPE CART =================
    async checkoutStripe() {
      try {
        const response = await axios.post(
          "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
          {
            items: this.cart,
            email: this.user.email,
            adresseLivraison: this.getAdresse(),
            clientId: this.user.uid
          }
        );

        window.location.href = response.data.url;

      } catch (err) {
        console.error("Stripe error:", err);
      }
    },

    // ================= PAYPAL =================
    async checkoutPaypal() {
      try {
        const order = await axios.post(
          "https://paypalbackend-production.up.railway.app/create-paypal-order",
          {
            items: this.cart,
            email: this.user.email,
            adresseLivraison: this.getAdresse()
          }
        );

        window.location.href = order.data.approveUrl || order.data.url;

      } catch (err) {
        console.error("PayPal error:", err);
      }
    }
  }
};
</script>

<style scoped>
.input {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
