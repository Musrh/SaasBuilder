import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(), // 🔥 OBLIGATOIRE SUR GITHUB PAGES
  routes: [
    {
      path: "/auth",
      name: "AuthForm",
      component: () => import("../views/AuthForm.vue"),
    },
    {
      path: "/dashboard",
      name: "Dashboard",
      component: () => import("../views/Dashboard.vue"),
    },
    {
      path: "/builder",
      name: "Builder",
      component: () => import("../views/Builder.vue"),
    },
  ],
});

export default router;
