import { createRouter, createWebHistory } from "vue-router";
import PlanSelection from "./views/PlanSelection.vue";
import Register from "./views/Register.vue";
import Login from "./views/Login.vue";
import Dashboard from "./views/Dashboard.vue";

const routes = [
  { path: "/", name: "PlanSelection", component: PlanSelection },
  { path: "/register", name: "Register", component: Register },
  { path: "/login", name: "Login", component: Login },
  { path: "/dashboard", name: "Dashboard", component: Dashboard },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
