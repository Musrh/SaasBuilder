import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  // ── Domaine personnalisé mronlinestores.com ────────────────
  // Avec un domaine custom, la base est "/" (pas "/SaasBuilder/")
  // Sans domaine custom (musrh.github.io/SaasBuilder), base = "/SaasBuilder/"
  base: '/',
})
