import { createRouter, createWebHashHistory } from "vue-router";

import PlanSelection from "./views/PlanSelection.vue";
import AuthForm from "./views/AuthForm.vue";
import Dashboard from "./views/Dashboard.vue";
import Builder from "./views/Builder.vue";

const routes = [

  // 🧭 FLOW SAAS
  { path: "/", name: "Plan", component: PlanSelection },
  { path: "/auth", name: "Auth", component: AuthForm },
  { path: "/dashboard", name: "Dashboard", component: Dashboard, meta: { requiresAuth: true } },
  { path: "/builder", name: "Builder", component: Builder, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHashHistory(), // 🔥 GitHub Pages FIX
  routes,
});

// 🔐 SIMPLE AUTH GUARD (Firebase)
router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem("user")); // simple fallback

  if (to.meta.requiresAuth && !user) {
    next("/auth");
  } else {
    next();
  }
});

export default router; on
