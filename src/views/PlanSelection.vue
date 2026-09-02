<!-- ============================================================
  PlanSelection.vue — SaasBuilder Landing Page
============================================================ -->
<template>
  <div class="ps-root" :dir="isRtl ? 'rtl' : 'ltr'">

    <!-- ── HERO ─────────────────────────────────────────────── -->
    <section class="ps-hero">
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80"
        class="ps-hero-img" alt="hero"
      />
      <div class="ps-hero-overlay"></div>

      <!-- Sélecteur de langue + Se connecter — coin supérieur droit -->
      <div class="ps-login-corner">
        <div class="ps-lang-sel" dir="ltr">
          <button
            v-for="l in LANGS" :key="l.code"
            :class="['ps-lang-flag', lang===l.code && 'ps-lang-active']"
            @click="lang = l.code"
            :title="l.label"
          >{{ l.flag }}</button>
        </div>
        <p class="ps-login-hint">{{ t.loginHint }}</p>
        <button @click="goToLogin" class="ps-login-btn">
          {{ t.loginBtn }}
        </button>
      </div>

      <!-- Contenu hero -->
      <div class="ps-hero-content">
        <div class="ps-hero-badge">{{ t.heroBadge }}</div>
        <h1 class="ps-hero-title">
          {{ t.heroTitle1 }}<br/>
          <span class="ps-hero-accent">{{ t.heroTitle2 }}</span>
        </h1>
        <p class="ps-hero-sub">{{ t.heroSub }}</p>
        <p class="ps-hero-price">
          {{ t.heroPricePrefix }} <span class="ps-price-highlight">{{ t.heroPriceHighlight }}</span>
        </p>
        <div class="ps-hero-actions">
          <button @click="selectPlan('pro')" class="ps-btn-cta">
            {{ t.ctaPro }}
          </button>
          <button @click="scrollToPlans" class="ps-btn-secondary">
            {{ t.ctaSeeOffers }}
          </button>
        </div>
        <!-- Indicateurs de confiance -->
        <div class="ps-trust">
          <span>{{ t.trustSecure }}</span>
          <span>{{ t.trustNoCommit }}</span>
          <span>{{ t.trustSupport }}</span>
        </div>
      </div>
    </section>

    <!-- ── FEATURES ──────────────────────────────────────────── -->
    <section class="ps-features">
      <div class="ps-features-grid">
        <div class="ps-feature-card">
          <span class="ps-feat-icon">🏗️</span>
          <h3>{{ t.feat1Title }}</h3>
          <p>{{ t.feat1Desc }}</p>
        </div>
        <div class="ps-feature-card">
          <span class="ps-feat-icon">💳</span>
          <h3>{{ t.feat2Title }}</h3>
          <p>{{ t.feat2Desc }}</p>
        </div>
        <div class="ps-feature-card">
          <span class="ps-feat-icon">📦</span>
          <h3>{{ t.feat3Title }}</h3>
          <p>{{ t.feat3Desc }}</p>
        </div>
        <div class="ps-feature-card">
          <span class="ps-feat-icon">🌍</span>
          <h3>{{ t.feat4Title }}</h3>
          <p>{{ t.feat4Desc }}</p>
        </div>
      </div>
    </section>

    <!-- ── PLANS ─────────────────────────────────────────────── -->
    <section ref="plansSection" class="ps-plans">
      <div class="ps-plans-inner">
        <h2 class="ps-plans-title">{{ t.plansTitle }}</h2>
        <p class="ps-plans-sub">{{ t.plansSub }}</p>

        <div class="ps-plans-grid">

          <!-- FREE -->
          <div class="ps-plan-card">
            <div class="ps-plan-header">
              <h3 class="ps-plan-name">{{ t.freeName }}</h3>
              <div class="ps-plan-price-wrap">
                <span class="ps-plan-price">0€</span>
                <span class="ps-plan-period">{{ t.perMonth }}</span>
              </div>
              <p class="ps-plan-tagline">{{ t.freeTagline }}</p>
            </div>
            <ul class="ps-plan-features">
              <li class="ps-feat-ok">✓ {{ t.freeFeat1 }}</li>
              <li class="ps-feat-ok">✓ {{ t.freeFeat2 }}</li>
              <li class="ps-feat-no">✗ {{ t.freeFeat3 }}</li>
              <li class="ps-feat-no">✗ {{ t.freeFeat4 }}</li>
              <li class="ps-feat-no">✗ {{ t.freeFeat5 }}</li>
            </ul>
            <button @click="selectPlan('free')" class="ps-plan-btn ps-plan-btn-free">
              {{ t.freeBtn }}
            </button>
          </div>

          <!-- PRO -->
          <div class="ps-plan-card ps-plan-card-pro">
            <div class="ps-plan-badge">{{ t.proBadge }}</div>
            <div class="ps-plan-header">
              <h3 class="ps-plan-name">{{ t.proName }}</h3>
              <div class="ps-plan-price-wrap">
                <span class="ps-plan-price ps-plan-price-pro">10€</span>
                <span class="ps-plan-period">{{ t.perMonth }}</span>
              </div>
              <p class="ps-plan-tagline">{{ t.proTagline }}</p>
            </div>
            <ul class="ps-plan-features">
              <li class="ps-feat-ok">✓ {{ t.proFeat1 }}</li>
              <li class="ps-feat-ok">✓ {{ t.proFeat2 }}</li>
              <li class="ps-feat-ok">✓ {{ t.proFeat3 }}</li>
              <li class="ps-feat-ok">✓ {{ t.proFeat4 }}</li>
              <li class="ps-feat-ok">✓ {{ t.proFeat5 }}</li>
            </ul>
            <button @click="selectPlan('pro')" class="ps-plan-btn ps-plan-btn-pro">
              {{ t.proBtn }}
            </button>
            <p class="ps-plan-note">{{ t.proNote }}</p>
          </div>

        </div>
      </div>
    </section>

    <!-- ── FOOTER ─────────────────────────────────────────────── -->
    <footer class="ps-footer">
      <p class="ps-footer-brand">© {{ new Date().getFullYear() }} SaasBuilder</p>
      <nav class="ps-footer-links">
        <router-link to="/privacy-policy">{{ t.footerPrivacy }}</router-link>
        <router-link to="/remboursement">{{ t.footerRefund }}</router-link>
        <router-link to="/confidentialite">{{ t.footerConfidentiality }}</router-link>
        <router-link to="/mentions">{{ t.footerLegal }}</router-link>
        <router-link to="/conditions">{{ t.footerTerms }}</router-link>
      </nav>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"

const router       = useRouter()
const plansSection = ref(null)

// ── Langue ────────────────────────────────────────────────────
const LANGS = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ar", flag: "🇲🇦", label: "العربية" },
  { code: "es", flag: "🇪🇸", label: "Español" },
]
const lang = ref(localStorage.getItem("ps_lang") || "fr")
watch(lang, (v) => localStorage.setItem("ps_lang", v))
const isRtl = computed(() => lang.value === "ar")

const TRANSLATIONS = {
  fr: {
    loginHint: "Déjà un compte ?",
    loginBtn: "🔑 Se connecter",
    heroBadge: "🚀 Plateforme SaaS N°1",
    heroTitle1: "Créez votre boutique",
    heroTitle2: "en ligne en minutes",
    heroSub: "Builder visuel · Paiements Stripe · Gestion des commandes",
    heroPricePrefix: "À partir de",
    heroPriceHighlight: "10€ / mois",
    ctaPro: "Démarrer Pro — 10€/mois ⚡",
    ctaSeeOffers: "Voir les offres ↓",
    trustSecure: "🔒 Paiement sécurisé",
    trustNoCommit: "⚡ Sans engagement",
    trustSupport: "🛟 Support inclus",
    feat1Title: "Builder visuel", feat1Desc: "Glissez-déposez vos sections. Aucun code requis.",
    feat2Title: "Paiements intégrés", feat2Desc: "Stripe Connect pour recevoir les paiements directement.",
    feat3Title: "Gestion commandes", feat3Desc: "Dashboard complet pour suivre vos ventes en temps réel.",
    feat4Title: "Multi-langues", feat4Desc: "Votre store en Français, Anglais, Arabe et Espagnol.",
    plansTitle: "Nos offres",
    plansSub: "Choisissez le plan adapté à votre activité",
    perMonth: "/mois",
    freeName: "🆓 Gratuit",
    freeTagline: "Pour commencer sans risque",
    freeFeat1: "1 page", freeFeat2: "Builder visuel",
    freeFeat3: "Paiements clients", freeFeat4: "Multi-pages", freeFeat5: "Catalogue produits",
    freeBtn: "Commencer gratuitement",
    proBadge: "⭐ Recommandé",
    proName: "⚡ Pro",
    proTagline: "Tout ce qu'il vous faut pour vendre",
    proFeat1: "Pages illimitées", proFeat2: "Builder complet", proFeat3: "Paiements Stripe",
    proFeat4: "Catalogue produits", proFeat5: "Support prioritaire",
    proBtn: "Choisir Pro — 10€/mois",
    proNote: "Sans engagement · Annulable à tout moment",
    footerPrivacy: "Privacy Policy", footerRefund: "Remboursement",
    footerConfidentiality: "Confidentialité", footerLegal: "Mentions légales", footerTerms: "Conditions générales",
  },
  en: {
    loginHint: "Already have an account?",
    loginBtn: "🔑 Log in",
    heroBadge: "🚀 #1 SaaS Platform",
    heroTitle1: "Build your online store",
    heroTitle2: "in minutes",
    heroSub: "Visual builder · Stripe payments · Order management",
    heroPricePrefix: "Starting at",
    heroPriceHighlight: "€10 / month",
    ctaPro: "Start Pro — €10/month ⚡",
    ctaSeeOffers: "See plans ↓",
    trustSecure: "🔒 Secure payment",
    trustNoCommit: "⚡ No commitment",
    trustSupport: "🛟 Support included",
    feat1Title: "Visual builder", feat1Desc: "Drag and drop your sections. No code required.",
    feat2Title: "Built-in payments", feat2Desc: "Stripe Connect to receive payments directly.",
    feat3Title: "Order management", feat3Desc: "Full dashboard to track your sales in real time.",
    feat4Title: "Multi-language", feat4Desc: "Your store in French, English, Arabic and Spanish.",
    plansTitle: "Our plans",
    plansSub: "Choose the plan that fits your business",
    perMonth: "/month",
    freeName: "🆓 Free",
    freeTagline: "Start risk-free",
    freeFeat1: "1 page", freeFeat2: "Visual builder",
    freeFeat3: "Customer payments", freeFeat4: "Multiple pages", freeFeat5: "Product catalog",
    freeBtn: "Start for free",
    proBadge: "⭐ Recommended",
    proName: "⚡ Pro",
    proTagline: "Everything you need to sell",
    proFeat1: "Unlimited pages", proFeat2: "Full builder", proFeat3: "Stripe payments",
    proFeat4: "Product catalog", proFeat5: "Priority support",
    proBtn: "Choose Pro — €10/month",
    proNote: "No commitment · Cancel anytime",
    footerPrivacy: "Privacy Policy", footerRefund: "Refunds",
    footerConfidentiality: "Confidentiality", footerLegal: "Legal Notice", footerTerms: "Terms of Service",
  },
  ar: {
    loginHint: "لديك حساب بالفعل؟",
    loginBtn: "🔑 تسجيل الدخول",
    heroBadge: "🚀 منصة SaaS رقم 1",
    heroTitle1: "أنشئ متجرك",
    heroTitle2: "الإلكتروني في دقائق",
    heroSub: "منشئ مرئي · مدفوعات Stripe · إدارة الطلبات",
    heroPricePrefix: "ابتداءً من",
    heroPriceHighlight: "10€ / شهرياً",
    ctaPro: "ابدأ Pro — 10€/شهرياً ⚡",
    ctaSeeOffers: "شاهد العروض ↓",
    trustSecure: "🔒 دفع آمن",
    trustNoCommit: "⚡ بدون التزام",
    trustSupport: "🛟 دعم مشمول",
    feat1Title: "منشئ مرئي", feat1Desc: "اسحب وأسقط أقسامك. لا حاجة للكود.",
    feat2Title: "مدفوعات مدمجة", feat2Desc: "Stripe Connect لاستقبال المدفوعات مباشرة.",
    feat3Title: "إدارة الطلبات", feat3Desc: "لوحة تحكم كاملة لتتبع مبيعاتك في الوقت الفعلي.",
    feat4Title: "متعدد اللغات", feat4Desc: "متجرك بالفرنسية والإنجليزية والعربية والإسبانية.",
    plansTitle: "عروضنا",
    plansSub: "اختر الخطة المناسبة لنشاطك",
    perMonth: "/شهرياً",
    freeName: "🆓 مجاني",
    freeTagline: "ابدأ بدون مخاطرة",
    freeFeat1: "صفحة واحدة", freeFeat2: "منشئ مرئي",
    freeFeat3: "مدفوعات العملاء", freeFeat4: "صفحات متعددة", freeFeat5: "كتالوج المنتجات",
    freeBtn: "ابدأ مجاناً",
    proBadge: "⭐ موصى به",
    proName: "⚡ Pro",
    proTagline: "كل ما تحتاجه للبيع",
    proFeat1: "صفحات غير محدودة", proFeat2: "منشئ كامل", proFeat3: "مدفوعات Stripe",
    proFeat4: "كتالوج المنتجات", proFeat5: "دعم أولوي",
    proBtn: "اختر Pro — 10€/شهرياً",
    proNote: "بدون التزام · إلغاء في أي وقت",
    footerPrivacy: "سياسة الخصوصية", footerRefund: "الاستعادة",
    footerConfidentiality: "السرية", footerLegal: "الإشعار القانوني", footerTerms: "الشروط العامة",
  },
  es: {
    loginHint: "¿Ya tienes una cuenta?",
    loginBtn: "🔑 Iniciar sesión",
    heroBadge: "🚀 Plataforma SaaS N.º 1",
    heroTitle1: "Crea tu tienda",
    heroTitle2: "en línea en minutos",
    heroSub: "Constructor visual · Pagos Stripe · Gestión de pedidos",
    heroPricePrefix: "Desde",
    heroPriceHighlight: "10€ / mes",
    ctaPro: "Empezar Pro — 10€/mes ⚡",
    ctaSeeOffers: "Ver planes ↓",
    trustSecure: "🔒 Pago seguro",
    trustNoCommit: "⚡ Sin compromiso",
    trustSupport: "🛟 Soporte incluido",
    feat1Title: "Constructor visual", feat1Desc: "Arrastra y suelta tus secciones. Sin código.",
    feat2Title: "Pagos integrados", feat2Desc: "Stripe Connect para recibir pagos directamente.",
    feat3Title: "Gestión de pedidos", feat3Desc: "Panel completo para seguir tus ventas en tiempo real.",
    feat4Title: "Multilingüe", feat4Desc: "Tu tienda en francés, inglés, árabe y español.",
    plansTitle: "Nuestros planes",
    plansSub: "Elige el plan adecuado para tu negocio",
    perMonth: "/mes",
    freeName: "🆓 Gratis",
    freeTagline: "Empieza sin riesgo",
    freeFeat1: "1 página", freeFeat2: "Constructor visual",
    freeFeat3: "Pagos de clientes", freeFeat4: "Múltiples páginas", freeFeat5: "Catálogo de productos",
    freeBtn: "Empezar gratis",
    proBadge: "⭐ Recomendado",
    proName: "⚡ Pro",
    proTagline: "Todo lo que necesitas para vender",
    proFeat1: "Páginas ilimitadas", proFeat2: "Constructor completo", proFeat3: "Pagos Stripe",
    proFeat4: "Catálogo de productos", proFeat5: "Soporte prioritario",
    proBtn: "Elegir Pro — 10€/mes",
    proNote: "Sin compromiso · Cancela cuando quieras",
    footerPrivacy: "Política de Privacidad", footerRefund: "Reembolsos",
    footerConfidentiality: "Confidencialidad", footerLegal: "Aviso Legal", footerTerms: "Términos y Condiciones",
  },
}

const t = computed(() => TRANSLATIONS[lang.value] || TRANSLATIONS.fr)

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
.ps-lang-sel { display: flex; gap: 3px; }
.ps-lang-flag {
  background: rgba(255,255,255,.1); border: 1px solid transparent;
  border-radius: 8px; padding: 4px 6px; font-size: 16px; line-height: 1;
  cursor: pointer; transition: .15s;
}
.ps-lang-flag:hover { background: rgba(255,255,255,.2); }
.ps-lang-active { border-color: rgba(255,255,255,.6); background: rgba(255,255,255,.25); }
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
