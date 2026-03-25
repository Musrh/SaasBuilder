import { createRouter, createWebHashHistory } from "vue-router";
import PlanSelection from "./views/PlanSelection.vue";
import Register from "./views/Register.vue";
import Login from "./views/Login.vue";
import Dashboard from "./views/Dashboard.vue";

const routes = [
  { path: "/", component: PlanSelection },
  { path: "/register", component: Register },
  { path: "/login", component: Login },
  { path: "/dashboard", component: Dashboard },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
