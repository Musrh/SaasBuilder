import { createRouter, createWebHashHistory } from "vue-router";

import PlanSelection from "./views/PlanSelection.vue";
import AuthForm from "./views/AuthForm.vue";
import Dashboard from "./views/Dashboard.vue";
import Checkout from "./views/Checkout.vue";
import PrivacyPolicy from "./views/PrivacyPolicy.vue";

const routes = [
  // ── APP SAAS ─────────────────────────────
  { path: "/", component: PlanSelection },
  { path: "/auth", component: AuthForm },
  { path: "/dashboard", component: Dashboard },

  { path: "/panier", component: () => import("./views/Panier.vue") },
  { path: "/checkout", name: "Checkout", component: Checkout },

  { path: "/success", component: () => import("./views/Success.vue") },
  { path: "/cancel", component: () => import("./views/Cancel.vue") },

  { path: "/orders", component: () => import("./views/Orders.vue") },

  {
    path: "/privacy-policy",
    name: "PrivacyPolicy",
    component: PrivacyPolicy
  },

  {
    path: "/connection",
    name: "Connection",
    component: () => import("./views/Connexion.vue")
  },

  // ── BUILDER (fusionné ici) ─────────────────

  // 👉 Page principale builder
  {
    path: "/saasgenerator",
    name: "Saasgenerator",
    component: () => import("./views/Saasgenerator.vue") // ancien Home du builder
  },

  // 👉 Cart
  {
    path: "/cart",
    name: "Cart",
    component: () => import("./views/Cart.vue")
  },

  // 👉 Site public
  {
    path: "/site/:uid",
    name: "SiteViewer",
    component: () => import("./views/SiteViewer.vue"),
    props: true
  },

  // 👉 Auth client store
  {
    path: "/store-auth",
    name: "StoreAuth",
    component: () => import("./views/Storeauth.vue")
  },

  // 👉 Paiement client store
  {
    path: "/payment-success",
    component: () => import("./views/Paymentsuccess.vue")
  },
  {
    path: "/payment-cancel",
    component: () => import("./views/Paymentcancel.vue")
  },

  // ── 404 ─────────────────────────────────
  {
    path: "/:pathMatch(.*)*",
    component: () => import("./views/NotFound.vue")
  }
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
