<!-- ============================================================
  PlanSelection.vue — SaasBuilder Landing Page
============================================================ -->
<template>
  <div class="ps-root">

    <!-- ── HERO ─────────────────────────────────────────────── -->
    <section class="ps-hero">
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80"
        class="ps-hero-img" alt="hero"
      />
      <div class="ps-hero-overlay"></div>

      <!-- Bouton Se connecter — coin supérieur droit -->
      <div class="ps-login-corner">
        <p class="ps-login-hint">Déjà un compte ?</p>
        <button @click="goToLogin" class="ps-login-btn">
          🔑 Se connecter
        </button>
      </div>

      <!-- Contenu hero -->
      <div class="ps-hero-content">
        <div class="ps-hero-badge">🚀 Plateforme SaaS N°1</div>
        <h1 class="ps-hero-title">
          Créez votre boutique<br/>
          <span class="ps-hero-accent">en ligne en minutes</span>
        </h1>
        <p class="ps-hero-sub">
          Builder visuel · Paiements Stripe · Gestion des commandes
        </p>
        <p class="ps-hero-price">
          À partir de <span class="ps-price-highlight">10€ / mois</span>
        </p>
        <div class="ps-hero-actions">
          <button @click="selectPlan('pro')" class="ps-btn-cta">
            Démarrer Pro — 10€/mois ⚡
          </button>
          <button @click="scrollToPlans" class="ps-btn-secondary">
            Voir les offres ↓
          </button>
        </div>
        <!-- Indicateurs de confiance -->
        <div class="ps-trust">
          <span>🔒 Paiement sécurisé</span>
          <span>⚡ Sans engagement</span>
          <span>🛟 Support inclus</span>
        </div>
      </div>
    </section>

    <!-- ── FEATURES ──────────────────────────────────────────── -->
    <section class="ps-features">
      <div class="ps-features-grid">
        <div class="ps-feature-card">
          <span class="ps-feat-icon">🏗️</span>
          <h3>Builder visuel</h3>
          <p>Glissez-déposez vos sections. Aucun code requis.</p>
        </div>
        <div class="ps-feature-card">
          <span class="ps-feat-icon">💳</span>
          <h3>Paiements intégrés</h3>
          <p>Stripe Connect pour recevoir les paiements directement.</p>
        </div>
        <div class="ps-feature-card">
          <span class="ps-feat-icon">📦</span>
          <h3>Gestion commandes</h3>
          <p>Dashboard complet pour suivre vos ventes en temps réel.</p>
        </div>
        <div class="ps-feature-card">
          <span class="ps-feat-icon">🌍</span>
          <h3>Multi-langues</h3>
          <p>Votre store en Français, Anglais, Arabe et Espagnol.</p>
        </div>
      </div>
    </section>

    <!-- ── PLANS ─────────────────────────────────────────────── -->
    <section ref="plansSection" class="ps-plans">
      <div class="ps-plans-inner">
        <h2 class="ps-plans-title">Nos offres</h2>
        <p class="ps-plans-sub">Choisissez le plan adapté à votre activité</p>

        <div class="ps-plans-grid">

          <!-- FREE -->
          <div class="ps-plan-card">
            <div class="ps-plan-header">
              <h3 class="ps-plan-name">🆓 Gratuit</h3>
              <div class="ps-plan-price-wrap">
                <span class="ps-plan-price">0€</span>
                <span class="ps-plan-period">/mois</span>
              </div>
              <p class="ps-plan-tagline">Pour commencer sans risque</p>
            </div>
            <ul class="ps-plan-features">
              <li class="ps-feat-ok">✓ 1 page</li>
              <li class="ps-feat-ok">✓ Builder visuel</li>
              <li class="ps-feat-no">✗ Paiements clients</li>
              <li class="ps-feat-no">✗ Multi-pages</li>
              <li class="ps-feat-no">✗ Catalogue produits</li>
            </ul>
            <button @click="selectPlan('free')" class="ps-plan-btn ps-plan-btn-free">
              Commencer gratuitement
            </button>
          </div>

          <!-- PRO -->
          <div class="ps-plan-card ps-plan-card-pro">
            <div class="ps-plan-badge">⭐ Recommandé</div>
            <div class="ps-plan-header">
              <h3 class="ps-plan-name">⚡ Pro</h3>
              <div class="ps-plan-price-wrap">
                <span class="ps-plan-price ps-plan-price-pro">10€</span>
                <span class="ps-plan-period">/mois</span>
              </div>
              <p class="ps-plan-tagline">Tout ce qu'il vous faut pour vendre</p>
            </div>
            <ul class="ps-plan-features">
              <li class="ps-feat-ok">✓ Pages illimitées</li>
              <li class="ps-feat-ok">✓ Builder complet</li>
              <li class="ps-feat-ok">✓ Paiements Stripe</li>
              <li class="ps-feat-ok">✓ Catalogue produits</li>
              <li class="ps-feat-ok">✓ Support prioritaire</li>
            </ul>
            <button @click="selectPlan('pro')" class="ps-plan-btn ps-plan-btn-pro">
              Choisir Pro — 10€/mois
            </button>
            <p class="ps-plan-note">Sans engagement · Annulable à tout moment</p>
          </div>

        </div>
      </div>
    </section>

    <!-- ── FOOTER ─────────────────────────────────────────────── -->
    <footer class="ps-footer">
      <p class="ps-footer-brand">© {{ new Date().getFullYear() }} SaasBuilder</p>
      <nav class="ps-footer-links">
        <router-link to="/privacy-policy">Privacy Policy</router-link>
        <router-link to="/remboursement">Remboursement</router-link>
        <router-link to="/confidentialite">Confidentialité</router-link>
        <router-link to="/mentions">Mentions légales</router-link>
        <router-link to="/conditions">Conditions générales</router-link>
      </nav>
    </footer>

  </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router       = useRouter()
const plansSection = ref(null)

function goToLogin() {
  router.push("/auth")
}

function scrollToPlans() {
  plansSection.value?.scrollIntoView({ behavior: "smooth" })
}

function selectPlan(plan) {
  localStorage.setItem("planChoisi",   plan)
  localStorage.setItem("selectedPlan", plan)
  router.push({ path: "/auth"})
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }
.ps-root { font-family: 'DM Sans', sans-serif; color: #1a1a2e; }

/* ── HERO ──────────────────────────────────────────────────── */
.ps-hero {
  position: relative; min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  text-align: center; overflow: hidden;
}
.ps-hero-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%; object-fit: cover;
}
.ps-hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(10,10,40,.88) 0%, rgba(80,30,120,.80) 100%);
}

/* Bouton Se connecter coin droit */
.ps-login-corner {
  position: absolute; top: 20px; right: 20px; z-index: 20;
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
}
.ps-login-hint { font-size: 11px; color: rgba(255,255,255,.6); }
.ps-login-btn {
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff; padding: 8px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: .2s; backdrop-filter: blur(8px);
  font-family: 'DM Sans', sans-serif;
}
.ps-login-btn:hover { background: rgba(255,255,255,.25); }

/* Contenu hero */
.ps-hero-content {
  position: relative; z-index: 10;
  padding: 40px 24px; max-width: 680px; width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.ps-hero-badge {
  background: rgba(108,99,255,.3); border: 1px solid rgba(108,99,255,.5);
  color: #c4b5fd; font-size: 13px; font-weight: 600;
  padding: 6px 16px; border-radius: 100px;
  backdrop-filter: blur(8px);
}
.ps-hero-title {
  font-size: clamp(32px, 6vw, 60px); font-weight: 800;
  color: #fff; line-height: 1.15;
}
.ps-hero-accent {
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.ps-hero-sub {
  font-size: clamp(14px, 2vw, 18px); color: rgba(255,255,255,.75);
  font-weight: 400;
}
.ps-hero-price {
  font-size: clamp(16px, 2.5vw, 22px); color: rgba(255,255,255,.85); font-weight: 600;
}
.ps-price-highlight {
  color: #fcd34d; font-size: clamp(20px, 3vw, 28px); font-weight: 800;
}
.ps-hero-actions {
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
  margin-top: 4px;
}
.ps-btn-cta {
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  color: #fff; border: none; padding: 14px 28px;
  border-radius: 14px; font-size: 16px; font-weight: 700;
  cursor: pointer; transition: .2s; font-family: 'DM Sans', sans-serif;
  box-shadow: 0 8px 24px rgba(108,99,255,.4);
}
.ps-btn-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(108,99,255,.5); }
.ps-btn-secondary {
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.25);
  color: #fff; padding: 14px 24px; border-radius: 14px;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: .2s;
  font-family: 'DM Sans', sans-serif;
}
.ps-btn-secondary:hover { background: rgba(255,255,255,.18); }
.ps-trust {
  display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;
  font-size: 12px; color: rgba(255,255,255,.55);
}
.ps-trust span { display: flex; align-items: center; gap: 5px; }

/* ── FEATURES ──────────────────────────────────────────────── */
.ps-features {
  background: #f8f7ff; padding: clamp(40px, 6vw, 72px) 24px;
}
.ps-features-grid {
  max-width: 900px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}
.ps-feature-card {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 16px; padding: 24px 20px; text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,.05); transition: .2s;
}
.ps-feature-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(108,99,255,.1); }
.ps-feat-icon { font-size: 32px; display: block; margin-bottom: 12px; }
.ps-feature-card h3 { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
.ps-feature-card p  { font-size: 13px; color: #6b7280; line-height: 1.5; }

/* ── PLANS ─────────────────────────────────────────────────── */
.ps-plans { background: #fff; padding: clamp(48px, 7vw, 80px) 24px; }
.ps-plans-inner { max-width: 800px; margin: 0 auto; text-align: center; }
.ps-plans-title { font-size: clamp(24px, 4vw, 36px); font-weight: 800; color: #1a1a2e; margin-bottom: 10px; }
.ps-plans-sub   { font-size: 15px; color: #6b7280; margin-bottom: 40px; }
.ps-plans-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }

.ps-plan-card {
  background: #fff; border: 2px solid #e5e7eb;
  border-radius: 24px; padding: 32px 28px;
  display: flex; flex-direction: column; gap: 20px;
  position: relative; text-align: left;
  transition: .2s;
}
.ps-plan-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.08); transform: translateY(-2px); }
.ps-plan-card-pro {
  border-color: #6c63ff;
  background: linear-gradient(135deg, #f8f7ff, #fff);
  box-shadow: 0 4px 24px rgba(108,99,255,.15);
}
.ps-plan-badge {
  position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, #6c63ff, #a78bfa);
  color: #fff; font-size: 12px; font-weight: 700;
  padding: 4px 16px; border-radius: 100px; white-space: nowrap;
}
.ps-plan-name { font-size: 22px; font-weight: 800; color: #1a1a2e; margin-bottom: 8px; }
.ps-plan-price-wrap { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
.ps-plan-price     { font-size: 48px; font-weight: 800; color: #1a1a2e; }
.ps-plan-price-pro { color: #6c63ff; }
.ps-plan-period    { font-size: 16px; color: #6b7280; }
.ps-plan-tagline   { font-size: 13px; color: #6b7280; }
.ps-plan-features  { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.ps-feat-ok { font-size: 14px; color: #1a1a2e; font-weight: 500; }
.ps-feat-no { font-size: 14px; color: #d1d5db; }
.ps-plan-btn {
  width: 100%; padding: 14px; border-radius: 14px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  transition: .2s; border: none; font-family: 'DM Sans', sans-serif;
}
.ps-plan-btn-free {
  background: #f3f4f6; color: #6b7280;
}
.ps-plan-btn-free:hover { background: #e5e7eb; }
.ps-plan-btn-pro {
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  color: #fff; box-shadow: 0 4px 16px rgba(108,99,255,.35);
}
.ps-plan-btn-pro:hover { opacity: .92; transform: translateY(-1px); }
.ps-plan-note { font-size: 11px; color: #9ca3af; text-align: center; }

/* ── FOOTER ─────────────────────────────────────────────────── */
.ps-footer {
  background: #0f0f1a; color: rgba(255,255,255,.5);
  padding: 40px 24px;
  display: flex; flex-direction: column; align-items: center; gap: 20px;
}
.ps-footer-brand { font-size: 13px; color: rgba(255,255,255,.3); }
.ps-footer-links {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px;
}
.ps-footer-links a {
  font-size: 13px; color: rgba(255,255,255,.45);
  text-decoration: none; transition: .15s;
}
.ps-footer-links a:hover { color: #fff; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 520px) {
  .ps-hero-actions { flex-direction: column; align-items: center; }
  .ps-btn-cta, .ps-btn-secondary { width: 100%; max-width: 320px; }
  .ps-trust { gap: 12px; }
  .ps-plan-card { padding: 24px 18px; }
}
</style>
