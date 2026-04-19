import { createApp } from "vue";
import App from "./App.vue";
import router from "./router"; // Vérifie le chemin

createApp(App)
  .use(router)
  .mount("#app");
