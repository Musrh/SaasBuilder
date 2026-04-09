import { createRouter, createWebHashHistory } from "vue-router";

import PlanSelection from "./views/PlanSelection.vue";
import AuthForm from "./views/AuthForm.vue";
import Dashboard from "./views/Dashboard.vue";

import Checkout from "./views/Checkout.vue"
const routes = [
  {
    path: "/",
    component: PlanSelection
  },
  {
    path: "/auth",
    component: AuthForm
  },
  {
    path: "/dashboard",
    component: Dashboard
  },

  {
    path: "/panier",
    component: () => import("./views/Panier.vue")
  },
  {
  path: "/checkout",
  name: "Checkout",
  component: Checkout
  },

  {
    path: "/success",
    component: () => import("./views/Success.vue")
  },

  {
    path: "/cancel",
    component: () => import("./views/Cancel.vue")
  },

  {
    path: "/builder1",
    component: () => import("./views/Builder1.vue")
  },
  {
    path: "/builder2",
    component: () => import("./views/Builder.vue")
  },
  {
    path: "/builder3",
    component: () => import("./views/Builder3.vue")
  },
  {
    path: "/orders",
    component: () => import("./views/Orders.vue")
  }

];

export default createRouter({
  history: createWebHashHistory(), // ✅ FIX IMPORTANT
  routes,
});
