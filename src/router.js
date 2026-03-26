import { createRouter, createWebHashHistory } from 'vue-router';

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
  history: createWebHashHistory(), // 🔥 FIX CRITIQUE GITHUB PAGES
  routes,
});

export default router;
