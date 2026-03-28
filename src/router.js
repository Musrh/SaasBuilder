import { createRouter, createWebHashHistory } from "vue-router";

import PlanSelection from "./views/PlanSelection.vue";
import AuthForm from "./views/AuthForm.vue";
import Dashboard from "./views/Dashboard.vue";
import Builder from "./views/Builder.vue";

const routes = [
  { path: "/", component: PlanSelection },
  { path: "/auth", component: AuthForm },
  { path: "/dashboard", component: Dashboard },
  
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
}
  
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
