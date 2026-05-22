<template>
  <div class="guide-root">

    <div class="guide-modal">

      <!-- Header -->
      <div class="guide-header">
        <div class="guide-header-left">
          <div class="guide-logo">🚀</div>
          <div>
            <h2 class="guide-title">Guide de démarrage</h2>
            <p class="guide-subtitle">Lancez votre store en quelques minutes</p>
          </div>
        </div>
      </div>

      <!-- Tabs plan -->
      <div class="guide-tabs">
        <button
          class="guide-tab"
          :class="{ active: plan === 'free' }"
          @click="plan = 'free'"
        >
          <span class="guide-tab-icon">🆓</span>
          <span>Plan Gratuit</span>
        </button>
        <button
          class="guide-tab"
          :class="{ active: plan === 'pro' }"
          @click="plan = 'pro'"
        >
          <span class="guide-tab-icon">⭐</span>
          <span>Plan Pro</span>
        </button>
      </div>

      <!-- ══ PLAN GRATUIT ══════════════════════════════ -->
      <div v-if="plan === 'free'" class="guide-content">

        <div class="guide-plan-badge free">🆓 Plan Gratuit — Commencez sans carte bancaire</div>

        <!-- Étapes -->
        <div class="guide-steps">

          <div v-for="(step, i) in freeSteps" :key="i" class="guide-step">
            <div class="guide-step-left">
              <div class="guide-step-num" :style="{ background: step.color }">{{ i + 1 }}</div>
              <div class="guide-step-line" v-if="i < freeSteps.length - 1"></div>
            </div>
            <div class="guide-step-body">
              <div class="guide-step-header">
                <span class="guide-step-icon">{{ step.icon }}</span>
                <h3 class="guide-step-title">{{ step.title }}</h3>
              </div>
              <p class="guide-step-desc">{{ step.desc }}</p>
              <!-- Carte Stripe test -->
              <div v-if="step.stripeTest" class="guide-stripe-test">
                <div class="guide-stripe-test-header">
                  <span>💳</span>
                  <strong>Carte de test Stripe</strong>
                  <span class="guide-badge-test">Mode TEST</span>
                </div>
                <div class="guide-stripe-fields">
                  <div class="guide-stripe-field">
                    <span class="guide-stripe-label">Numéro</span>
                    <div class="guide-stripe-val-row">
                      <code class="guide-stripe-val">4242 4242 4242 4242</code>
                      <button class="guide-copy-btn" @click="copy('4242424242424242', 'card')">
                        {{ copied === 'card' ? '✓' : '📋' }}
                      </button>
                    </div>
                  </div>
                  <div class="guide-stripe-field">
                    <span class="guide-stripe-label">Expiry</span>
                    <code class="guide-stripe-val">12/34</code>
                  </div>
                  <div class="guide-stripe-field">
                    <span class="guide-stripe-label">CVC</span>
                    <code class="guide-stripe-val">123</code>
                  </div>
                </div>
                <p class="guide-stripe-note">⚠️ Ces données sont uniquement pour tester. Aucun vrai paiement ne sera débité.</p>
              </div>
              <!-- Aperçu lien -->
              <div v-if="step.preview" class="guide-preview-hint">
                <span>👁️</span> Votre store sera accessible à : <code>mronlinestores.com/#/votre-slug</code>
              </div>
            </div>
          </div>

        </div>

        <!-- Limites plan free -->
        <div class="guide-limits">
          <h4 class="guide-limits-title">📋 Limites du plan Gratuit</h4>
          <div class="guide-limits-grid">
            <div class="guide-limit-item">
              <span class="guide-limit-icon limit-ok">✅</span>
              <span>Store en ligne</span>
            </div>
            <div class="guide-limit-item">
              <span class="guide-limit-icon limit-ok">✅</span>
              <span>Paiements test Stripe</span>
            </div>
            <div class="guide-limit-item">
              <span class="guide-limit-icon limit-ok">✅</span>
              <span>Assistant IA</span>
            </div>
            <div class="guide-limit-item">
              <span class="guide-limit-icon limit-no">❌</span>
              <span>Paiements réels</span>
            </div>
            <div class="guide-limit-item">
              <span class="guide-limit-icon limit-no">❌</span>
              <span>Domaine personnalisé</span>
            </div>
            <div class="guide-limit-item">
              <span class="guide-limit-icon limit-no">❌</span>
              <span>Stripe Connect sécurisé</span>
            </div>
          </div>
          <div class="guide-upgrade-hint">
            💡 Passez au <strong>Plan Pro</strong> pour accepter de vrais paiements et connecter votre domaine.
          </div>
        </div>

      </div>

      <!-- ══ PLAN PRO ══════════════════════════════════ -->
      <div v-if="plan === 'pro'" class="guide-content">

        <div class="guide-plan-badge pro">⭐ Plan Pro — Paiements réels, domaine personnalisé</div>

        <div class="guide-steps">
          <div v-for="(step, i) in proSteps" :key="i" class="guide-step">
            <div class="guide-step-left">
              <div class="guide-step-num" :style="{ background: step.color }">{{ i + 1 }}</div>
              <div class="guide-step-line" v-if="i < proSteps.length - 1"></div>
            </div>
            <div class="guide-step-body">
              <div class="guide-step-header">
                <span class="guide-step-icon">{{ step.icon }}</span>
                <h3 class="guide-step-title">{{ step.title }}</h3>
              </div>
              <p class="guide-step-desc">{{ step.desc }}</p>

              <!-- Stripe Connect block -->
              <div v-if="step.stripeConnect" class="guide-stripe-connect">
                <div class="guide-stripe-connect-header">
                  <img src="https://cdn.brandfetch.io/stripe.com/w/512/h/512/logo" class="guide-stripe-logo" alt="Stripe"/>
                  <strong>Stripe Connect — Paiements sécurisés</strong>
                </div>
                <div class="guide-connect-steps">
                  <div class="guide-connect-step">
                    <span class="guide-connect-num">1</span>
                    <p>Depuis votre <strong>Dashboard</strong>, cliquez sur <strong>"Connecter Stripe"</strong></p>
                  </div>
                  <div class="guide-connect-step">
                    <span class="guide-connect-num">2</span>
                    <p>Vous êtes redirigé vers <strong>Stripe.com</strong> — créez ou connectez votre compte Stripe</p>
                  </div>
                  <div class="guide-connect-step">
                    <span class="guide-connect-num">3</span>
                    <p>Renseignez vos informations bancaires <strong>directement chez Stripe</strong> (jamais sur notre plateforme)</p>
                  </div>
                  <div class="guide-connect-step">
                    <span class="guide-connect-num">4</span>
                    <p>Une fois validé, vos clients paient et <strong>les fonds arrivent directement</strong> sur votre compte bancaire</p>
                  </div>
                </div>
                <div class="guide-security-badges">
                  <span class="guide-security-badge">🔒 SSL/TLS</span>
                  <span class="guide-security-badge">🛡️ PCI-DSS</span>
                  <span class="guide-security-badge">🏦 Virement direct</span>
                  <span class="guide-security-badge">✅ KYC Stripe</span>
                </div>
                <p class="guide-connect-warning">
                  ⚠️ <strong>Important :</strong> Nous ne stockons jamais vos coordonnées bancaires. Tout est géré directement par Stripe dans un environnement sécurisé et certifié.
                </p>
              </div>

              <!-- Domaine block -->
              <div v-if="step.domain" class="guide-domain-hint">
                <div class="guide-domain-row">
                  <span>🌐</span>
                  <div>
                    <p class="guide-domain-title">Configuration DNS</p>
                    <p class="guide-domain-desc">Ajoutez les serveurs NS fournis dans votre Dashboard chez votre registrar (GoDaddy, Namecheap, OVH...)</p>
                    <p class="guide-domain-note">⏱️ La propagation DNS prend 24 à 48 heures.</p>
                  </div>
                </div>
              </div>

              <!-- Aperçu lien -->
              <div v-if="step.preview" class="guide-preview-hint">
                <span>👁️</span> Votre store sera accessible à : <code>www.votre-domaine.com</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Avantages Pro -->
        <div class="guide-limits">
          <h4 class="guide-limits-title">⭐ Tout ce qu'inclut le Plan Pro</h4>
          <div class="guide-limits-grid">
            <div class="guide-limit-item" v-for="f in proFeatures" :key="f">
              <span class="guide-limit-icon limit-ok">✅</span>
              <span>{{ f }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="guide-footer">
        <p class="guide-footer-text">Des questions ? Notre assistant IA est disponible sur chaque store pour vous aider.</p>
        <button class="guide-footer-btn">
          Commencer maintenant →
        </button>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"

const plan   = ref("free")
const copied = ref("")

const copy = (text, key) => {
  navigator.clipboard?.writeText(text)
  copied.value = key
  setTimeout(() => { copied.value = "" }, 2000)
}

const freeSteps = [
  {
    icon: "👤",
    title: "Créez votre compte",
    desc: "Inscrivez-vous avec votre email et un mot de passe. C'est gratuit, sans carte bancaire requise.",
    color: "#6c63ff",
  },
  {
    icon: "📊",
    title: "Explorez votre Dashboard",
    desc: "Le Dashboard est votre centre de contrôle : suivez vos commandes, consultez vos statistiques, gérez les messages de contact et configurez votre store.",
    color: "#8b5cf6",
  },
  {
    icon: "🎨",
    title: "Créez votre store dans Saasgenerator",
    desc: "Ajoutez des sections (titre, produits, galerie, formulaire contact...), personnalisez les couleurs et la typographie. Ajoutez vos produits avec nom, prix et description.",
    color: "#a855f7",
  },
  {
    icon: "👁️",
    title: "Aperçu en temps réel",
    desc: "Cliquez sur ▶ Aperçu pour voir votre store exactement comme vos visiteurs le verront, dans toutes les langues disponibles.",
    color: "#ec4899",
    preview: true,
  },
  {
    icon: "🚀",
    title: "Publiez votre store",
    desc: "Choisissez un nom de slug unique (ex: mon-store) et publiez. Votre store est immédiatement en ligne et accessible.",
    color: "#f59e0b",
  },
  {
    icon: "💳",
    title: "Testez les paiements Stripe",
    desc: "En mode gratuit, utilisez les données de carte de test Stripe ci-dessous pour simuler un achat complet sans débiter de vrai argent.",
    color: "#10b981",
    stripeTest: true,
  },
]

const proSteps = [
  {
    icon: "👤",
    title: "Créez votre compte",
    desc: "Inscrivez-vous avec votre email. Accédez au Plan Pro depuis votre Dashboard en souscrivant à l'abonnement mensuel.",
    color: "#f59e0b",
  },
  {
    icon: "📊",
    title: "Dashboard — Vue d'ensemble",
    desc: "Centralisez tout : commandes Pro et Free, messages clients, statistiques de vente, gestion des sauvegardes et restaurations Firestore.",
    color: "#f97316",
  },
  {
    icon: "🎨",
    title: "Construisez votre store",
    desc: "Utilisez le Saasgenerator pour créer toutes vos pages : accueil, produits, galerie, contact. Chaque sauvegarde synchronise automatiquement votre catalogue produits.",
    color: "#ef4444",
  },
  {
    icon: "🔗",
    title: "Connectez Stripe — Paiements réels",
    desc: "La connexion Stripe est le cœur du Plan Pro. Vos clients paient directement sur votre compte bancaire, en toute sécurité.",
    color: "#8b5cf6",
    stripeConnect: true,
  },
  {
    icon: "🌐",
    title: "Liez votre domaine personnalisé",
    desc: "Connectez votre propre nom de domaine (ex: www.maroquinerie-fati.ma) pour une image professionnelle.",
    color: "#6c63ff",
    domain: true,
  },
  {
    icon: "👁️",
    title: "Aperçu & Mise en ligne",
    desc: "Prévisualisez votre store final avec votre domaine, vos vrais produits et les paiements Stripe activés.",
    color: "#14b8a6",
    preview: true,
  },
]

const proFeatures = [
  "Paiements réels via Stripe Connect",
  "Fonds virés directement sur votre compte",
  "Domaine personnalisé",
  "Assistant IA multilingue",
  "Sauvegarde automatique Firestore",
  "Gestion commandes & messages clients",
  "Catalogue produits synchronisé",
  "Multi-langues (FR, EN, AR, ES)",
]
</script>

<style scoped>
/* ── Root ────────────────────────────────────────────────── */
.guide-root {
  font-family: 'DM Sans', sans-serif;
  color: #f1f5f9;
}

/* ── Modal (now just a styled container) ─────────────────── */
.guide-modal {
  background: #0f0f1a;
  border: 1px solid rgba(108,99,255,.25);
  border-radius: 20px; width: 100%; max-width: 620px;
  overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,.6);
}

/* ── Header ──────────────────────────────────────────────── */
.guide-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  background: linear-gradient(135deg, rgba(108,99,255,.08), rgba(168,85,247,.05));
  flex-shrink: 0;
}
.guide-header-left { display: flex; align-items: center; gap: 14px; }
.guide-logo        { font-size: 32px; }
.guide-title       { font-size: 18px; font-weight: 800; color: #f1f5f9; margin: 0 0 2px; }
.guide-subtitle    { font-size: 12px; color: #64748b; margin: 0; }

/* ── Tabs ────────────────────────────────────────────────── */
.guide-tabs {
  display: flex; gap: 8px; padding: 14px 24px 0;
  flex-shrink: 0;
}
.guide-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif;
  transition: all .2s;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  color: #64748b;
}
.guide-tab.active {
  background: rgba(108,99,255,.15); border-color: rgba(108,99,255,.35);
  color: #a78bfa;
}
.guide-tab-icon { font-size: 16px; }

/* ── Content scroll ──────────────────────────────────────── */
.guide-content {
  overflow-y: auto; padding: 16px 24px 0;
  flex: 1;
}
.guide-content::-webkit-scrollbar { width: 4px; }
.guide-content::-webkit-scrollbar-thumb { background: rgba(108,99,255,.3); border-radius: 2px; }

/* ── Plan badge ──────────────────────────────────────────── */
.guide-plan-badge {
  padding: 10px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 600; margin-bottom: 20px;
}
.guide-plan-badge.free { background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.2); color: #34d399; }
.guide-plan-badge.pro  { background: rgba(245,158,11,.1);  border: 1px solid rgba(245,158,11,.2);  color: #fbbf24; }

/* ── Steps ───────────────────────────────────────────────── */
.guide-steps { display: flex; flex-direction: column; }

.guide-step {
  display: flex; gap: 16px;
}

.guide-step-left {
  display: flex; flex-direction: column; align-items: center;
  flex-shrink: 0;
}
.guide-step-num {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #fff;
  flex-shrink: 0; z-index: 1;
}
.guide-step-line {
  width: 2px; flex: 1; min-height: 20px;
  background: linear-gradient(to bottom, rgba(108,99,255,.3), rgba(108,99,255,.05));
  margin: 6px 0;
}

.guide-step-body { padding-bottom: 20px; flex: 1; min-width: 0; }

.guide-step-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 6px;
}
.guide-step-icon  { font-size: 20px; }
.guide-step-title { font-size: 15px; font-weight: 700; color: #e2e8f0; margin: 0; }
.guide-step-desc  { font-size: 13px; color: #64748b; line-height: 1.65; margin: 0; }

/* ── Stripe Test Card ────────────────────────────────────── */
.guide-stripe-test {
  margin-top: 12px;
  background: rgba(99,102,241,.06);
  border: 1px solid rgba(99,102,241,.2);
  border-radius: 12px; padding: 14px 16px;
}
.guide-stripe-test-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; color: #c7d2fe;
  margin-bottom: 12px;
}
.guide-badge-test {
  background: rgba(239,68,68,.15); color: #f87171;
  border: 1px solid rgba(239,68,68,.25);
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px;
}
.guide-stripe-fields { display: flex; flex-direction: column; gap: 8px; }
.guide-stripe-field  { display: flex; align-items: center; gap: 10px; }
.guide-stripe-label  { font-size: 11px; color: #64748b; width: 60px; flex-shrink: 0; font-weight: 600; }
.guide-stripe-val-row { display: flex; align-items: center; gap: 8px; }
.guide-stripe-val {
  font-family: 'Courier New', monospace; font-size: 13px;
  color: #a5f3fc; background: rgba(14,165,233,.08);
  padding: 3px 8px; border-radius: 6px;
  border: 1px solid rgba(14,165,233,.15);
}
.guide-copy-btn {
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
  color: #94a3b8; border-radius: 6px; padding: 3px 8px;
  font-size: 12px; cursor: pointer; transition: .15s;
}
.guide-copy-btn:hover { background: rgba(255,255,255,.14); }
.guide-stripe-note {
  font-size: 11px; color: #f59e0b; margin: 10px 0 0;
  background: rgba(245,158,11,.08); padding: 6px 10px; border-radius: 6px;
}

/* ── Stripe Connect ──────────────────────────────────────── */
.guide-stripe-connect {
  margin-top: 12px;
  background: rgba(99,102,241,.06);
  border: 1px solid rgba(99,102,241,.2);
  border-radius: 12px; padding: 16px;
}
.guide-stripe-connect-header {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; font-weight: 700; color: #c7d2fe;
  margin-bottom: 14px;
}
.guide-stripe-logo { width: 22px; height: 22px; border-radius: 4px; }
.guide-connect-steps { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.guide-connect-step {
  display: flex; gap: 12px; align-items: flex-start;
}
.guide-connect-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(108,99,255,.25); color: #a78bfa;
  font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.guide-connect-step p { font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.6; }
.guide-connect-step strong { color: #c7d2fe; }
.guide-security-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.guide-security-badge {
  background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.2);
  color: #34d399; font-size: 11px; font-weight: 600;
  padding: 3px 10px; border-radius: 100px;
}
.guide-connect-warning {
  font-size: 12px; color: #fbbf24;
  background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.15);
  padding: 8px 12px; border-radius: 8px; margin: 0; line-height: 1.6;
}

/* ── Domain hint ─────────────────────────────────────────── */
.guide-domain-hint {
  margin-top: 12px;
  background: rgba(20,184,166,.06);
  border: 1px solid rgba(20,184,166,.2);
  border-radius: 10px; padding: 12px 14px;
}
.guide-domain-row { display: flex; gap: 12px; align-items: flex-start; font-size: 18px; }
.guide-domain-title { font-size: 13px; font-weight: 700; color: #5eead4; margin: 0 0 4px; }
.guide-domain-desc  { font-size: 12px; color: #64748b; margin: 0 0 4px; line-height: 1.6; }
.guide-domain-note  { font-size: 11px; color: #f59e0b; margin: 0; }

/* ── Preview hint ────────────────────────────────────────── */
.guide-preview-hint {
  margin-top: 10px; display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #64748b;
}
.guide-preview-hint code {
  color: #a78bfa; background: rgba(108,99,255,.1);
  padding: 2px 8px; border-radius: 5px; font-size: 12px;
}

/* ── Limits / Features ───────────────────────────────────── */
.guide-limits {
  margin: 16px 0 20px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 12px; padding: 16px;
}
.guide-limits-title {
  font-size: 13px; font-weight: 700; color: #e2e8f0;
  margin: 0 0 12px;
}
.guide-limits-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.guide-limit-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #94a3b8;
}
.guide-limit-icon { font-size: 14px; }
.guide-upgrade-hint {
  margin-top: 12px; padding: 10px 12px;
  background: rgba(108,99,255,.08); border: 1px solid rgba(108,99,255,.2);
  border-radius: 8px; font-size: 12px; color: #a78bfa; line-height: 1.6;
}

/* ── Footer ──────────────────────────────────────────────── */
.guide-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255,255,255,.06);
  background: rgba(0,0,0,.2);
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-shrink: 0; flex-wrap: wrap;
}
.guide-footer-text { font-size: 12px; color: #475569; margin: 0; }
.guide-footer-btn {
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  border: none; color: #fff; padding: 10px 20px;
  border-radius: 10px; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
  transition: opacity .15s; white-space: nowrap;
}
.guide-footer-btn:hover { opacity: .85; }
</style>
