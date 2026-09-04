<template>
  <div class="guide-root" :dir="isRtl ? 'rtl' : 'ltr'">

    <div class="guide-modal">

      <!-- Header -->
      <div class="guide-header">
        <div class="guide-header-left">
          <div class="guide-logo">🚀</div>
          <div>
            <h2 class="guide-title">{{ t.headerTitle }}</h2>
            <p class="guide-subtitle">{{ t.headerSubtitle }}</p>
          </div>
        </div>
        <div class="guide-lang-sel" dir="ltr">
          <button
            v-for="l in LANGS" :key="l.code"
            :class="['guide-lang-flag', lang===l.code && 'guide-lang-active']"
            @click="lang = l.code"
            :title="l.label"
          >{{ l.flag }}</button>
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
          <span>{{ t.tabFree }}</span>
        </button>
        <button
          class="guide-tab"
          :class="{ active: plan === 'pro' }"
          @click="plan = 'pro'"
        >
          <span class="guide-tab-icon">⭐</span>
          <span>{{ t.tabPro }}</span>
        </button>
      </div>

      <!-- ══ PLAN GRATUIT ══════════════════════════════ -->
      <div v-if="plan === 'free'" class="guide-content">

        <div class="guide-plan-badge free">🆓 {{ t.freeBadge }}</div>

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
                  <strong>{{ t.stripeTestTitle }}</strong>
                  <span class="guide-badge-test">{{ t.stripeTestBadge }}</span>
                </div>
                <div class="guide-stripe-fields">
                  <div class="guide-stripe-field">
                    <span class="guide-stripe-label">{{ t.stripeNumberLabel }}</span>
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
                <p class="guide-stripe-note">⚠️ {{ t.stripeTestNote }}</p>
              </div>
              <!-- Aperçu lien -->
              <div v-if="step.preview" class="guide-preview-hint">
                <span>👁️</span> {{ t.previewHintFree }} <code>mronlinestores.com/#/votre-slug</code>
              </div>
            </div>
          </div>

        </div>

        <!-- Limites plan free -->
        <div class="guide-limits">
          <h4 class="guide-limits-title">📋 {{ t.freeLimitsTitle }}</h4>
          <div class="guide-limits-grid">
            <div v-for="(item, i) in freeLimits" :key="i" class="guide-limit-item">
              <span class="guide-limit-icon" :class="item.ok ? 'limit-ok' : 'limit-no'">{{ item.ok ? '✅' : '❌' }}</span>
              <span>{{ item.label }}</span>
            </div>
          </div>
          <div class="guide-upgrade-hint">
            💡 {{ t.upgradeHintPre }} <strong>{{ t.proName }}</strong> {{ t.upgradeHintPost }}
          </div>
        </div>

      </div>

      <!-- ══ PLAN PRO ══════════════════════════════════ -->
      <div v-if="plan === 'pro'" class="guide-content">

        <div class="guide-plan-badge pro">⭐ {{ t.proBadgeText }}</div>

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
                  <strong>{{ t.connectTitle }}</strong>
                </div>
                <div class="guide-connect-steps">
                  <div class="guide-connect-step" v-for="(cs, ci) in t.connectSteps" :key="ci">
                    <span class="guide-connect-num">{{ ci + 1 }}</span>
                    <p v-html="cs"></p>
                  </div>
                </div>
                <div class="guide-security-badges">
                  <span class="guide-security-badge">🔒 SSL/TLS</span>
                  <span class="guide-security-badge">🛡️ PCI-DSS</span>
                  <span class="guide-security-badge">{{ t.badgeDirectTransfer }}</span>
                  <span class="guide-security-badge">✅ KYC Stripe</span>
                </div>
                <p class="guide-connect-warning">
                  ⚠️ <strong>{{ t.important }} :</strong> {{ t.connectWarning }}
                </p>
              </div>

              <!-- Domaine block -->
              <div v-if="step.domain" class="guide-domain-hint">
                <div class="guide-domain-row">
                  <span>🌐</span>
                  <div>
                    <p class="guide-domain-title">{{ t.domainTitle }}</p>
                    <p class="guide-domain-desc">{{ t.domainDesc }}</p>
                    <p class="guide-domain-note">⏱️ {{ t.domainNote }}</p>
                  </div>
                </div>
              </div>

              <!-- Aperçu lien -->
              <div v-if="step.preview" class="guide-preview-hint">
                <span>👁️</span> {{ t.previewHintPro }} <code>www.votre-domaine.com</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Avantages Pro -->
        <div class="guide-limits">
          <h4 class="guide-limits-title">⭐ {{ t.proFeaturesTitle }}</h4>
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
        <p class="guide-footer-text">{{ t.footerText }}</p>
        <button class="guide-footer-btn">
          {{ t.footerBtn }}
        </button>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"

const plan   = ref("free")
const copied = ref("")

const copy = (text, key) => {
  navigator.clipboard?.writeText(text)
  copied.value = key
  setTimeout(() => { copied.value = "" }, 2000)
}

// ── Langue ────────────────────────────────────────────────────
const LANGS = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "ar", flag: "🇲🇦", label: "العربية" },
  { code: "es", flag: "🇪🇸", label: "Español" },
]
const lang = ref(localStorage.getItem("guide_lang") || "fr")
watch(lang, (v) => localStorage.setItem("guide_lang", v))
const isRtl = computed(() => lang.value === "ar")

const TRANSLATIONS = {
  fr: {
    headerTitle: "Guide de démarrage",
    headerSubtitle: "Lancez votre store en quelques minutes",
    tabFree: "Plan Gratuit", tabPro: "Plan Pro",
    freeBadge: "Plan Gratuit — Commencez sans carte bancaire",
    proBadgeText: "Plan Pro — Paiements réels, domaine personnalisé",
    proName: "Plan Pro",
    stripeTestTitle: "Carte de test Stripe", stripeTestBadge: "Mode TEST",
    stripeNumberLabel: "Numéro",
    stripeTestNote: "Ces données sont uniquement pour tester. Aucun vrai paiement ne sera débité.",
    previewHintFree: "Votre store sera accessible à :",
    previewHintPro: "Votre store sera accessible à :",
    freeLimitsTitle: "Limites du plan Gratuit",
    upgradeHintPre: "Passez au", upgradeHintPost: "pour accepter de vrais paiements et connecter votre domaine.",
    connectTitle: "Stripe Connect — Paiements sécurisés",
    connectSteps: [
      'Depuis votre <strong>Dashboard</strong>, cliquez sur <strong>"Connecter Stripe"</strong>',
      "Vous êtes redirigé vers <strong>Stripe.com</strong> — créez ou connectez votre compte Stripe",
      "Renseignez vos informations bancaires <strong>directement chez Stripe</strong> (jamais sur notre plateforme)",
      "Une fois validé, vos clients paient et <strong>les fonds arrivent directement</strong> sur votre compte bancaire",
    ],
    badgeDirectTransfer: "🏦 Virement direct",
    important: "Important",
    connectWarning: "Nous ne stockons jamais vos coordonnées bancaires. Tout est géré directement par Stripe dans un environnement sécurisé et certifié.",
    domainTitle: "Configuration DNS",
    domainDesc: "Ajoutez les serveurs NS fournis dans votre Dashboard chez votre registrar (GoDaddy, Namecheap, OVH...)",
    domainNote: "La propagation DNS prend 24 à 48 heures.",
    proFeaturesTitle: "Tout ce qu'inclut le Plan Pro",
    footerText: "Des questions ? Notre assistant IA est disponible sur chaque store pour vous aider.",
    footerBtn: "Commencer maintenant →",
    freeSteps: [
      { icon: "👤", title: "Créez votre compte", desc: "Inscrivez-vous avec votre email et un mot de passe. C'est gratuit, sans carte bancaire requise.", color: "#6c63ff" },
      { icon: "📊", title: "Explorez votre Dashboard", desc: "Le Dashboard est votre centre de contrôle : suivez vos commandes, consultez vos statistiques, gérez les messages de contact et configurez votre store.", color: "#8b5cf6" },
      { icon: "🎨", title: "Créez votre store dans Saasgenerator", desc: "Ajoutez des sections (titre, produits, galerie, formulaire contact...), personnalisez les couleurs et la typographie. Ajoutez vos produits avec nom, prix et description.", color: "#a855f7" },
      { icon: "👁️", title: "Aperçu en temps réel", desc: "Cliquez sur ▶ Aperçu pour voir votre store exactement comme vos visiteurs le verront, dans toutes les langues disponibles.", color: "#ec4899", preview: true },
      { icon: "🚀", title: "Publiez votre store", desc: "Choisissez un nom de slug unique (ex: mon-store) et publiez. Votre store est immédiatement en ligne et accessible.", color: "#f59e0b" },
      { icon: "💳", title: "Testez les paiements Stripe", desc: "En mode gratuit, utilisez les données de carte de test Stripe ci-dessous pour simuler un achat complet sans débiter de vrai argent.", color: "#10b981", stripeTest: true },
    ],
    proSteps: [
      { icon: "👤", title: "Créez votre compte", desc: "Inscrivez-vous avec votre email. Accédez au Plan Pro depuis votre Dashboard en souscrivant à l'abonnement mensuel.", color: "#f59e0b" },
      { icon: "📊", title: "Dashboard — Vue d'ensemble", desc: "Centralisez tout : commandes Pro et Free, messages clients, statistiques de vente, gestion des sauvegardes et restaurations Firestore.", color: "#f97316" },
      { icon: "🎨", title: "Construisez votre store", desc: "Utilisez le Saasgenerator pour créer toutes vos pages : accueil, produits, galerie, contact. Chaque sauvegarde synchronise automatiquement votre catalogue produits.", color: "#ef4444" },
      { icon: "🔗", title: "Connectez Stripe — Paiements réels", desc: "La connexion Stripe est le cœur du Plan Pro. Vos clients paient directement sur votre compte bancaire, en toute sécurité.", color: "#8b5cf6", stripeConnect: true },
      { icon: "🌐", title: "Liez votre domaine personnalisé", desc: "Connectez votre propre nom de domaine (ex: www.maroquinerie-fati.ma) pour une image professionnelle.", color: "#6c63ff", domain: true },
      { icon: "👁️", title: "Aperçu & Mise en ligne", desc: "Prévisualisez votre store final avec votre domaine, vos vrais produits et les paiements Stripe activés.", color: "#14b8a6", preview: true },
    ],
    freeLimits: [
      { ok: true,  label: "Store en ligne" },
      { ok: true,  label: "Paiements test Stripe" },
      { ok: true,  label: "Assistant IA" },
      { ok: false, label: "Paiements réels" },
      { ok: false, label: "Domaine personnalisé" },
      { ok: false, label: "Stripe Connect sécurisé" },
    ],
    proFeatures: [
      "Paiements réels via Stripe Connect", "Fonds virés directement sur votre compte",
      "Domaine personnalisé", "Assistant IA multilingue", "Sauvegarde automatique Firestore",
      "Gestion commandes & messages clients", "Catalogue produits synchronisé", "Multi-langues (FR, EN, AR, ES)",
    ],
  },
  en: {
    headerTitle: "Getting Started Guide",
    headerSubtitle: "Launch your store in minutes",
    tabFree: "Free Plan", tabPro: "Pro Plan",
    freeBadge: "Free Plan — Start without a credit card",
    proBadgeText: "Pro Plan — Real payments, custom domain",
    proName: "Pro Plan",
    stripeTestTitle: "Stripe test card", stripeTestBadge: "TEST mode",
    stripeNumberLabel: "Number",
    stripeTestNote: "This data is for testing only. No real payment will be charged.",
    previewHintFree: "Your store will be accessible at:",
    previewHintPro: "Your store will be accessible at:",
    freeLimitsTitle: "Free plan limits",
    upgradeHintPre: "Upgrade to", upgradeHintPost: "to accept real payments and connect your domain.",
    connectTitle: "Stripe Connect — Secure payments",
    connectSteps: [
      'From your <strong>Dashboard</strong>, click <strong>"Connect Stripe"</strong>',
      "You are redirected to <strong>Stripe.com</strong> — create or connect your Stripe account",
      "Enter your banking details <strong>directly with Stripe</strong> (never on our platform)",
      "Once verified, your customers pay and <strong>funds go directly</strong> to your bank account",
    ],
    badgeDirectTransfer: "🏦 Direct transfer",
    important: "Important",
    connectWarning: "We never store your banking details. Everything is handled directly by Stripe in a secure, certified environment.",
    domainTitle: "DNS Configuration",
    domainDesc: "Add the NS servers provided in your Dashboard at your registrar (GoDaddy, Namecheap, OVH...)",
    domainNote: "DNS propagation takes 24 to 48 hours.",
    proFeaturesTitle: "Everything included in the Pro Plan",
    footerText: "Questions? Our AI assistant is available on every store to help you.",
    footerBtn: "Get started now →",
    freeSteps: [
      { icon: "👤", title: "Create your account", desc: "Sign up with your email and a password. It's free, no credit card required.", color: "#6c63ff" },
      { icon: "📊", title: "Explore your Dashboard", desc: "The Dashboard is your control center: track orders, view stats, manage contact messages, and configure your store.", color: "#8b5cf6" },
      { icon: "🎨", title: "Build your store in Saasgenerator", desc: "Add sections (title, products, gallery, contact form...), customize colors and typography. Add your products with name, price and description.", color: "#a855f7" },
      { icon: "👁️", title: "Live preview", desc: "Click ▶ Preview to see your store exactly as your visitors will, in every available language.", color: "#ec4899", preview: true },
      { icon: "🚀", title: "Publish your store", desc: "Choose a unique slug name (e.g. my-store) and publish. Your store is immediately online and accessible.", color: "#f59e0b" },
      { icon: "💳", title: "Test Stripe payments", desc: "In free mode, use the Stripe test card data below to simulate a full purchase without charging real money.", color: "#10b981", stripeTest: true },
    ],
    proSteps: [
      { icon: "👤", title: "Create your account", desc: "Sign up with your email. Access the Pro Plan from your Dashboard by subscribing to the monthly plan.", color: "#f59e0b" },
      { icon: "📊", title: "Dashboard — Overview", desc: "Centralize everything: Pro and Free orders, customer messages, sales stats, and Firestore backup/restore management.", color: "#f97316" },
      { icon: "🎨", title: "Build your store", desc: "Use Saasgenerator to create all your pages: home, products, gallery, contact. Every save automatically syncs your product catalog.", color: "#ef4444" },
      { icon: "🔗", title: "Connect Stripe — Real payments", desc: "The Stripe connection is the heart of the Pro Plan. Your customers pay directly into your bank account, securely.", color: "#8b5cf6", stripeConnect: true },
      { icon: "🌐", title: "Link your custom domain", desc: "Connect your own domain name (e.g. www.my-shop.com) for a professional image.", color: "#6c63ff", domain: true },
      { icon: "👁️", title: "Preview & Go live", desc: "Preview your final store with your domain, real products, and Stripe payments enabled.", color: "#14b8a6", preview: true },
    ],
    freeLimits: [
      { ok: true,  label: "Online store" },
      { ok: true,  label: "Stripe test payments" },
      { ok: true,  label: "AI assistant" },
      { ok: false, label: "Real payments" },
      { ok: false, label: "Custom domain" },
      { ok: false, label: "Secure Stripe Connect" },
    ],
    proFeatures: [
      "Real payments via Stripe Connect", "Funds transferred directly to your account",
      "Custom domain", "Multilingual AI assistant", "Automatic Firestore backup",
      "Order & customer message management", "Synced product catalog", "Multi-language (FR, EN, AR, ES)",
    ],
  },
  ar: {
    headerTitle: "دليل البدء",
    headerSubtitle: "أطلق متجرك في دقائق",
    tabFree: "الخطة المجانية", tabPro: "خطة Pro",
    freeBadge: "الخطة المجانية — ابدأ دون بطاقة بنكية",
    proBadgeText: "خطة Pro — مدفوعات حقيقية، نطاق مخصص",
    proName: "خطة Pro",
    stripeTestTitle: "بطاقة اختبار Stripe", stripeTestBadge: "وضع الاختبار",
    stripeNumberLabel: "الرقم",
    stripeTestNote: "هذه البيانات للاختبار فقط. لن يتم خصم أي مبلغ حقيقي.",
    previewHintFree: "سيكون متجرك متاحاً على:",
    previewHintPro: "سيكون متجرك متاحاً على:",
    freeLimitsTitle: "حدود الخطة المجانية",
    upgradeHintPre: "قم بالترقية إلى", upgradeHintPost: "لقبول مدفوعات حقيقية وربط نطاقك.",
    connectTitle: "Stripe Connect — مدفوعات آمنة",
    connectSteps: [
      'من <strong>لوحة التحكم</strong>، اضغط على <strong>"ربط Stripe"</strong>',
      "سيتم إعادة توجيهك إلى <strong>Stripe.com</strong> — أنشئ أو اربط حساب Stripe الخاص بك",
      "أدخل معلوماتك البنكية <strong>مباشرة عند Stripe</strong> (أبداً على منصتنا)",
      "بعد التحقق، يدفع عملاؤك وتصل <strong>الأموال مباشرة</strong> إلى حسابك البنكي",
    ],
    badgeDirectTransfer: "🏦 تحويل مباشر",
    important: "مهم",
    connectWarning: "لا نخزن بياناتك البنكية أبداً. كل شيء يتم التعامل معه مباشرة من قبل Stripe في بيئة آمنة ومعتمدة.",
    domainTitle: "إعدادات DNS",
    domainDesc: "أضف خوادم NS المتوفرة في لوحة التحكم عند مسجل نطاقك (GoDaddy, Namecheap, OVH...)",
    domainNote: "انتشار DNS يستغرق من 24 إلى 48 ساعة.",
    proFeaturesTitle: "كل ما تشمله خطة Pro",
    footerText: "أسئلة؟ مساعدنا الذكي متوفر في كل متجر لمساعدتك.",
    footerBtn: "ابدأ الآن ←",
    freeSteps: [
      { icon: "👤", title: "أنشئ حسابك", desc: "سجّل ببريدك الإلكتروني وكلمة مرور. مجاني، دون الحاجة لبطاقة بنكية.", color: "#6c63ff" },
      { icon: "📊", title: "استكشف لوحة التحكم", desc: "لوحة التحكم هي مركز القيادة: تابع طلباتك، اطّلع على إحصائياتك، أدر رسائل التواصل وضبط متجرك.", color: "#8b5cf6" },
      { icon: "🎨", title: "أنشئ متجرك في Saasgenerator", desc: "أضف أقساماً (عنوان، منتجات، معرض صور، نموذج تواصل...)، خصص الألوان والخطوط. أضف منتجاتك بالاسم والسعر والوصف.", color: "#a855f7" },
      { icon: "👁️", title: "معاينة فورية", desc: "اضغط على ▶ معاينة لرؤية متجرك تماماً كما سيراه زوارك، بجميع اللغات المتوفرة.", color: "#ec4899", preview: true },
      { icon: "🚀", title: "نشر متجرك", desc: "اختر اسم slug فريد (مثال: mon-store) وانشر. سيكون متجرك متاحاً فوراً على الإنترنت.", color: "#f59e0b" },
      { icon: "💳", title: "اختبر مدفوعات Stripe", desc: "في الوضع المجاني، استخدم بيانات بطاقة اختبار Stripe أدناه لمحاكاة عملية شراء كاملة دون خصم أي مال حقيقي.", color: "#10b981", stripeTest: true },
    ],
    proSteps: [
      { icon: "👤", title: "أنشئ حسابك", desc: "سجّل ببريدك الإلكتروني. انتقل إلى خطة Pro من لوحة التحكم بالاشتراك الشهري.", color: "#f59e0b" },
      { icon: "📊", title: "لوحة التحكم — نظرة عامة", desc: "مركّز كل شيء: طلبات Pro و Free، رسائل العملاء، إحصائيات المبيعات، وإدارة النسخ الاحتياطي واستعادة Firestore.", color: "#f97316" },
      { icon: "🎨", title: "أنشئ متجرك", desc: "استخدم Saasgenerator لإنشاء جميع صفحاتك: الرئيسية، المنتجات، المعرض، التواصل. كل حفظ يزامن كتالوج منتجاتك تلقائياً.", color: "#ef4444" },
      { icon: "🔗", title: "اربط Stripe — مدفوعات حقيقية", desc: "ربط Stripe هو جوهر خطة Pro. يدفع عملاؤك مباشرة إلى حسابك البنكي، بأمان كامل.", color: "#8b5cf6", stripeConnect: true },
      { icon: "🌐", title: "اربط نطاقك المخصص", desc: "اربط اسم نطاقك الخاص (مثال: www.matjar-fati.ma) لصورة أكثر احترافية.", color: "#6c63ff", domain: true },
      { icon: "👁️", title: "المعاينة والنشر", desc: "عاين متجرك النهائي بنطاقك ومنتجاتك الحقيقية ومدفوعات Stripe مفعّلة.", color: "#14b8a6", preview: true },
    ],
    freeLimits: [
      { ok: true,  label: "متجر متصل بالإنترنت" },
      { ok: true,  label: "مدفوعات اختبار Stripe" },
      { ok: true,  label: "مساعد ذكي" },
      { ok: false, label: "مدفوعات حقيقية" },
      { ok: false, label: "نطاق مخصص" },
      { ok: false, label: "Stripe Connect الآمن" },
    ],
    proFeatures: [
      "مدفوعات حقيقية عبر Stripe Connect", "تحويل الأموال مباشرة إلى حسابك",
      "نطاق مخصص", "مساعد ذكي متعدد اللغات", "نسخ احتياطي تلقائي عبر Firestore",
      "إدارة الطلبات ورسائل العملاء", "كتالوج منتجات متزامن", "متعدد اللغات (FR, EN, AR, ES)",
    ],
  },
  es: {
    headerTitle: "Guía de inicio",
    headerSubtitle: "Lanza tu tienda en minutos",
    tabFree: "Plan Gratis", tabPro: "Plan Pro",
    freeBadge: "Plan Gratis — Empieza sin tarjeta bancaria",
    proBadgeText: "Plan Pro — Pagos reales, dominio personalizado",
    proName: "Plan Pro",
    stripeTestTitle: "Tarjeta de prueba Stripe", stripeTestBadge: "Modo PRUEBA",
    stripeNumberLabel: "Número",
    stripeTestNote: "Estos datos son solo para pruebas. No se cobrará ningún pago real.",
    previewHintFree: "Tu tienda estará disponible en:",
    previewHintPro: "Tu tienda estará disponible en:",
    freeLimitsTitle: "Límites del plan Gratis",
    upgradeHintPre: "Actualiza a", upgradeHintPost: "para aceptar pagos reales y conectar tu dominio.",
    connectTitle: "Stripe Connect — Pagos seguros",
    connectSteps: [
      'Desde tu <strong>Panel</strong>, haz clic en <strong>"Conectar Stripe"</strong>',
      "Serás redirigido a <strong>Stripe.com</strong> — crea o conecta tu cuenta de Stripe",
      "Ingresa tus datos bancarios <strong>directamente en Stripe</strong> (nunca en nuestra plataforma)",
      "Una vez verificado, tus clientes pagan y <strong>los fondos llegan directamente</strong> a tu cuenta bancaria",
    ],
    badgeDirectTransfer: "🏦 Transferencia directa",
    important: "Importante",
    connectWarning: "Nunca almacenamos tus datos bancarios. Todo lo gestiona Stripe directamente en un entorno seguro y certificado.",
    domainTitle: "Configuración DNS",
    domainDesc: "Añade los servidores NS proporcionados en tu Panel en tu registrador (GoDaddy, Namecheap, OVH...)",
    domainNote: "La propagación DNS tarda de 24 a 48 horas.",
    proFeaturesTitle: "Todo lo que incluye el Plan Pro",
    footerText: "¿Preguntas? Nuestro asistente de IA está disponible en cada tienda para ayudarte.",
    footerBtn: "Empezar ahora →",
    freeSteps: [
      { icon: "👤", title: "Crea tu cuenta", desc: "Regístrate con tu email y una contraseña. Es gratis, sin tarjeta bancaria requerida.", color: "#6c63ff" },
      { icon: "📊", title: "Explora tu Panel", desc: "El Panel es tu centro de control: sigue tus pedidos, consulta estadísticas, gestiona mensajes de contacto y configura tu tienda.", color: "#8b5cf6" },
      { icon: "🎨", title: "Crea tu tienda en Saasgenerator", desc: "Añade secciones (título, productos, galería, formulario de contacto...), personaliza colores y tipografía. Añade tus productos con nombre, precio y descripción.", color: "#a855f7" },
      { icon: "👁️", title: "Vista previa en tiempo real", desc: "Haz clic en ▶ Vista previa para ver tu tienda exactamente como la verán tus visitantes, en todos los idiomas disponibles.", color: "#ec4899", preview: true },
      { icon: "🚀", title: "Publica tu tienda", desc: "Elige un nombre de slug único (ej: mi-tienda) y publica. Tu tienda estará en línea y accesible de inmediato.", color: "#f59e0b" },
      { icon: "💳", title: "Prueba los pagos Stripe", desc: "En modo gratis, usa los datos de la tarjeta de prueba Stripe a continuación para simular una compra completa sin cobrar dinero real.", color: "#10b981", stripeTest: true },
    ],
    proSteps: [
      { icon: "👤", title: "Crea tu cuenta", desc: "Regístrate con tu email. Accede al Plan Pro desde tu Panel suscribiéndote al plan mensual.", color: "#f59e0b" },
      { icon: "📊", title: "Panel — Resumen", desc: "Centraliza todo: pedidos Pro y Gratis, mensajes de clientes, estadísticas de ventas, y gestión de copias de seguridad de Firestore.", color: "#f97316" },
      { icon: "🎨", title: "Construye tu tienda", desc: "Usa Saasgenerator para crear todas tus páginas: inicio, productos, galería, contacto. Cada guardado sincroniza automáticamente tu catálogo de productos.", color: "#ef4444" },
      { icon: "🔗", title: "Conecta Stripe — Pagos reales", desc: "La conexión Stripe es el corazón del Plan Pro. Tus clientes pagan directamente a tu cuenta bancaria, con total seguridad.", color: "#8b5cf6", stripeConnect: true },
      { icon: "🌐", title: "Vincula tu dominio personalizado", desc: "Conecta tu propio nombre de dominio (ej: www.mi-tienda.com) para una imagen profesional.", color: "#6c63ff", domain: true },
      { icon: "👁️", title: "Vista previa y publicación", desc: "Previsualiza tu tienda final con tu dominio, tus productos reales y los pagos Stripe activados.", color: "#14b8a6", preview: true },
    ],
    freeLimits: [
      { ok: true,  label: "Tienda en línea" },
      { ok: true,  label: "Pagos de prueba Stripe" },
      { ok: true,  label: "Asistente de IA" },
      { ok: false, label: "Pagos reales" },
      { ok: false, label: "Dominio personalizado" },
      { ok: false, label: "Stripe Connect seguro" },
    ],
    proFeatures: [
      "Pagos reales vía Stripe Connect", "Fondos transferidos directamente a tu cuenta",
      "Dominio personalizado", "Asistente de IA multilingüe", "Copia de seguridad automática Firestore",
      "Gestión de pedidos y mensajes de clientes", "Catálogo de productos sincronizado", "Multilingüe (FR, EN, AR, ES)",
    ],
  },
}

const t = computed(() => TRANSLATIONS[lang.value] || TRANSLATIONS.fr)

const freeSteps   = computed(() => t.value.freeSteps)
const proSteps    = computed(() => t.value.proSteps)
const freeLimits  = computed(() => t.value.freeLimits)
const proFeatures = computed(() => t.value.proFeatures)
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
.guide-lang-sel { display: flex; gap: 4px; flex-shrink: 0; }
.guide-lang-flag {
  background: rgba(255,255,255,.06); border: 1px solid transparent;
  border-radius: 8px; padding: 5px 8px; font-size: 16px; line-height: 1;
  cursor: pointer; transition: .15s;
}
.guide-lang-flag:hover { background: rgba(255,255,255,.12); }
.guide-lang-active { border-color: #6c63ff; background: rgba(108,99,255,.2); }

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
