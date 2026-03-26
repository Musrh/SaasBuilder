import { createRouter, createWebHashHistory } from "vue-router";

import PlanSelection from "./views/PlanSelection.vue";
import AuthForm from "./views/AuthForm.vue";
import Dashboard from "./views/Dashboard.vue";
import Builder from "./views/Builder.vue";

const routes = [
  { path: "/", name: "Plan", component: PlanSelection },
  { path: "/auth", name: "Auth", component: AuthForm },

  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },

  {
    path: "/builder",
    name: "Builder",
    component: Builder,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHashHistory("/SaasBuilder/"),
  routes,
});

export default router;
