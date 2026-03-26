import { createRouter, createWebHistory } from 'vue-router';
import PlanSelection from './views/PlanSelection.vue';
import AuthForm from './views/AuthForm.vue';
import Dashboard from './views/Dashboard.vue';
import Builder from './views/Builder.vue';

const routes = [
  { path: '/', redirect: '/plan' },
  { path: '/plan', name: 'Plan', component: PlanSelection },
  { path: '/register', name: 'AuthForm', component: AuthForm },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/builder', name: 'Builder', component: Builder },
];

const router = createRouter({
  history: createWebHistory('/SaasBuilder/'), // <-- ton base path GitHub Pages
  routes
});

export default router;
