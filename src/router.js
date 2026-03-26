import { createRouter, createWebHashHistory } from "vue-router";
import PlanSelection from "./views/PlanSelection.vue";
import AuthForm from "./views/AuthForm.vue";
import Dashboard from "./views/Dashboard.vue";

import Builder from "./views/Builder.vue"; 

const routes = [
  { path: "/", name: "PlanSelection", component: PlanSelection },
  { path: "/auth", name: "AuthForm", component: AuthForm },
  { path: "/dashboard", name: "Dashboard", component: Dashboard },

{ path: "/dashboard", name: "Dashboard", component: Dashboard }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
