<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { db, auth } from "../firebase.js"
import { doc, getDoc, setDoc, collection, writeBatch, deleteDoc, getDocs, query, where } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth" 
import { stripeConfig, loadStripeSDK } from "./stripe.js"
import { translations, langs } from "../langues.js"
import { paypalConfig, loadPaypalSDK } from "./paypal.js"

const site = ref({
  legal: {
    mentions: "",
    cgv: "",
    privacy: "",
    privacyPolicy: "",
    remboursement: ""
  },
  pages: [{
    id: 1,
    name: "Accueil",
    style: {},
    sections: []
  }]
})

const mode = ref("edit")
const currentPageIndex = ref(0)
const activeSectionIndex = ref(null)
const isSaved = ref(true)
const isSaving = ref(false)
const currentUser = ref(null)
const userPlan    = ref("free")   // "free" | "pro" — chargé depuis Firestore
const showPageMenu = ref(false)
const sidebarTab = ref("sections")
const showNotif = ref(false)
const notifMsg = ref("")
const notifType = ref("success")
const renamingPageIndex = ref(null)
const showPaymentModal = ref(false)
const paymentModalSection = ref(null)
const paymentProvider = ref("stripe")
const paymentProcessing = ref(false)
const paymentSuccess = ref(false)
const showConfigEditor = ref(false)
const configEditorTarget = ref("stripe")
const configEditorContent = ref("")
const showExportModal  = ref(false)
const showLegalModal   = ref(false)
const showTrendModal   = ref(false)
const trendQuery       = ref("")
const trendLang        = ref("fr")
const trendResults     = ref([])
const trendLoading     = ref(false)
const trendError       = ref("")
const trendSelected    = ref(new Set())
const trendTargetSection = ref(null)
const trendMode        = ref("search")   // "search" | "url"
const scrapeUrl        = ref("")
const scrapeLoading    = ref(false)
const scrapeError      = ref("")
const scrapeResults    = ref([])
const scrapeSelected   = ref(new Set())
const legalTab         = ref("mentions") // mentions | cgv | privacy

// ===== I18N =====
const currentLang = ref("fr")
// langs importé depuis langues.js
const t = computed(() => translations[currentLang.value])

// translations importé depuis langues.js


const isRtl = computed(() => currentLang.value === "ar")

// ===== CART =====
const cart = ref([])
const showCart = ref(false)

const addToCart = (product) => {
  const existing = cart.value.find(i => i.id === product.id)
  if (existing) {
    existing.qty++
  } else {
    cart.value.push({ ...product, qty: 1 })
  }
  showCart.value = true
  notify(`🛒 ${product.name} ajouté au panier`)
}

const removeFromCart = (id) => {
  cart.value = cart.value.filter(i => i.id !== id)
}

const updateQty = (id, delta) => {
  const item = cart.value.find(i => i.id === id)
  if (!item) return
  item.qty = Math.max(1, item.qty + delta)
}

const cartTotal = computed(() => {
  return cart.value.reduce((sum, i) => sum + parseFloat(i.price||0) * i.qty, 0).toFixed(2)
})

const cartCount = computed(() => {
  return cart.value.reduce((sum, i) => sum + i.qty, 0)
})

const cartCurrency = computed(() => cart.value[0]?.currency || '€')

const checkoutCart = () => {
  showCart.value = false
  // Ouvrir la modale de paiement avec les totaux du panier
  paymentModalSection.value = {
    title: t.value.cartCheckout || 'Finaliser la commande',
    description: `${cartCount.value} article(s)`,
    amount: cartTotal.value,
    currency: cartCurrency.value,
  }
  paymentProvider.value = 'stripe'
  paymentSuccess.value = false
  paymentProcessing.value = false
  showPaymentModal.value = true
}

const emptyCart = () => { cart.value = [] }

// ===== SITE NAME =====
const siteName = ref("WellShoppings")

// ===== LOGO =====
const siteLogo = ref("")
const uploadLogo = (e) => {
  const file = e.target.files[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { siteLogo.value = ev.target.result }
  reader.readAsDataURL(file)
}

// ===== PUBLISH =====
const showPublishModal = ref(false)
const showPublicPreview = ref(false)
const publishAddress = ref("")
const publishDomain = ref("")
const publishStatus = ref("") // '' | 'published'
const dnsCopied = ref(false)
const showDnsInput = ref(false)
const customDns = ref({ ns1: "", ns2: "", ns3: "", ns4: "" })
const dnsSaved = ref(false)

const saveDnsRecords = () => {
  if (!customDns.value.ns1 || !customDns.value.ns2) {
    notify("Entrez au moins NS1 et NS2.", "error"); return
  }
  dnsSaved.value = true
  let txt = `=== DNS personnalisés pour ${publishDomain.value} ===\n`
  txt += `NS1: ${customDns.value.ns1}\n`
  txt += `NS2: ${customDns.value.ns2}\n`
  if (customDns.value.ns3) txt += `NS3: ${customDns.value.ns3}\n`
  if (customDns.value.ns4) txt += `NS4: ${customDns.value.ns4}\n`
  txt += `\nURL du site: ${publishInfo.value?.urlSlug}\n`
  const blob = new Blob([txt], { type: "text/plain" })
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
  a.download = "dns-config.txt"; a.click()
  notify("Configuration DNS sauvegardée ✓")
  showDnsInput.value = false
}
const publishInfo = ref(null)
// Slug déjà publié par ce compte (s'il existe) — utilisé pour orienter
// l'utilisateur vers un test de paiement réel plutôt que l'aperçu générique.
const publishedSlugValue = ref("")
// Avertissement affiché avant le test de paiement rapide : le rappelle
// que ce test (depuis /#/saasgenerator) n'est pas un vrai parcours client.
const showPaySlugWarning = ref(false)
const pendingPaymentSection = ref(null)

const publishSite = async () => {
  if (!publishAddress.value.trim()) { notify("Entrez une adresse pour le site.", "error"); return }
  if (!currentUser.value) { notify(t.value.connectedError, "error"); return }

  const uid    = currentUser.value.uid
  const slug   = publishAddress.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
  const domain = publishDomain.value.trim()

  // URL principale : /site/{uid} — route Vue Router dans SaasBuilder
  // URL slug (alias convivial) : /site/{slug} → résolu via collection slugs

  const urlUid  = `https://mronlinestores.com/#/site/${uid}`
  const urlSlug = `https://mronlinestores.com/#/${slug}`

  try {
    // 1. Sauvegarder siteData + slug dans le document de l'utilisateur
    const userRef = doc(db, "users", uid)
    const rawSiteData = JSON.parse(JSON.stringify(site.value))
    await setDoc(userRef, {
      siteData:  rawSiteData,
      siteName:  siteName.value,
      siteLogo:  siteLogo.value,
      siteTheme: (rawSiteData.theme || null),
      publishedSlug: slug,
      publishedAt: new Date().toISOString(),
      customDomain: domain || null,
    }, { merge: true })

    // 2. Créer l'entrée dans la collection publique slugs/{slug} → uid
    //    Cela permet à SaasBuilder de résoudre /#/nomchoisi → uid → siteData
    const slugRef = doc(db, "slugs", slug)
    await setDoc(slugRef, {
      uid,
      slug,
      siteName: siteName.value,
      customDomain: domain || null,
      createdAt: new Date().toISOString(),
    })

    // 3. Mettre à jour isSaved
    localStorage.setItem("siteDataPro", JSON.stringify(site.value))
    isSaved.value = true

    publishInfo.value = { slug, urlUid, urlSlug, domain, uid }
    publishStatus.value = "published"
    publishedSlugValue.value = slug

    // 4. Générer publier.txt
    let txt = `=== WellShoppings — Publication du site ===\n`
    txt += `Date       : ${new Date().toLocaleString()}\n`
    txt += `Nom du site: ${siteName.value}\n`
    txt += `Slug       : ${slug}\n`
    txt += `UID        : ${uid}\n\n`
    txt += `=== URLs d'accès (équivalentes) ===\n`
    txt += `URL slug   : ${urlSlug}\n`
    txt += `URL uid    : ${urlUid}\n`
    if (domain) {
      txt += `\n=== Domaine personnalisé ===\n`
      txt += `Domaine    : ${domain}\n\n`
      txt += `=== Configuration DNS ===\n`
      txt += `Type    Nom    Valeur\n`
      txt += `A       @      185.199.108.153\n`
      txt += `A       @      185.199.109.153\n`
      txt += `CNAME   www    musrh.github.io\n`
      txt += `TXT     @      saas-verify=${slug}\n`
    }
    txt += `\n=== Comment ça fonctionne ===\n`
    txt += `- Firestore: users/${uid}/siteData contient votre site\n`
    txt += `- Firestore: slugs/${slug} → pointe vers uid "${uid}"\n`
    txt += `- SaasBuilder résout /#/${slug} en chargeant slugs/${slug} → siteData\n`
    txt += `- Les deux URLs ci-dessus donnent accès au même site\n`
    txt += `\n=== Règles Firestore requises ===\n`
    txt += `match /slugs/{slug} { allow read: if true; allow write: if request.auth != null; }\n`

    const blob = new Blob([txt], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "publier.txt"
    a.click()

    notify(t.value.publishSuccess)
    // Ouvrir l'aperçu public après publication
    setTimeout(() => {
      showPublishModal.value = false
      showPublicPreview.value = true
    }, 800)
  } catch (e) {
    console.error("Erreur publication:", e)
    notify("Erreur de publication : " + e.message, "error")
  }
}


const copyDnsRecords = () => {
  const text = [
    `A       @    185.199.108.153`,
    `A       @    185.199.109.153`,
    `A       @    185.199.110.153`,
    `A       @    185.199.111.153`,
    `CNAME   www  musrh.github.io`,
  ].join("\n")
  navigator.clipboard.writeText(text)
  dnsCopied.value = true
  setTimeout(() => dnsCopied.value = false, 2000)
}

const currentPage = computed(() => site.value.pages[currentPageIndex.value] || site.value.pages[0])
const activeSection = computed(() => currentPage.value?.sections?.[activeSectionIndex.value])

onMounted(() => {
  // Restaurer depuis localStorage immédiatement (avant Firestore)
  const sn = localStorage.getItem("siteName")
  const sl = localStorage.getItem("siteLogo")
  if (sn) siteName.value = sn
  if (sl) siteLogo.value = sl
  let firestoreLoaded = false   // ← flag : charger Firestore UNE SEULE FOIS

  onAuthStateChanged(auth, async (user) => {
    if (!user) return
    currentUser.value = user
    await loadSavedConfigs()

    // Ne recharger Firestore que lors de la première auth
    // (évite d'écraser les modifs en cours si Firebase refresh le token)
    if (firestoreLoaded) return
    firestoreLoaded = true

    try {
      const docRef = doc(db, "users", user.uid)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const d = snap.data()
        if (d.siteData) {
          site.value = d.siteData
          // Toujours garantir les champs nouveaux après chargement Firestore
          if (!site.value.legal) site.value.legal = { mentions: "", cgv: "", privacy: "", privacyPolicy: "", remboursement: "" }
          if (!site.value.legal.privacyPolicy) site.value.legal.privacyPolicy = ""
          if (!site.value.legal.remboursement) site.value.legal.remboursement = ""
          if (!site.value.theme) site.value.theme = null
          // Garantir qu'au moins une page existe (sans imposer de sections)
          if (!Array.isArray(site.value.pages) || site.value.pages.length === 0) {
            site.value.pages = [{ id: Date.now(), name: "Accueil", style: {}, sections: [] }]
          }
        }
        if (d.siteName) siteName.value = d.siteName
        if (d.plan)     userPlan.value    = d.plan || "free"   // ← lire le vrai plan
        if (d.siteLogo) siteLogo.value = d.siteLogo
        if (d.publishedSlug) publishedSlugValue.value = d.publishedSlug
        // Pas de fallback localStorage : un nouveau propriétaire démarre avec un site vierge
      } else {
        // Nouveau propriétaire : on garde le site vide initialisé en ref()
        // (pas de récupération localStorage d'un autre compte)
      }
      // Après chargement, marquer comme sauvegardé (pas de faux "unsaved")
      isSaved.value = true
    } catch (e) {
      console.error("Erreur chargement Firestore :", e)
      notify(t.value.loadError, "error")
      const saved = localStorage.getItem("siteDataPro")
      if (saved) site.value = JSON.parse(saved)
    }
  })
})

watch(site, () => { isSaved.value = false }, { deep: true })
watch(siteName, (v) => { localStorage.setItem("siteName", v) })
watch(siteLogo, (v) => { localStorage.setItem("siteLogo", v) })
watch(currentPageIndex, () => { activeSectionIndex.value = null })

// Init Stripe Elements when payment modal opens on Stripe tab
watch([() => showPaymentModal.value, () => paymentProvider.value], ([modalOpen, provider]) => {
  if (modalOpen && provider === 'stripe') {
    stripeCardMounted.value = false
    setTimeout(() => initStripeElements(), 150)
  }
})

const notify = (msg, type = "success") => {
  notifMsg.value = msg; notifType.value = type; showNotif.value = true
  setTimeout(() => showNotif.value = false, 2800)
}

const fillMentions = () => {
  if (site.value.legal.mentions) return
  site.value.legal.mentions = `Éditeur : ${siteName.value}
Adresse : [Votre adresse]
Email : [Votre email]
Hébergeur : Vercel Inc. / Netlify Inc.
SIRET : [Numéro si applicable]
Directeur de publication : [Votre nom]`
}

const fillCgv = () => {
  if (site.value.legal.cgv) return
  site.value.legal.cgv = `Article 1 — Objet
Les présentes CGV régissent les ventes réalisées sur le site ${siteName.value}.

Article 2 — Prix
Les prix sont indiqués TTC. Nous nous réservons le droit de modifier nos prix à tout moment.

Article 3 — Paiement
Le paiement est sécurisé via Stripe et/ou PayPal. Aucune donnée bancaire n'est conservée.

Article 4 — Livraison
Les délais de livraison sont indiqués sur chaque fiche produit.

Article 5 — Rétractation
Conformément à la législation en vigueur, vous disposez de 14 jours ouvrables pour exercer votre droit de rétractation.

Article 6 — Litiges
En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.`
}

const fillPrivacy = () => {
  if (site.value.legal.privacy) return
  site.value.legal.privacy = `Politique de confidentialité — ${siteName.value}

1. Collecte des données
Nous collectons uniquement les données nécessaires : nom, email, adresse de livraison lors d'une commande.

2. Utilisation
Vos données sont utilisées exclusivement pour le traitement de vos commandes et ne sont jamais revendues.

3. Vos droits (RGPD)
Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
Contactez-nous : [Votre email]

4. Cookies
Ce site utilise uniquement des cookies fonctionnels indispensables à son bon fonctionnement.

5. Hébergement
Les données sont hébergées en Europe par des prestataires conformes au RGPD.`
}

const fillPrivacyPolicy = () => {
  if (site.value.legal.privacyPolicy) return
  site.value.legal.privacyPolicy = [
    "Privacy Policy — " + siteName.value,
    "",
    "1. Data Collection",
    "We only collect data necessary to process your orders: name, email, and delivery address.",
    "",
    "2. Use of Data",
    "Your data is used solely to process your orders and is never sold to third parties.",
    "",
    "3. Your Rights (GDPR)",
    "You have the right to access, correct, or delete your personal data.",
    "Contact us: [Your email]",
    "",
    "4. Cookies",
    "This site uses only functional cookies essential to its operation.",
    "",
    "5. Hosting",
    "Data is hosted in Europe by GDPR-compliant providers."
  ].join("\n")
}

const fillRemboursement = () => {
  if (site.value.legal.remboursement) return
  site.value.legal.remboursement = [
    "Politique de remboursement — " + siteName.value,
    "",
    "Délai de retour",
    "Vous disposez de 14 jours calendaires à compter de la réception pour exercer votre droit de retour.",
    "",
    "Conditions de retour",
    "L'article doit être retourné dans son état d'origine, non utilisé, dans son emballage d'origine.",
    "",
    "Procédure",
    "1. Contactez-nous à [Votre email] en indiquant votre numéro de commande.",
    "2. Nous vous communiquons l'adresse de retour.",
    "3. Expédiez l'article à vos frais.",
    "",
    "Remboursement",
    "Le remboursement est effectué sous 5 à 10 jours ouvrés après réception du retour, via le moyen de paiement initial.",
    "",
    "Exceptions",
    "Les articles personnalisés ou téléchargeables ne sont pas éligibles au retour."
  ].join("\n")
}


// ══ RECHERCHE PRODUITS TENDANCE ══════════════════════════════════
const searchTrendProducts = async () => {
  if (!trendQuery.value.trim()) return

  // Vérifier que la clé API Anthropic est configurée
  const apiKey = liveAnthropicConfig.value.apiKey?.trim()
  if (!apiKey || apiKey.startsWith("sk-ant-VOTRE")) {
    trendError.value = "Clé API Anthropic manquante. Cliquez sur ⚙ anthropic.js pour la configurer."
    return
  }

  trendLoading.value = true
  trendError.value   = ""
  trendResults.value = []
  trendSelected.value = new Set()

  const langInstructions = {
    fr: "Réponds en français. Les noms et descriptions des produits doivent être en français.",
    en: "Reply in English. Product names and descriptions must be in English.",
    ar: "أجب بالعربية. يجب أن تكون أسماء المنتجات وأوصافها بالعربية.",
    es: "Responde en español. Los nombres y descripciones deben estar en español."
  }

  const prompt = `Tu es un expert en e-commerce et tendances produits.
Recherche sur internet les produits les plus tendance et populaires dans la niche : "${trendQuery.value}".
${langInstructions[trendLang.value] || langInstructions.fr}

Retourne UNIQUEMENT un tableau JSON valide (sans texte autour, sans markdown) avec 8 produits au format :
[
  {
    "name": "Nom du produit",
    "description": "Description courte et accrocheuse (1-2 phrases)",
    "price": "29.99",
    "currency": "€",
    "badge": "Tendance",
    "why": "Pourquoi ce produit est tendance en 1 phrase"
  }
]

Les prix doivent être réalistes pour la niche. Les badges peuvent être : Tendance, Nouveau, Best-seller, Promo, Populaire, Viral.`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }]
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    // Extraire le texte de la réponse (ignorer les blocs tool_use/tool_result)
    const textBlock = data.content?.find(b => b.type === "text")
    if (!textBlock) throw new Error("Pas de réponse texte reçue")

    // Parser le JSON
    const raw = textBlock.text.replace(/^[\s\S]*?(\[)/m, "[").replace(/\][^]*$/, "]")
    const products = JSON.parse(raw)

    trendResults.value = products.map((p, i) => ({
      id: Date.now() + i,
      name:        p.name        || "Produit",
      description: p.description || "",
      price:       p.price       || "0.00",
      currency:    p.currency    || "€",
      badge:       p.badge       || "",
      why:         p.why         || "",
      image:       ""
    }))
  } catch(e) {
    trendError.value = "Erreur : " + e.message
  } finally {
    trendLoading.value = false
  }
}

const toggleTrendSelect = (id) => {
  const s = new Set(trendSelected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  trendSelected.value = s
}

const selectAllTrend = () => {
  trendSelected.value = new Set(trendResults.value.map(p => p.id))
}

const importTrendProducts = () => {
  if (!trendTargetSection.value) {
    // Chercher ou créer une section products sur la page courante
    let sec = currentPage.value.sections.find(s => s.type === "products")
    if (!sec) {
      addSection("products")
      sec = currentPage.value.sections[currentPage.value.sections.length - 1]
    }
    trendTargetSection.value = sec
  }

  const toImport = trendResults.value.filter(p => trendSelected.value.has(p.id))
  toImport.forEach(p => {
    trendTargetSection.value.items.push({
      id:          Date.now() + Math.random(),
      name:        p.name,
      description: p.description,
      price:       p.price,
      currency:    p.currency,
      badge:       p.badge,
      image:       ""
    })
  })

  showTrendModal.value = false
  trendSelected.value  = new Set()
  trendTargetSection.value = null
  // Notification
  showNotif.value  = true
  notifMsg.value   = toImport.length + " produit(s) importé(s) dans le catalogue !"
  notifType.value  = "success"
  setTimeout(() => { showNotif.value = false }, 3000)
}


// ══ SCRAPER PRODUIT DEPUIS URL ════════════════════════════════════
const scrapeProductFromUrl = async () => {
  const url = scrapeUrl.value.trim()
  if (!url) return

  const apiKey = liveAnthropicConfig.value.apiKey?.trim()
  if (!apiKey || apiKey.startsWith("sk-ant-VOTRE")) {
    scrapeError.value = "Clé API Anthropic manquante. Cliquez sur ⚙ Configurer anthropic.js."
    return
  }

  scrapeLoading.value = true
  scrapeError.value   = ""
  scrapeResults.value = []
  scrapeSelected.value = new Set()

  const prompt = `Visite cette page web et extrais TOUS les produits présents : ${url}

Pour chaque produit trouvé sur cette page, retourne un tableau JSON valide (sans texte autour, sans markdown) :
[
  {
    "name": "Nom exact du produit",
    "description": "Description courte (1-2 phrases)",
    "price": "29.99",
    "currency": "€",
    "badge": "",
    "image": "URL de l'image principale si disponible, sinon chaine vide"
  }
]

Règles :
- Extrais TOUS les produits visibles sur la page (jusqu'à 12 maximum)
- Si la page ne contient qu'un seul produit, retourne un tableau avec un seul élément
- Prix sans symbole de devise dans le champ "price", devise dans "currency"
- Si le prix n'est pas visible, mets "0.00"
- Badge peut être : Nouveau, Promo, Best-seller, ou vide
- Image : URL absolue de l'image si possible, sinon ""
- Retourne UNIQUEMENT le tableau JSON, rien d'autre`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }]
      })
    })

    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    const textBlock = data.content?.find(b => b.type === "text")
    if (!textBlock) throw new Error("Aucune réponse reçue — le site est peut-être inaccessible.")

    // Extraire le JSON du texte
    const raw = textBlock.text
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error("Aucun produit trouvé sur cette page.")

    const products = JSON.parse(match[0])
    if (!products.length) throw new Error("Aucun produit détecté sur cette page.")

    scrapeResults.value = products.map((p, i) => ({
      id:          Date.now() + i,
      name:        p.name        || "Produit",
      description: p.description || "",
      price:       String(p.price || "0.00"),
      currency:    p.currency    || "€",
      badge:       p.badge       || "",
      image:       p.image       || "",
    }))

    // Tout sélectionner par défaut
    scrapeSelected.value = new Set(scrapeResults.value.map(p => p.id))

  } catch(e) {
    scrapeError.value = "Erreur : " + e.message
  } finally {
    scrapeLoading.value = false
  }
}

const toggleScrapeSelect = (id) => {
  const s = new Set(scrapeSelected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  scrapeSelected.value = s
}

const importScrapeProducts = () => {
  let sec = trendTargetSection.value
  if (!sec) {
    addSection("products")
    sec = currentPage.value.sections[currentPage.value.sections.length - 1]
  }
  const toImport = scrapeResults.value.filter(p => scrapeSelected.value.has(p.id))
  toImport.forEach(p => {
    sec.items.push({
      id:          Date.now() + Math.random(),
      name:        p.name,
      description: p.description,
      price:       p.price,
      currency:    p.currency,
      badge:       p.badge,
      image:       p.image,
    })
  })
  showTrendModal.value  = false
  scrapeSelected.value  = new Set()
  trendTargetSection.value = null
  showNotif.value = true
  notifMsg.value  = toImport.length + " produit(s) importé(s) depuis le site !"
  notifType.value = "success"
  setTimeout(() => { showNotif.value = false }, 3000)
}


// ══ THÈMES ════════════════════════════════════════════════════════
const BUILTIN_THEMES = [
  { id:"default",   name:"Violet Pro",    accent:"#6c63ff", accentHover:"#5b52ee", bg:"#ffffff", text:"#111111", nav:"#1a1a2e",   navText:"#ffffff", btnRadius:8,  font:"'DM Sans',sans-serif",       fontDisplay:"DM Sans" },
  { id:"ocean",     name:"Océan",         accent:"#0ea5e9", accentHover:"#0284c7", bg:"#f0f9ff", text:"#0c4a6e", nav:"#0c4a6e",   navText:"#ffffff", btnRadius:10, font:"'Inter',sans-serif",           fontDisplay:"Inter" },
  { id:"forest",    name:"Forêt",         accent:"#16a34a", accentHover:"#15803d", bg:"#f0fdf4", text:"#14532d", nav:"#14532d",   navText:"#ffffff", btnRadius:6,  font:"'Poppins',sans-serif",         fontDisplay:"Poppins" },
  { id:"sunset",    name:"Coucher Soleil",accent:"#f97316", accentHover:"#ea6c10", bg:"#fff7ed", text:"#431407", nav:"#431407",   navText:"#ffffff", btnRadius:12, font:"'Nunito',sans-serif",          fontDisplay:"Nunito" },
  { id:"rose",      name:"Rose",          accent:"#e11d48", accentHover:"#be123c", bg:"#fff1f2", text:"#881337", nav:"#881337",   navText:"#ffffff", btnRadius:20, font:"'Playfair Display',serif",     fontDisplay:"Playfair Display" },
  { id:"midnight",  name:"Minuit",        accent:"#8b5cf6", accentHover:"#7c3aed", bg:"#0f0f1a", text:"#e2e8f0", nav:"#0a0a14",  navText:"#e2e8f0", btnRadius:8,  font:"'Space Grotesk',sans-serif",   fontDisplay:"Space Grotesk" },
  { id:"sand",      name:"Sable",         accent:"#d97706", accentHover:"#b45309", bg:"#fffbeb", text:"#451a03", nav:"#451a03",   navText:"#fffbeb", btnRadius:4,  font:"'Lora',serif",                 fontDisplay:"Lora" },
  { id:"slate",     name:"Ardoise",       accent:"#475569", accentHover:"#334155", bg:"#f8fafc", text:"#0f172a", nav:"#1e293b",   navText:"#f1f5f9", btnRadius:6,  font:"'Roboto',sans-serif",          fontDisplay:"Roboto" },
]

const activeThemeId  = ref(site.value.theme?.id || "default")
const showThemePanel = ref(false)
const importThemeUrl = ref("")
const importThemeLoading = ref(false)
const importThemeError   = ref("")
const customTheme = ref({
  id: "custom", name: "Mon thème",
  accent: "#6c63ff", accentHover: "#5b52ee",
  bg: "#ffffff", text: "#111111",
  nav: "#1a1a2e", navText: "#ffffff",
  btnRadius: 8, font: "'DM Sans',sans-serif", fontDisplay: "DM Sans"
})

const applyThemeToSite = (theme) => {
  activeThemeId.value = theme.id
  site.value.theme = { ...theme }
  // Appliquer les variables CSS au builder (aperçu immédiat)
  const r = document.documentElement
  r.style.setProperty("--theme-accent",      theme.accent)
  r.style.setProperty("--theme-accent-hover",theme.accentHover)
  r.style.setProperty("--theme-bg",          theme.bg)
  r.style.setProperty("--theme-text",        theme.text)
  r.style.setProperty("--theme-nav",         theme.nav)
  r.style.setProperty("--theme-nav-text",    theme.navText)
  r.style.setProperty("--theme-btn-radius",  theme.btnRadius + "px")
  r.style.setProperty("--theme-body-font",   theme.font)
  // Mettre à jour le style de la page courante pour cohérence
  if (!currentPage.value.style) currentPage.value.style = {}
  currentPage.value.style.backgroundColor = theme.bg
  currentPage.value.style.color           = theme.text
  currentPage.value.style.fontFamily      = theme.font
  isSaved.value = false
}

const importThemeFromUrl = async () => {
  const url = importThemeUrl.value.trim()
  if (!url) return
  const apiKey = liveAnthropicConfig.value.apiKey?.trim()
  if (!apiKey || apiKey.startsWith("sk-ant-VOTRE")) {
    importThemeError.value = "Clé API Anthropic requise pour importer un thème."
    return
  }
  importThemeLoading.value = true
  importThemeError.value   = ""
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content:
          `Visite ce site web et extrait sa palette de couleurs et son style : ${url}
Retourne UNIQUEMENT un objet JSON (sans texte, sans markdown) :
{
  "name": "Nom du thème inspiré du site",
  "accent": "#hexcolor principalement utilisé pour les boutons/CTA",
  "accentHover": "#hexcolor légèrement plus foncé que accent",
  "bg": "#hexcolor couleur de fond principale",
  "text": "#hexcolor couleur de texte principale",
  "nav": "#hexcolor couleur de la navbar/header",
  "navText": "#hexcolor couleur du texte de la navbar",
  "btnRadius": nombre entier (rayon des boutons en px, entre 0 et 24),
  "font": "nom de la font principale avec fallback CSS complet",
  "fontDisplay": "nom court de la font pour affichage"
}`
        }]
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    const textBlock = data.content?.find(b => b.type === "text")
    if (!textBlock) throw new Error("Pas de réponse")
    const match = textBlock.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("Format invalide")
    const imported = JSON.parse(match[0])
    imported.id = "imported_" + Date.now()
    customTheme.value = { ...customTheme.value, ...imported }
    applyThemeToSite(customTheme.value)
    importThemeError.value = ""
    showNotif.value = true; notifMsg.value = "Thème importé depuis " + url.split("/")[2]; notifType.value = "success"
    setTimeout(() => { showNotif.value = false }, 3000)
  } catch(e) {
    importThemeError.value = "Erreur : " + e.message
  } finally {
    importThemeLoading.value = false
  }
}

// ── Déconnexion ──────────────────────────────────────────────────
const signOutUser = async () => {
  try {
    // Réinitialiser l'état local immédiatement
    currentUser.value = null
    userPlan.value    = "free"
    firestoreLoaded   = false

    // signOut Firebase
    await signOut(auth)
  } catch(e) {
    console.error("signOut:", e.message)
  } finally {
    // Forcer un rechargement complet de la page sur /auth
    // setTimeout pour laisser Firebase terminer le signOut
    setTimeout(() => {
      window.location.replace("/#/")
    }, 300)
  }
}

const saveSite = async () => {
  if (isSaving.value) return
  // Si currentUser pas encore chargé → attendre jusqu'à 3s
  if (!currentUser.value) {
    let waited = 0
    await new Promise(resolve => {
      const interval = setInterval(() => {
        waited += 100
        if (currentUser.value || waited >= 3000) {
          clearInterval(interval)
          resolve()
        }
      }, 100)
    })
  }
  if (!currentUser.value) { notify(t.value.connectedError, "error"); return }
  isSaving.value = true
  try {
    const uid     = currentUser.value.uid
    const docRef  = doc(db, "users", uid)
    const rawSite = JSON.parse(JSON.stringify(site.value))

    // 1. Sauvegarder siteData dans users/{uid}
    await setDoc(docRef, {
      siteData:  rawSite,
      siteName:  siteName.value,
      siteLogo:  siteLogo.value,
      siteTheme: rawSite.theme || null,
    }, { merge: true })
    localStorage.setItem("siteDataPro", JSON.stringify(rawSite))

    // 2. Synchroniser prodinfos — extraire tous les produits du siteData
    await syncProdinfos(uid, rawSite)

    isSaved.value = true
    notify(t.value.saved)
  } catch (e) {
    console.error("Erreur sauvegarde :", e)
    notify(t.value.saveError, "error")
  } finally { isSaving.value = false }
}

// Synchroniser la collection prodinfos depuis siteData
const syncProdinfos = async (uid, rawSite) => {
  try {
    // Extraire tous les produits de toutes les pages/sections
    const produits = []
    ;(rawSite.pages || []).forEach(page => {
      ;(page.sections || []).forEach(section => {
        if (section.type === "products" && Array.isArray(section.items)) {
          section.items.forEach(p => {
            if (p.name || p.nom) produits.push(p)
          })
        }
      })
    })

    // Lire les produits existants dans prodinfos pour ce store
    const existingSnap = await getDocs(
      query(collection(db, "prodinfos"), where("ownerUid", "==", uid))
    )
    const existingIds = new Set(existingSnap.docs.map(d => d.id))

    // Batch write — max 500 ops par batch
    const batch     = writeBatch(db)
    const newIds    = new Set()

    produits.forEach((p, idx) => {
      // ID stable basé sur le nom du produit
      const prodId = `${uid}_${(p.name || p.nom || idx).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}`
      newIds.add(prodId)
      const ref = doc(db, "prodinfos", prodId)
      batch.set(ref, {
        ownerUid:    uid,
        storeName:   siteName.value || "",
        name:        p.name        || p.nom         || "",
        description: p.description || p.desc        || "",
        price:       p.price       !== undefined ? p.price : (p.prix ?? 0),
        currency:    p.currency    || p.devise       || "€",
        badge:       p.badge       || "",
        image:       p.image       || "",
        stock:       p.stock       !== undefined ? p.stock : "disponible",
        updatedAt:   new Date().toISOString(),
      }, { merge: true })
    })

    // Supprimer les produits qui n'existent plus dans siteData
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        batch.delete(doc(db, "prodinfos", id))
      }
    })

    await batch.commit()
    console.log(`✅ prodinfos synchronisé: ${produits.length} produits pour ${uid}`)
  } catch(e) {
    console.warn("syncProdinfos:", e.message)
    // Non bloquant — siteData est déjà sauvegardé
  }
}

const goToPage = (i) => { currentPageIndex.value = i; activeSectionIndex.value = null; showPageMenu.value = false }

const addPage = () => {
  site.value.pages.push({ id: Date.now(), name: "Nouvelle page", style: {}, sections: [] })
  currentPageIndex.value = site.value.pages.length - 1
  renamingPageIndex.value = site.value.pages.length - 1
}

const deletePage = (i) => {
  if (site.value.pages.length === 1) { notify(t.value.keepOnePage, "error"); return }
  site.value.pages.splice(i, 1)
  currentPageIndex.value = Math.max(0, Math.min(i, site.value.pages.length - 1))
  activeSectionIndex.value = null
}

const sectionTypes = computed(() => [
  { key: "hero",     label: "Hero",        icon: "⚡",  desc: t.value.sHero },
  { key: "text",     label: t.value.sections==="الأقسام"?"نص":"Texte", icon: "📝", desc: t.value.sText },
  { key: "image",    label: "Image",       icon: "🖼️",  desc: t.value.sImage },
  { key: "gallery",  label: t.value.galleryLabel, icon: "🎨", desc: t.value.sGallery },
  { key: "video",    label: t.value.videoLabel,   icon: "▶️", desc: t.value.sVideo },
  { key: "products", label: t.value.productsLabel.split(" ")[0], icon: "🛍️", desc: t.value.sProducts },
  { key: "features", label: "Features",    icon: "✦",   desc: t.value.sFeatures },
  // { key: "payment", ... } masqué — Stripe Connect
  { key: "form",     label: t.value.contactLabel.split(" ")[0], icon: "✉️", desc: t.value.sForm },
  { key: "divider",  label: t.value.publish==="نشر"?"فاصل":"Séparateur", icon: "—", desc: t.value.sDivider },
])

const sectionDefaults = {
  hero:     { type: "hero", content: "Votre titre principal.", subtitle: "Sous-titre accrocheur.", cta: "Commencer", style: {} },
  text:     { type: "text", content: "Votre texte ici...", style: {} },
  image:    { type: "image", url: "", alt: "", style: {} },
  gallery:  { type: "gallery", images: [], columns: 3, style: {} },
  video:    { type: "video", url: "", title: "Ma vidéo", style: {} },
  products: { type: "products", items: [
    { id: 1, name: "Produit 1", price: "29.99", currency: "€", image: "", description: "Description du produit", badge: "" },
    { id: 2, name: "Produit 2", price: "49.99", currency: "€", image: "", description: "Description du produit", badge: "Nouveau" },
    { id: 3, name: "Produit 3", price: "19.99", currency: "€", image: "", description: "Description du produit", badge: "Promo" },
  ], style: {} },
  features: { type: "features", items: [
    { icon: "⚡", title: "Rapide", desc: "Performance optimale" },
    { icon: "🔒", title: "Sécurisé", desc: "Données protégées" },
    { icon: "🎨", title: "Élégant", desc: "Design soigné" }
  ], style: {} },
  payment:  { type: "payment", title: "Finaliser l'achat", amount: "29.99", currency: "€", description: "Accès Premium — 1 mois", style: {} },
  form:     { type: "form", style: {} },
  divider:  { type: "divider", style: {} }
}

const addSection = (key) => {
  currentPage.value.sections.push({ id: Date.now(), ...JSON.parse(JSON.stringify(sectionDefaults[key])) })
}
const deleteSection = (i) => { currentPage.value.sections.splice(i, 1); activeSectionIndex.value = null }
const moveSection = (i, dir) => {
  const arr = currentPage.value.sections; const j = i + dir
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

const uploadImage = (e, section) => {
  const file = e.target.files[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { section.url = ev.target.result }
  reader.readAsDataURL(file)
}

const uploadGalleryImage = (e, section) => {
  Array.from(e.target.files).forEach(file => {
    const reader = new FileReader()
    reader.onload = (ev) => { section.images.push({ id: Date.now() + Math.random(), url: ev.target.result, alt: file.name }) }
    reader.readAsDataURL(file)
  })
}

const removeGalleryImage = (section, idx) => { section.images.splice(idx, 1) }

const uploadProductImage = (e, product) => {
  const file = e.target.files[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { product.image = ev.target.result }
  reader.readAsDataURL(file)
}

const getEmbedUrl = (url) => {
  if (!url) return ""
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return url
}

const addProduct = (section) => {
  section.items.push({ id: Date.now(), name: "Nouveau produit", price: "0.00", currency: "€", image: "", description: "Description...", badge: "" })
}
const removeProduct = (section, i) => { section.items.splice(i, 1) }

const openPaymentModal = (section) => {
  pendingPaymentSection.value = section
  showPaySlugWarning.value = true
}

// Lance effectivement le test de paiement rapide (comportement historique,
// inchangé) une fois que l'utilisateur a vu l'avertissement et choisi de
// continuer malgré tout.
const proceedWithQuickPaymentTest = () => {
  showPaySlugWarning.value = false
  const section = pendingPaymentSection.value
  paymentModalSection.value = section; paymentSuccess.value = false
  paymentProcessing.value = false; showPaymentModal.value = true
}

const stripeInstance = ref(null)
const stripeElements = ref(null)
const stripeCardElement = ref(null)
const stripeCardMounted = ref(false)

const initStripeElements = async () => {
  try {
    const stripe = await loadStripeSDK(liveStripeConfig.value.publishableKey)
    stripeInstance.value = stripe
    const elements = stripe.elements()
    stripeElements.value = elements
    // Mount card element after DOM is ready
    await new Promise(r => setTimeout(r, 100))
    const cardEl = document.getElementById("stripe-card-element")
    if (cardEl && !stripeCardMounted.value) {
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "16px",
            color: "#f0f0f0",
            fontFamily: "'DM Sans', sans-serif",
            "::placeholder": { color: "#5a5a6a" },
          },
          invalid: { color: "#ef4444" },
        },
        hidePostalCode: true,
      })
      card.mount(cardEl)
      stripeCardElement.value = card
      stripeCardMounted.value = true
    }
  } catch(e) {
    console.error("Stripe init error:", e)
    notify("Erreur initialisation Stripe", "error")
  }
}

const processStripePayment = async () => {
  paymentProcessing.value = true
  try {
    const cfg = liveStripeConfig.value
    // If no real key configured, show error
    if (!cfg.publishableKey || cfg.publishableKey.includes("VOTRE_CLE")) {
      notify("⚠️ Configurez votre clé Stripe (stripe.js)", "error")
      paymentProcessing.value = false; return
    }
    if (!cfg.backendUrl || cfg.backendUrl.includes("votre-backend")) {
      notify("⚠️ Configurez votre backendUrl dans stripe.js", "error")
      paymentProcessing.value = false; return
    }
    const stripe = stripeInstance.value
    const card = stripeCardElement.value
    if (!stripe || !card) {
      notify("Stripe non initialisé", "error")
      paymentProcessing.value = false; return
    }
    // 1. Create PaymentIntent on backend
    const amount = Math.round(parseFloat(paymentModalSection.value?.amount || "0") * 100)
    // Construire les items du panier pour le backend
    const orderItems = cart.value.length > 0
      ? cart.value.map(i => ({ nom: i.name, prix: parseFloat(i.price), quantity: i.qty }))
      : [{ nom: paymentModalSection.value?.title || "Commande", prix: parseFloat(paymentModalSection.value?.amount || 0), quantity: 1 }]
    const res = await fetch(cfg.backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency: cfg.currency || "eur",
        description: paymentModalSection.value?.description || "Commande",
        items: orderItems,
        storeName: cfg.storeName || siteName.value,
        uid: currentUser.value?.uid,
      }),
    })
    if (!res.ok) throw new Error(`Backend error: ${res.status}`)
    const { clientSecret } = await res.json()
    // 2. Confirm payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    })
    if (error) throw new Error(error.message)
    if (paymentIntent.status === "succeeded") {
      paymentSuccess.value = true
      notify("✓ Paiement réussi !")
    }
  } catch (e) {
    notify("Erreur Stripe : " + e.message, "error")
    console.error(e)
  } finally { paymentProcessing.value = false }
}

const processPaypalPayment = async () => {
  paymentProcessing.value = true
  try {
    const cfg = livePaypalConfig.value
    if (!cfg.clientId || cfg.clientId.includes("VOTRE_CLIENT_ID")) {
      notify("⚠️ Configurez votre Client ID PayPal (paypal.js)", "error")
      paymentProcessing.value = false; return
    }
    // Load PayPal SDK dynamically with the live clientId
    if (!window.paypal) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.src = `https://www.paypal.com/sdk/js?client-id=${cfg.clientId}&currency=${cfg.currency || "EUR"}`
        script.onload = resolve; script.onerror = reject
        document.head.appendChild(script)
      })
    }
    // Render PayPal buttons in #paypal-button-container
    await new Promise(r => setTimeout(r, 100))
    const container = document.getElementById("paypal-button-container")
    if (container && container.innerHTML === "") {
      window.paypal.Buttons({
        createOrder: async () => {
          if (cfg.createOrderUrl && !cfg.createOrderUrl.includes("votre-backend")) {
            const res = await fetch(cfg.createOrderUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: paymentModalSection.value?.amount,
                currency: cfg.currency || "EUR",
              }),
            })
            const data = await res.json()
            return data.orderID
          }
          return null
        },
        onApprove: async (data) => {
          if (cfg.captureOrderUrl && !cfg.captureOrderUrl.includes("votre-backend")) {
            await fetch(cfg.captureOrderUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderID: data.orderID }),
            })
          }
          paymentSuccess.value = true
          notify("✓ Paiement PayPal réussi !")
          paymentProcessing.value = false
        },
        onError: (err) => {
          notify("Erreur PayPal : " + err, "error")
          paymentProcessing.value = false
        }
      }).render("#paypal-button-container")
    }
    paymentProcessing.value = false
  } catch (e) {
    notify("Erreur PayPal : " + e.message, "error")
    paymentProcessing.value = false
  }
}

// Live config objects du STORE (propres à chaque propriétaire)
// Ces configs sont SÉPARÉES de stripe.js/paypal.js qui servent
// pour les paiements des plans vers Sassbuilder
const liveStripeConfig = ref({
  publishableKey: "",
  backendUrl: "",
  currency: "eur",
  storeName: "",
  successUrl: "",
  cancelUrl: "",
  mode: "test",
})
const livePaypalConfig = ref({
  clientId: "",
  mode: "sandbox",
  currency: "EUR",
  locale: "fr_FR",
  createOrderUrl: "",
  captureOrderUrl: "",
  successUrl: "",
  brandName: "",
})
const liveAnthropicConfig = ref({
  apiKey: "",
})

// Charger la config paiement du store depuis Firestore
const loadSavedConfigs = async () => {
  if (!currentUser.value) return
  try {
    const { doc: fsDoc, getDoc: fsGet } = await import("firebase/firestore")
    // Chercher dans users/{uid}/storePaymentConfig
    const userSnap = await fsGet(fsDoc(db, "users", currentUser.value.uid))
    if (userSnap.exists()) {
      const d = userSnap.data()
      if (d.storePaymentConfig?.stripe) {
        liveStripeConfig.value = { ...liveStripeConfig.value, ...d.storePaymentConfig.stripe }
      }
      if (d.storePaymentConfig?.paypal) {
        livePaypalConfig.value = { ...livePaypalConfig.value, ...d.storePaymentConfig.paypal }
      }
      if (d.storePaymentConfig?.anthropic) {
        liveAnthropicConfig.value = { ...liveAnthropicConfig.value, ...d.storePaymentConfig.anthropic }
      }
    }
  } catch(e) { console.warn("Config load error:", e) }
}

const openConfigEditor = (target) => {
  configEditorTarget.value = target
  // Auto-générer les URLs selon le slug publié du store
  const uid  = currentUser.value?.uid || ""
  const slug = publishAddress.value?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || uid
  const base = "https://mronlinestores.com/#"

  if (target === "stripe") {
    const cfg = liveStripeConfig.value
    // Si pas d'URLs configurées, générer automatiquement
    // Stripe supprime tout après # → URL racine simple
    // La détection du retour Stripe se fait dans main.js de SaasBuilder
    const origin = "https://mronlinestores.com"
    const successUrl = cfg.successUrl || `${origin}/`
    const cancelUrl  = cfg.cancelUrl  || `${origin}/`
    configEditorContent.value =
`// ============================================================
//  Config Stripe de VOTRE STORE
//  Ces paramètres permettent à vos CLIENTS de vous payer.
//  Différent de stripe.js (qui sert pour les plans Sassbuilder)
// ============================================================
{
  "publishableKey": "${cfg.publishableKey || "pk_test_VOTRE_CLE_PUBLIQUE"}",
  "backendUrl": "${cfg.backendUrl || "https://votre-backend.com/create-payment-intent"}",
  "currency": "${cfg.currency || "eur"}",
  "storeName": "${cfg.storeName || siteName.value}",
  "successUrl": "${successUrl}",
  "cancelUrl": "${cancelUrl}",
  "mode": "${cfg.mode || "test"}"
}`
  } else {
    const cfg = livePaypalConfig.value
    const origin2 = "https://mronlinestores.com"
    const successUrl = cfg.successUrl || `${origin2}/`
    configEditorContent.value =
`// ============================================================
//  Config PayPal de VOTRE STORE
//  Vos clients vous paient via votre propre compte PayPal.
// ============================================================
{
  "clientId": "${cfg.clientId || "VOTRE_CLIENT_ID_PAYPAL"}",
  "mode": "${cfg.mode || "sandbox"}",
  "currency": "${cfg.currency || "EUR"}",
  "locale": "${cfg.locale || "fr_FR"}",
  "createOrderUrl": "${cfg.createOrderUrl || "https://votre-backend.com/paypal/create-order"}",
  "captureOrderUrl": "${cfg.captureOrderUrl || "https://votre-backend.com/paypal/capture-order"}",
  "successUrl": "${successUrl}",
  "brandName": "${cfg.brandName || siteName.value}"
}`
  }
  if (target === "anthropic") {
    const cfg = liveAnthropicConfig.value
    configEditorContent.value =
`// ============================================================
//  Clé API Anthropic — Produits Tendance 🔥
//  Obtenez votre clé sur : https://console.anthropic.com/
//  Cette clé est stockée dans Firestore et n'est jamais partagée.
// ============================================================
{
  "apiKey": "${cfg.apiKey || "sk-ant-VOTRE_CLE_API_ICI"}"
}`
  }

  showConfigEditor.value = true
}

const saveConfigFile = async () => {
  if (!currentUser.value) { notify("Connectez-vous d'abord.", "error"); return }
  try {
    // Parser le JSON depuis le textarea
    const txt = configEditorContent.value
      .replace(/\/\/.*$/gm, "")      // supprimer commentaires
      .replace(/\/\*[\s\S]*?\*\//g, "") // commentaires bloc
      .trim()
    // Extraire le JSON entre { }
    const jsonMatch = txt.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Format invalide — doit contenir { ... }")
    const parsed = JSON.parse(jsonMatch[0])

    if (configEditorTarget.value === "stripe") {
      liveStripeConfig.value = { ...liveStripeConfig.value, ...parsed }
    } else if (configEditorTarget.value === "anthropic") {
      liveAnthropicConfig.value = { ...liveAnthropicConfig.value, ...parsed }
    } else {
      livePaypalConfig.value = { ...livePaypalConfig.value, ...parsed }
    }

    // Sauvegarder dans Firestore users/{uid}/storePaymentConfig
    const storePaymentConfig = {
      stripe:    { ...liveStripeConfig.value },
      paypal:    { ...livePaypalConfig.value },
      anthropic: { ...liveAnthropicConfig.value },
    }
    await setDoc(
      doc(db, "users", currentUser.value.uid),
      { storePaymentConfig },
      { merge: true }
    )

    notify(`✓ Config ${configEditorTarget.value} sauvegardée dans Firestore`)
    showConfigEditor.value = false
  } catch(e) {
    notify("Erreur : " + e.message, "error")
    console.error(e)
  }
}

const downloadConfigFile = () => {
  const blob = new Blob([configEditorContent.value], { type: "text/javascript" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = configEditorTarget.value === "stripe" ? "stripe.js" : "paypal.js"
  a.click()
  notify(`${configEditorTarget.value}.js téléchargé ✓`)
}

const renderSectionHTML = (s) => {
  const st = Object.entries(s.style||{}).map(([k,v])=>`${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';')
  if (s.type==="hero") return `<div class="hero" style="${st}"><h1>${s.content}</h1><p>${s.subtitle||''}</p>${s.cta?`<button class="cta">${s.cta}</button>`:''}</div>`
  if (s.type==="text") return `<div class="sec-text" style="${st}"><p>${s.content}</p></div>`
  if (s.type==="image") return s.url?`<div class="sec-image" style="${st}"><img src="${s.url}" alt="${s.alt||''}"/></div>`:''
  if (s.type==="gallery") return `<div class="gallery" style="${st}"><div class="gallery-grid" style="grid-template-columns:repeat(${s.columns||3},1fr)">${(s.images||[]).map(i=>`<img src="${i.url}" alt="${i.alt||''}"/>`).join('')}</div></div>`
  if (s.type==="video") return s.url?`<div class="video-wrap" style="${st}"><iframe src="${getEmbedUrl(s.url)}" allowfullscreen></iframe></div>`:''
  if (s.type==="products") return `<div class="products" style="${st}"><div class="products-grid">${(s.items||[]).map(p=>`<div class="product-card">${p.image?`<img src="${p.image}"/>`:`<div class="product-img-ph">🛍️</div>`}<div class="product-body">${p.badge?`<span class="badge">${p.badge}</span>`:''}<div class="product-name">${p.name}</div><div class="product-desc">${p.description||''}</div><div class="product-footer"><span class="product-price">${p.price}${p.currency}</span><button class="product-btn">Acheter</button></div></div></div>`).join('')}</div></div>`
  if (s.type==="features") return `<div class="features" style="${st}"><div class="features-grid">${(s.items||[]).map(it=>`<div class="feature-card"><span class="icon">${it.icon}</span><strong>${it.title}</strong><p>${it.desc}</p></div>`).join('')}</div></div>`
  if (s.type==="payment") return `<div class="payment-sec" style="${st}"><h2>${s.title||''}</h2><p>${s.description||''}</p><div class="payment-amount">${s.amount||'0'}${s.currency||'€'}</div><div class="pay-btns"><button class="pay-btn stripe">💳 Payer avec Stripe</button><button class="pay-btn paypal">🅿 Payer avec PayPal</button></div></div>`
  if (s.type==="form") return `<div class="form-sec" style="${st}"><h3>Contactez-nous</h3><input placeholder="Nom complet"/><input placeholder="Email"/><textarea rows="4" placeholder="Message..."></textarea><button>Envoyer →</button></div>`
  if (s.type==="divider") return `<hr class="divider" style="${st}"/>`
  return ''
}

// ── Générateur HTML complet (multi-pages, thème, responsive) ──
const buildSectionHtml = (s) => {
  const st = s.style ? Object.entries(s.style).map(([k,v]) => `${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';') : ''
  const inlineStyle = st ? ` style="${st}"` : ''

  if (s.type === 'hero') return `
    <section class="hero"${inlineStyle}>
      <h1>${(s.content||'').replace(/\n/g,'<br/>')}</h1>
      ${s.subtitle ? `<p>${s.subtitle}</p>` : ''}
      ${s.cta ? `<button class="cta-btn" onclick="return false">${s.cta}</button>` : ''}
    </section>`

  if (s.type === 'text') return `
    <section class="sec-text"${inlineStyle}><p>${(s.content||'').replace(/\n/g,'<br/>')}</p></section>`

  if (s.type === 'image') return s.url ? `
    <section class="sec-image"${inlineStyle}><img src="${s.url}" alt="${s.alt||''}" loading="lazy"/></section>` : ''

  if (s.type === 'gallery') {
    const imgs = (s.images||[]).map(img => `<div class="gallery-item"><img src="${img.url}" alt="${img.alt||''}" loading="lazy"/></div>`).join('')
    return `<section class="gallery"${inlineStyle}><div class="gallery-grid" style="grid-template-columns:repeat(${s.columns||3},1fr)">${imgs}</div></section>`
  }

  if (s.type === 'video' && s.url) {
    const embedUrl = s.url.includes('youtu') ?
      s.url.replace('watch?v=','embed/').replace('youtu.be/','www.youtube.com/embed/') :
      s.url.replace('vimeo.com/','player.vimeo.com/video/')
    return `<section class="sec-video"${inlineStyle}>
      ${s.title ? `<h3 class="video-title">${s.title}</h3>` : ''}
      <div class="video-wrap"><iframe src="${embedUrl}" allowfullscreen loading="lazy"></iframe></div>
    </section>`
  }

  if (s.type === 'products') {
    const cards = (s.items||[]).map(p => `
      <div class="product-card">
        <div class="product-img-wrap">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy"/>` : `<div class="product-img-ph">🛍️</div>`}
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name||''}</div>
          <div class="product-desc">${p.description||''}</div>
          <div class="product-footer">
            <span class="product-price">${p.price||''}${p.currency||'€'}</span>
            <button class="product-btn" onclick="addToCart(${JSON.stringify({name:p.name,price:p.price,currency:p.currency||'€',image:p.image||''}).replace(/"/g,'&quot;')})">🛒 Acheter</button>
          </div>
        </div>
      </div>`).join('')
    return `<section class="sec-products"${inlineStyle}><div class="products-grid">${cards}</div></section>`
  }

  if (s.type === 'features') {
    const feats = (s.items||[]).map(f => `
      <div class="feature-card">
        <span class="feat-icon">${f.icon||'⚡'}</span>
        <strong>${f.title||''}</strong><p>${f.desc||''}</p>
      </div>`).join('')
    return `<section class="sec-features"${inlineStyle}><div class="features-grid">${feats}</div></section>`
  }

  if (s.type === 'form') return `
    <section class="sec-form"${inlineStyle}>
      <h3>Contactez-nous</h3>
      <form onsubmit="handleForm(event)">
        <input type="text" placeholder="Votre nom" required/>
        <input type="email" placeholder="Votre email" required/>
        <textarea placeholder="Votre message" rows="4"></textarea>
        <button type="submit">Envoyer</button>
      </form>
    </section>`

  if (s.type === 'divider') return `<div class="sec-divider"${inlineStyle}><hr/></div>`

  return ''
}

const generateHtml = (pageIndex = 0) => {
  const th = currentTheme.value || builtinThemes[0]
  const accent     = th.accent     || '#6c63ff'
  const accentH    = th.accentHover|| '#4f46e5'
  const bg         = th.bg         || '#ffffff'
  const bgAlt      = th.bgAlt      || '#fafafa'
  const bgHero     = th.bgHero     || 'linear-gradient(135deg,#f8f7ff,#ede9fe)'
  const textColor  = th.text       || '#1a1a2e'
  const textSub    = th.textSub    || '#6b7280'
  const btnRadius  = th.btnRadius  || '10px'
  const btnPad     = th.btnPadding || '14px 32px'
  const cardRadius = th.cardRadius || '16px'
  const cardShadow = th.cardShadow || '0 2px 12px rgba(0,0,0,.06)'
  const heroFont   = th.heroFont   || "'Playfair Display',serif"
  const bodyFont   = th.bodyFont   || "'DM Sans',sans-serif"
  const navBg      = th.navBg      || '#ffffff'
  const navBorder  = th.navBorder  || '#e5e7eb'

  const pages     = site.value.pages || []
  const logo      = siteLogo.value
  const name      = siteName.value || 'Mon Site'

  // Navigation multi-pages
  const navLinks  = pages.map((p,i) =>
    `<a href="${pages.length > 1 ? `page-${i+1}.html` : '#'}" class="${pageIndex===i?'active':''}">${p.name}</a>`
  ).join('')

  const navLogoHtml = logo
    ? `<img src="logo.png" alt="${name}" class="nav-logo"/>`
    : `<span class="brand">${name}</span>`

  const currentPageData = pages[pageIndex] || pages[0]
  const pageStyle = currentPageData.style
    ? Object.entries(currentPageData.style).map(([k,v]) => `${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';')
    : ''

  const sectionsHtml = (currentPageData.sections || []).map(buildSectionHtml).join('\n')

  // Cart HTML
  const cartHtml = `
  <div id="cart-overlay" class="cart-overlay" style="display:none">
    <div class="cart-box">
      <div class="cart-header">
        <h3>🛒 Mon panier</h3>
        <button onclick="closeCart()">✕</button>
      </div>
      <div id="cart-items" class="cart-items"></div>
      <div class="cart-footer">
        <div class="cart-total">Total : <strong id="cart-total-val">0.00€</strong></div>
        <button class="cart-checkout-btn" onclick="checkout()">Finaliser l'achat</button>
      </div>
    </div>
  </div>
  <button id="cart-btn" class="cart-fab" onclick="toggleCart()" style="display:none">🛒 <span id="cart-count">0</span></button>`

  // JavaScript panier + navigation
  const scriptHtml = `<script>
// ── Panier ──────────────────────────────────────────────────
const cart = JSON.parse(localStorage.getItem('cart') || '[]')

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)) }
function updateCartUI() {
  const count = cart.reduce((s,i) => s + i.qty, 0)
  const total = cart.reduce((s,i) => s + parseFloat(i.price||0)*i.qty, 0)
  document.getElementById('cart-count').textContent = count
  document.getElementById('cart-btn').style.display = count > 0 ? 'flex' : 'none'
  document.getElementById('cart-total-val').textContent = total.toFixed(2) + '€'
  const list = document.getElementById('cart-items')
  list.innerHTML = cart.map((item,i) => \`
    <div class="cart-item">
      \${item.image ? \`<img src="\${item.image}" alt="\${item.name}"/>\` : '<div class="cart-item-ph">🛍️</div>'}
      <div class="cart-item-info">
        <div class="cart-item-name">\${item.name}</div>
        <div class="cart-item-price">\${item.price}\${item.currency||'€'}</div>
      </div>
      <div class="cart-item-qty">
        <button onclick="changeQty(\${i},-1)">−</button>
        <span>\${item.qty}</span>
        <button onclick="changeQty(\${i},1)">+</button>
      </div>
      <button class="cart-item-del" onclick="removeItem(\${i})">🗑</button>
    </div>\`).join('')
}
function addToCart(data) {
  const item = typeof data === 'string' ? JSON.parse(data.replace(/&quot;/g,'"')) : data
  const ex   = cart.find(i => i.name === item.name)
  if (ex) ex.qty++
  else cart.push({ ...item, qty: 1 })
  saveCart(); updateCartUI(); openCart()
}
function removeItem(i)    { cart.splice(i,1); saveCart(); updateCartUI() }
function changeQty(i, d)  { cart[i].qty = Math.max(1, cart[i].qty+d); saveCart(); updateCartUI() }
function toggleCart()     { document.getElementById('cart-overlay').style.display = document.getElementById('cart-overlay').style.display==='flex'?'none':'flex' }
function openCart()       { document.getElementById('cart-overlay').style.display='flex' }
function closeCart()      { document.getElementById('cart-overlay').style.display='none' }
function checkout()       { alert('Intégrez votre solution de paiement (Stripe, PayPal...) dans cette section.') }
function handleForm(e)    { e.preventDefault(); alert('Message envoyé ! (Configurez un endpoint email de votre côté)') }

// ── Navigation ───────────────────────────────────────────────
document.querySelectorAll('nav a').forEach(a => {
  a.addEventListener('click', e => {
    document.querySelectorAll('nav a').forEach(x => x.classList.remove('active'))
    e.currentTarget.classList.add('active')
  })
})

updateCartUI()
<\/script>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="description" content="${name}"/>
<title>${currentPageData.name || name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="style.css"/>
<style>
  :root {
    --accent:      ${accent};
    --accent-h:    ${accentH};
    --bg:          ${bg};
    --bg-alt:      ${bgAlt};
    --bg-hero:     ${bgHero};
    --text:        ${textColor};
    --text-sub:    ${textSub};
    --btn-radius:  ${btnRadius};
    --btn-pad:     ${btnPad};
    --card-radius: ${cardRadius};
    --card-shadow: ${cardShadow};
    --hero-font:   ${heroFont};
    --body-font:   ${bodyFont};
    --nav-bg:      ${navBg};
    --nav-border:  ${navBorder};
  }
  body { background: var(--bg); color: var(--text); font-family: var(--body-font); }
</style>
</head>
<body>
<nav>
  ${navLogoHtml}
  <div class="nav-links">${navLinks}</div>
  <button id="cart-btn" class="cart-fab" onclick="toggleCart()" style="display:none">🛒 <span id="cart-count">0</span></button>
</nav>
<main${pageStyle ? ` style="${pageStyle}"` : ''}>
${sectionsHtml}
</main>
${cartHtml}
<footer class="site-footer">
  <p>© ${new Date().getFullYear()} ${name} — Créé avec SaasBuilder</p>
</footer>
${scriptHtml}
</body>
</html>`
}

// CSS commun du site exporté
const generateCSS = () => {
  return `/* ═══ SaasBuilder — style.css ═══════════════════════════════ */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--body-font,'DM Sans',sans-serif);color:var(--text,#1a1a2e);background:var(--bg,#fff);min-height:100vh}

/* NAV */
nav{background:var(--nav-bg,#fff);border-bottom:1px solid var(--nav-border,#e5e7eb);padding:0 24px;height:60px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:100;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.nav-logo{height:36px;max-width:140px;object-fit:contain;border-radius:6px}
.brand{font-family:var(--hero-font);font-size:18px;color:var(--text);font-weight:600;margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px}
.nav-links{display:flex;gap:4px;flex:1;justify-content:center;overflow-x:auto;scrollbar-width:none}
.nav-links::-webkit-scrollbar{display:none}
.nav-links a{text-decoration:none;color:var(--text-sub,#6b7280);font-size:14px;font-weight:500;padding:7px 14px;border-radius:8px;transition:.15s;white-space:nowrap}
.nav-links a:hover,.nav-links a.active{background:var(--accent,#6c63ff);color:#fff}

/* HERO */
.hero{padding:clamp(60px,10vw,120px) clamp(20px,6vw,80px);background:var(--bg-hero);text-align:center}
.hero h1{font-family:var(--hero-font);font-size:clamp(28px,5vw,56px);color:var(--text);line-height:1.15;white-space:pre-line;margin-bottom:18px}
.hero p{font-size:clamp(15px,2.5vw,20px);color:var(--text-sub);margin-bottom:32px;max-width:600px;margin-left:auto;margin-right:auto}
.cta-btn{background:var(--accent);color:#fff;border:none;border-radius:var(--btn-radius,10px);padding:var(--btn-pad,14px 32px);font-size:clamp(14px,2vw,16px);font-weight:600;cursor:pointer;font-family:var(--body-font);transition:all .2s}
.cta-btn:hover{background:var(--accent-h);transform:translateY(-2px)}

/* TEXTE */
.sec-text{padding:clamp(32px,5vw,60px) clamp(20px,6vw,80px)}
.sec-text p{font-size:clamp(14px,2vw,17px);line-height:1.8;color:var(--text);max-width:760px}

/* IMAGE */
.sec-image{padding:clamp(20px,4vw,40px) clamp(20px,6vw,80px)}
.sec-image img{width:100%;border-radius:12px;display:block}

/* GALERIE */
.gallery{padding:clamp(24px,4vw,48px) clamp(16px,5vw,60px)}
.gallery-grid{display:grid;gap:10px}
.gallery-item img{width:100%;border-radius:8px;object-fit:cover;aspect-ratio:1;display:block}

/* VIDÉO */
.sec-video{padding:clamp(24px,4vw,40px) clamp(16px,5vw,60px)}
.video-title{font-family:var(--hero-font);font-size:clamp(18px,3vw,26px);color:var(--text);margin-bottom:16px;text-align:center}
.video-wrap iframe{width:100%;height:clamp(220px,50vw,480px);border-radius:12px;border:none;display:block}

/* PRODUITS */
.sec-products{padding:clamp(24px,4vw,56px) clamp(16px,5vw,60px);background:var(--bg-alt)}
.products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px}
.product-card{background:var(--bg);border:1px solid var(--nav-border);border-radius:var(--card-radius,16px);overflow:hidden;box-shadow:var(--card-shadow);transition:transform .2s}
.product-card:hover{transform:translateY(-4px)}
.product-img-wrap{position:relative}
.product-img-wrap img{width:100%;height:180px;object-fit:cover;display:block}
.product-img-ph{width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:40px}
.product-badge{position:absolute;top:10px;left:10px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase}
.product-body{padding:16px}
.product-name{font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px}
.product-desc{font-size:13px;color:var(--text-sub);line-height:1.5;margin-bottom:14px}
.product-footer{display:flex;align-items:center;justify-content:space-between}
.product-price{font-size:18px;font-weight:700;color:var(--accent)}
.product-btn{background:var(--accent);color:#fff;border:none;border-radius:calc(var(--btn-radius,10px) * .6);padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--body-font);transition:all .15s}
.product-btn:hover{background:var(--accent-h)}

/* FEATURES */
.sec-features{padding:clamp(40px,6vw,70px) clamp(20px,5vw,60px);background:var(--bg-alt)}
.features-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:24px;max-width:960px;margin:0 auto}
.feature-card{background:var(--bg);border:1px solid var(--nav-border);border-radius:14px;padding:28px 24px;text-align:center}
.feat-icon{font-size:32px;display:block;margin-bottom:12px}
.feature-card strong{font-size:16px;color:var(--text);display:block;margin-bottom:6px}
.feature-card p{font-size:14px;color:var(--text-sub);line-height:1.5}

/* FORMULAIRE */
.sec-form{padding:clamp(40px,6vw,70px) clamp(20px,5vw,60px);background:var(--bg-alt);display:flex;flex-direction:column;align-items:center}
.sec-form h3{font-family:var(--hero-font);font-size:clamp(22px,4vw,30px);color:var(--text);margin-bottom:24px}
.sec-form form{display:flex;flex-direction:column;gap:12px;width:100%;max-width:500px}
.sec-form input,.sec-form textarea{padding:12px 16px;border:1px solid var(--nav-border);border-radius:10px;font-size:15px;font-family:var(--body-font);background:var(--bg);color:var(--text);outline:none;transition:border-color .15s}
.sec-form input:focus,.sec-form textarea:focus{border-color:var(--accent)}
.sec-form button{background:var(--accent);color:#fff;border:none;border-radius:var(--btn-radius);padding:var(--btn-pad);font-size:15px;font-weight:600;cursor:pointer;font-family:var(--body-font)}
.sec-form button:hover{background:var(--accent-h)}

/* DIVIDER */
.sec-divider{padding:8px 60px}
.sec-divider hr{border:none;border-top:1px solid var(--nav-border)}

/* PANIER */
.cart-fab{position:fixed;bottom:24px;right:24px;z-index:200;background:var(--accent);color:#fff;border:none;border-radius:100px;padding:12px 20px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);display:flex;align-items:center;gap:8px;transition:all .2s}
.cart-fab:hover{background:var(--accent-h);transform:translateY(-2px)}
.cart-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
@media(min-width:600px){.cart-overlay{align-items:center}}
.cart-box{background:var(--bg);border-radius:16px 16px 0 0;width:100%;max-width:500px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -4px 32px rgba(0,0,0,.2)}
@media(min-width:600px){.cart-box{border-radius:16px;max-height:600px}}
.cart-header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--nav-border)}
.cart-header h3{font-size:17px;font-weight:700;color:var(--text)}
.cart-header button{background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-sub)}
.cart-items{overflow-y:auto;flex:1;padding:12px 16px;display:flex;flex-direction:column;gap:10px}
.cart-item{display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-alt);border-radius:10px}
.cart-item img,.cart-item-ph{width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0}
.cart-item-ph{background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:22px}
.cart-item-info{flex:1;min-width:0}
.cart-item-name{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cart-item-price{font-size:12px;color:var(--text-sub)}
.cart-item-qty{display:flex;align-items:center;gap:6px}
.cart-item-qty button{background:var(--bg);border:1px solid var(--nav-border);width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:14px}
.cart-item-qty span{font-size:13px;font-weight:600;min-width:20px;text-align:center}
.cart-item-del{background:none;border:none;font-size:16px;cursor:pointer;opacity:.5;margin-left:4px}
.cart-footer{padding:16px 20px;border-top:1px solid var(--nav-border)}
.cart-total{font-size:14px;color:var(--text-sub);margin-bottom:12px;font-weight:500}
.cart-total strong{font-size:20px;color:var(--accent)}
.cart-checkout-btn{width:100%;background:var(--accent);color:#fff;border:none;border-radius:var(--btn-radius);padding:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:var(--body-font);transition:.2s}
.cart-checkout-btn:hover{background:var(--accent-h)}

/* FOOTER */
.site-footer{text-align:center;padding:24px;font-size:13px;color:var(--text-sub);border-top:1px solid var(--nav-border);background:var(--bg-alt)}

/* RESPONSIVE */
@media(max-width:600px){
  nav{padding:0 12px;height:52px}
  .brand{font-size:15px;max-width:100px}
  .nav-links a{font-size:12px;padding:5px 10px}
  .hero{padding:48px 16px}
  .products-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
  .features-grid{grid-template-columns:1fr}
  .sec-text,.sec-image,.gallery,.sec-video,.sec-form,.sec-features,.sec-products{padding-left:12px;padding-right:12px}
}
`
}

// Générer README d'hébergement
const generateReadme = () => {
  const name = siteName.value || 'mon-site'
  return `# ${name} — Hébergement du site

Site généré par SaasBuilder le ${new Date().toLocaleDateString('fr-FR')}.

## 📁 Fichiers inclus

- \`index.html\`          — Page d'accueil (ou page unique)
- \`page-2.html\`, etc.   — Autres pages (si multi-pages)
- \`style.css\`           — Styles du site (thème intégré)
- \`logo.png\`            — Logo du site (si applicable)
- \`README.md\`           — Ce fichier

## 🚀 Options d'hébergement

### Option 1 — GitHub Pages (gratuit)
1. Créez un repo GitHub (ex: \`mon-site\`)
2. Uploadez tous les fichiers
3. Allez dans Settings → Pages → Source: \`main\`
4. URL : \`https://votreuser.github.io/mon-site\`

### Option 2 — Netlify (gratuit)
1. Allez sur https://netlify.com
2. Faites glisser le dossier \`dist/\` dans la zone de déploiement
3. URL générée automatiquement (ex: \`mon-site.netlify.app\`)
4. Domaine personnalisé disponible dans Settings

### Option 3 — Vercel (gratuit)
\`\`\`bash
npm i -g vercel
cd dist/
vercel --name ${name.toLowerCase().replace(/\s+/g,'-')}
\`\`\`

### Option 4 — Hébergement classique (OVH, Hostinger...)
Uploadez tous les fichiers dans le dossier \`public_html/\` via FTP.

## 🛒 Paiement

Le panier est fonctionnel côté client (localStorage).
Pour activer les paiements réels, intégrez :
- **Stripe** : https://stripe.com/docs/js
- **PayPal** : https://developer.paypal.com/sdk/js/

Remplacez la fonction \`checkout()\` dans chaque page HTML.

## 📧 Formulaire de contact

Remplacez la fonction \`handleForm()\` par un endpoint email :
- **Formspree** : https://formspree.io (gratuit)
- **EmailJS** : https://emailjs.com
- Ou votre propre backend

## 🎨 Modifier le thème

Éditez \`style.css\` → section \`:root { }\` :
\`\`\`css
:root {
  --accent:     #6c63ff;   /* Couleur principale */
  --bg:         #ffffff;   /* Fond */
  --text:       #1a1a2e;   /* Texte */
  --btn-radius: 10px;      /* Arrondi des boutons */
}
\`\`\`
`
}

// Export ZIP multi-pages
const exportDist = async () => {
  try {
    // Charger JSZip depuis CDN
    if (!window.JSZip) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
        s.onload = resolve
        s.onerror = () => reject(new Error('Impossible de charger JSZip'))
        document.head.appendChild(s)
      })
    }
    const zip = new window.JSZip()
    const pages = site.value.pages || []

    // Générer une page HTML par page du site
    pages.forEach((page, i) => {
      const filename = i === 0 ? 'index.html' : `page-${i+1}.html`
      zip.file(filename, generateHtml(i))
    })

    // Ajouter le CSS commun
    zip.file('style.css', generateCSS())

    // Ajouter le logo si présent (base64 → Blob)
    if (siteLogo.value && siteLogo.value.startsWith('data:image')) {
      const base64 = siteLogo.value.split(',')[1]
      zip.file('logo.png', base64, { base64: true })
    }

    // README d'hébergement
    zip.file('README.md', generateReadme())

    // Générer le ZIP
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${(siteName.value || 'mon-site').toLowerCase().replace(/\s+/g,'-')}-dist.zip`
    a.click()
    URL.revokeObjectURL(url)
    notify('✅ dist.zip téléchargé !', 'success')
    showExportModal.value = false
  } catch(err) {
    notify('❌ Erreur export : ' + err.message, 'error')
    console.error('exportDist:', err)
  }
}

const exportSite = () => {
  // Export mono-page HTML simple (ancien comportement conservé)
  const html = generateHtml(0)
  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(siteName.value || 'mon-site').toLowerCase().replace(/\s+/g,'-')}.html`
  a.click()
  notify(t.value.exportSuccess)
  showExportModal.value = false
}

const setStyle = (type, value) => {
  if (!activeSection.value) return
  activeSection.value.style ||= {}
  const s = activeSection.value.style
  if (type==="bold") s.fontWeight = s.fontWeight==="bold"?"normal":"bold"
  if (type==="italic") s.fontStyle = s.fontStyle==="italic"?"normal":"italic"
  if (type==="color") s.color = value
  if (type==="align") s.textAlign = value
  if (type==="fontSize") s.fontSize = value
  if (type==="bg") s.backgroundColor = value
}

const setPageStyle = (type, value) => {
  currentPage.value.style ||= {}
  if (type==="bg") currentPage.value.style.backgroundColor = value
  if (type==="color") currentPage.value.style.color = value
  if (type==="fontFamily") currentPage.value.style.fontFamily = value
}
</script>

<template>
<div class="saas-root" :dir="isRtl?'rtl':'ltr'">

  <!-- NOTIFICATION -->
  <Transition name="notif">
    <div v-if="showNotif" class="notif" :class="notifType">{{ notifMsg }}</div>
  </Transition>

  <!-- CART MODAL -->
  <Transition name="modal">
    <div v-if="showCart" class="modal-overlay" @click.self="showCart=false" :dir="isRtl?'rtl':'ltr'">
      <div class="modal-box cart-modal">
        <button class="modal-close" @click="showCart=false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">🛒</span>
          <h2>{{ t.cartTitle }}</h2>
        </div>

        <div v-if="cart.length === 0" class="cart-empty">
          <span>🛍️</span>
          <p>{{ t.cartEmpty }}</p>
        </div>

        <div v-else class="cart-items">
          <div v-for="item in cart" :key="item.id" class="cart-item">
            <div class="cart-item-img">
              <img v-if="item.image" :src="item.image" :alt="item.name"/>
              <span v-else>🛍️</span>
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">{{ item.name }}</div>
              <div class="cart-item-price">{{ item.price }}{{ item.currency }}</div>
            </div>
            <div class="cart-item-qty">
              <button class="qty-btn" @click="updateQty(item.id, -1)">−</button>
              <span class="qty-val">{{ item.qty }}</span>
              <button class="qty-btn" @click="updateQty(item.id, 1)">+</button>
            </div>
            <div class="cart-item-subtotal">{{ (parseFloat(item.price)*item.qty).toFixed(2) }}{{ item.currency }}</div>
            <button class="cart-item-del" @click="removeFromCart(item.id)">✕</button>
          </div>
        </div>

        <div v-if="cart.length > 0" class="cart-footer">
          <div class="cart-total-row">
            <span class="cart-total-label">{{ t.cartTotal }}</span>
            <span class="cart-total-amount">{{ cartTotal }}{{ cartCurrency }}</span>
          </div>
          <div class="cart-actions">
            <button class="btn-action" @click="showCart=false">{{ t.cartContinue }}</button>
            <button class="pay-submit stripe-submit cart-checkout-btn" @click="checkoutCart">
              💳 {{ t.cartCheckout }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- AVERTISSEMENT TEST DE PAIEMENT — s'affiche avant le test rapide -->
  <Transition name="modal">
    <div v-if="showPaySlugWarning" class="modal-overlay" @click.self="showPaySlugWarning=false">
      <div class="modal-box pay-slug-warning-box">
        <button class="modal-close" @click="showPaySlugWarning=false">✕</button>
        <div class="pay-slug-warning-icon">⚠️</div>
        <h3 class="pay-slug-warning-title">Test de paiement réel</h3>

        <template v-if="publishedSlugValue">
          <p class="pay-slug-warning-text">
            Ce test rapide reste utile pour vérifier votre configuration, mais ne suit pas le vrai parcours d'achat de vos clients.
            Pour un test complet (panier, confirmation, annulation...), utilisez l'adresse publique de votre site déjà publié :
          </p>
          <a
            class="pay-slug-warning-link"
            :href="`https://mronlinestores.com/#/${publishedSlugValue}`"
            target="_blank" rel="noopener"
          >🔗 mronlinestores.com/#/{{ publishedSlugValue }}</a>
          <div class="pay-slug-warning-actions">
            <a
              class="btn-action primary pay-slug-btn"
              :href="`https://mronlinestores.com/#/${publishedSlugValue}`"
              target="_blank" rel="noopener"
              style="text-align:center;text-decoration:none"
            >Ouvrir mon site publié</a>
            <button class="btn-action pay-slug-btn" @click="proceedWithQuickPaymentTest">Continuer avec le test rapide</button>
          </div>
        </template>

        <template v-else>
          <p class="pay-slug-warning-text">
            Ce test rapide reste utile pour vérifier votre configuration, mais ne suit pas le vrai parcours d'achat de vos clients.
            Pour un test complet (panier, confirmation, annulation...), votre site doit d'abord être publié afin d'obtenir une adresse — par exemple <code>mronlinestores.com/#/mjz</code>.
          </p>
          <div class="pay-slug-warning-actions">
            <button class="btn-action primary pay-slug-btn" @click="showPaySlugWarning=false; showPublishModal=true">Publier mon site</button>
            <button class="btn-action pay-slug-btn" @click="proceedWithQuickPaymentTest">Continuer avec le test rapide</button>
          </div>
        </template>
      </div>
    </div>
  </Transition>

  <!-- PAYMENT MODAL -->
  <Transition name="modal">
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="showPaymentModal=false">
      <div class="modal-box payment-modal">
        <button class="modal-close" @click="showPaymentModal=false">✕</button>
        <div v-if="!paymentSuccess">
          <div class="modal-header">
            <span class="modal-icon">💳</span>
            <h2>{{ paymentModalSection?.title || 'Finaliser le paiement' }}</h2>
            <p class="modal-desc">{{ paymentModalSection?.description }}</p>
            <div class="modal-amount">{{ paymentModalSection?.amount }}{{ paymentModalSection?.currency }}</div>
          </div>
          <div class="pay-tabs">
            <button :class="['pay-tab-btn', { active: paymentProvider==='stripe' }]" @click="paymentProvider='stripe'">💳 Stripe</button>
            <button :class="['pay-tab-btn', 'paypal-tab', { active: paymentProvider==='paypal' }]" @click="paymentProvider='paypal'">🅿 PayPal</button>
          </div>
          <div v-if="paymentProvider==='stripe'" class="pay-form">
            <div class="pay-form-row">
              <label>Informations de carte</label>
              <!-- Stripe Elements s'injecte ici -->
              <div id="stripe-card-element" class="stripe-card-el"></div>
              <div id="stripe-card-errors" class="stripe-card-errors"></div>
            </div>
            <p class="pay-note">🔒 Paiement sécurisé via Stripe — <code>{{ liveStripeConfig.mode==='test'?'MODE TEST':'MODE LIVE' }}</code></p>
            <button class="pay-submit stripe-submit" @click="processStripePayment" :disabled="paymentProcessing">
              <span v-if="paymentProcessing" class="spinner"/>
              {{ paymentProcessing?'Traitement...':`Payer ${paymentModalSection?.amount}${paymentModalSection?.currency}` }}
            </button>
          </div>
          <div v-if="paymentProvider==='paypal'" class="pay-form">
            <div class="paypal-info">
              <div class="paypal-logo">PayPal</div>
              <p>Paiement sécurisé via votre compte PayPal.</p>
              <p class="pay-note">Mode : <code>{{ livePaypalConfig.mode==='sandbox'?'SANDBOX (test)':'LIVE' }}</code></p>
            </div>
            <!-- PayPal SDK injecte ses boutons ici -->
            <div id="paypal-button-container" class="paypal-buttons-wrap"></div>
            <button v-if="!paymentProcessing" class="pay-submit paypal-submit" @click="processPaypalPayment">
              🅿 Initialiser PayPal
            </button>
            <span v-if="paymentProcessing" class="spinner paypal-spinner" style="margin:0 auto"/>
          </div>
          <div class="pay-config-links">
            <button @click="openConfigEditor('stripe');showPaymentModal=false">⚙ stripe.js</button>
            <button @click="openConfigEditor('paypal');showPaymentModal=false">⚙ paypal.js</button>
          </div>
        </div>
        <div v-else class="pay-success">
          <div class="pay-success-icon">✓</div>
          <h2>Paiement réussi !</h2>
          <p>Votre paiement a bien été traité.</p>
          <button class="pay-submit stripe-submit" @click="showPaymentModal=false">Fermer</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- CONFIG EDITOR MODAL -->
  <Transition name="modal">
    <div v-if="showConfigEditor" class="modal-overlay" @click.self="showConfigEditor=false">
      <div class="modal-box config-modal">
        <button class="modal-close" @click="showConfigEditor=false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">{{ configEditorTarget==='stripe' ? '💳' : configEditorTarget==='anthropic' ? '🔑' : '🅿' }}</span>
          <h2>Config {{ configEditorTarget==='stripe' ? 'Stripe' : configEditorTarget==='anthropic' ? 'Anthropic API' : 'PayPal' }} de votre store</h2>
          <p class="modal-desc">
            Configurez vos clés pour recevoir les paiements de <strong>vos clients</strong>.
            Sauvegardé dans Firestore — actif immédiatement.
          </p>
        </div>
        <textarea v-model="configEditorContent" class="config-editor-textarea" spellcheck="false"/>
        <div class="config-modal-actions">
          <button class="btn-action" @click="showConfigEditor=false">Annuler</button>
          <button class="btn-action primary" @click="saveConfigFile">💾 Sauvegarder dans Firestore</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- PUBLISH MODAL -->
  <Transition name="modal">
    <div v-if="showPublishModal" class="modal-overlay" @click.self="showPublishModal=false" :dir="isRtl?'rtl':'ltr'">
      <div class="modal-box publish-modal">
        <button class="modal-close" @click="showPublishModal=false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">🌐</span>
          <h2>{{ t.publishTitle }}</h2>
          <p class="modal-desc">{{ t.publishDesc }}</p>
        </div>

        <div v-if="publishStatus !== 'published'" class="publish-form">
          <div class="pub-field">
            <label>{{ t.siteAddress }}</label>
            <div class="pub-url-wrap">
              <span class="pub-url-prefix">mronlinestores.com/#/</span>
              <input v-model="publishAddress" class="pub-input" :placeholder="t.siteAddressPlaceholder"/>
            </div>
            <div v-if="publishAddress" class="pub-preview-url">
              🔗 mronlinestores.com/#/{{ publishAddress.toLowerCase().replace(/[^a-z0-9-]/g,'-') }}
            </div>
            <div v-if="currentUser && publishAddress" class="pub-preview-url" style="color:var(--text3);font-size:11px;margin-top:4px">
              🆔 uid: mronlinestores.com/#/site/{{ currentUser.uid }}
            </div>
          </div>

          <div class="pub-field">
            <label>{{ t.domainLink }}</label>
            <input v-model="publishDomain" class="pub-input" :placeholder="t.domainPlaceholder"/>
          </div>

          <button class="pay-submit stripe-submit" @click="publishSite" style="margin-top:8px">
            🚀 {{ t.publishBtn }}
          </button>
        </div>

        <div v-else class="publish-result">
          <div class="pub-success-badge">✓ {{ t.publishSuccess }}</div>

          <!-- URL slug (conviviale) -->
          <div class="pub-url-card">
            <label>🔗 URL personnalisée (nom choisi)</label>
            <a :href="publishInfo.urlSlug" target="_blank" class="pub-live-url">{{ publishInfo.urlSlug }}</a>
          </div>

          <!-- URL uid (technique) -->
          <div class="pub-url-card" style="margin-top:10px">
            <label>🆔 URL technique (UID)</label>
            <a :href="publishInfo.urlUid" target="_blank" class="pub-live-url pub-live-url--uid">{{ publishInfo.urlUid }}</a>
            <p class="pub-equiv-note">Ces deux URLs pointent vers le même site ✓</p>
          </div>

          <!-- DNS si domaine personnalisé -->
          <div v-if="publishInfo.domain" class="dns-section" style="margin-top:14px">
            <h3 class="dns-title">{{ t.dnsTitle }}</h3>
            <p class="dns-desc">{{ t.dnsDesc }}</p>
            <div class="dns-table">
              <div class="dns-row dns-head">
                <span>Type</span><span>Nom</span><span>Valeur</span>
              </div>
              <div class="dns-row">
                <span class="dns-type">A</span><span>@</span><span class="dns-val">185.199.108.153</span>
              </div>
              <div class="dns-row">
                <span class="dns-type">A</span><span>@</span><span class="dns-val">185.199.109.153</span>
              </div>
              <div class="dns-row">
                <span class="dns-type">CNAME</span><span>www</span><span class="dns-val">musrh.github.io</span>
              </div>
              <div class="dns-row">
                <span class="dns-type">TXT</span><span>@</span><span class="dns-val">saas-verify={{ publishInfo.slug }}</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button class="btn-action small" @click="copyDnsRecords">
                {{ dnsCopied ? t.dnsCopied : t.copyDns }}
              </button>
              <button class="btn-action small" @click="showDnsInput=true">
                🖊 {{ t.dnsInputTitle }}
              </button>
            </div>
          </div>

          <!-- Sans domaine : DNS GitHub Pages -->
          <div v-else class="dns-section" style="margin-top:14px">
            <h3 class="dns-title">{{ t.dnsTitle }}</h3>
            <p class="dns-desc">Pour lier un domaine à cette adresse :</p>
            <div class="dns-table">
              <div class="dns-row dns-head"><span>Type</span><span>Nom</span><span>Valeur</span></div>
              <div class="dns-row"><span class="dns-type">A</span><span>@</span><span class="dns-val">185.199.108.153</span></div>
              <div class="dns-row"><span class="dns-type">A</span><span>@</span><span class="dns-val">185.199.109.153</span></div>
              <div class="dns-row"><span class="dns-type">CNAME</span><span>www</span><span class="dns-val">musrh.github.io</span></div>
            </div>
            <button class="btn-action small" @click="showDnsInput=true" style="margin-top:10px">
              🖊 {{ t.dnsInputTitle }}
            </button>
          </div>

          <!-- Firestore info -->
          <div class="pub-firestore-info">
            <span class="pub-fi-icon">🔥</span>
            <div>
              <div class="pub-fi-title">Données Firestore</div>
              <div class="pub-fi-detail"><code>users/{{ publishInfo.uid }}/siteData</code></div>
              <div class="pub-fi-detail"><code>slugs/{{ publishInfo.slug }}</code> → uid</div>
            </div>
          </div>

          <p class="pub-note" style="margin-top:12px">📄 {{ t.publishNoteFile }}</p>

          <button class="btn-action" @click="publishStatus=''; publishAddress=''; publishDomain=''; dnsSaved=false" style="margin-top:12px;width:100%;justify-content:center">
            {{ t.modifyAddress }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- DNS INPUT MODAL -->
  <Transition name="modal">
    <div v-if="showDnsInput" class="modal-overlay" @click.self="showDnsInput=false" :dir="isRtl?'rtl':'ltr'">
      <div class="modal-box dns-input-modal">
        <button class="modal-close" @click="showDnsInput=false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">🔧</span>
          <h2>{{ t.dnsInputTitle }}</h2>
          <p class="modal-desc">{{ t.dnsInputDesc }}</p>
        </div>
        <div class="dns-input-form">
          <div class="dns-input-row"><label>{{ t.dnsNs1 }} *</label><input v-model="customDns.ns1" class="dns-input-field" placeholder="ns1.registrar.com"/></div>
          <div class="dns-input-row"><label>{{ t.dnsNs2 }} *</label><input v-model="customDns.ns2" class="dns-input-field" placeholder="ns2.registrar.com"/></div>
          <div class="dns-input-row"><label>{{ t.dnsNs3 }}</label><input v-model="customDns.ns3" class="dns-input-field" placeholder="ns3.registrar.com"/></div>
          <div class="dns-input-row"><label>{{ t.dnsNs4 }}</label><input v-model="customDns.ns4" class="dns-input-field" placeholder="ns4.registrar.com"/></div>
        </div>
        <div class="dns-instructions">
          <div class="dns-inst-title">{{ t.dnsInstructions }}</div>
          <div class="dns-inst-step">{{ t.dnsStep1 }}</div>
          <div class="dns-inst-step">{{ t.dnsStep2 }}</div>
          <div class="dns-inst-step">{{ t.dnsStep3 }}</div>
          <div class="dns-inst-step">{{ t.dnsStep4 }}</div>
        </div>
        <div class="config-modal-actions" style="margin-top:16px">
          <button class="btn-action" @click="showDnsInput=false">{{ t.cancel }}</button>
          <button class="btn-action primary" @click="saveDnsRecords">💾 {{ t.saveDns }}</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- EXPORT MODAL -->
  <Transition name="modal">
    <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal=false">
      <div class="modal-box export-modal">
        <button class="modal-close" @click="showExportModal=false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">🚀</span>
          <h2>{{ t.exportTitle }}</h2>
          <p class="modal-desc">{{ t.exportDesc }}</p>
        </div>
        <div class="export-options">
          <div class="export-card" @click="exportSite">
            <span class="export-icon">📄</span>
            <strong>HTML mono-page</strong>
            <p>Un seul fichier .html avec tout intégré</p>
            <span class="export-badge">Rapide</span>
          </div>
          <div class="export-card export-card-featured" @click="exportDist">
            <span class="export-icon">📦</span>
            <strong>dist.zip — Hébergement</strong>
            <p>Multi-pages + style.css + logo + README<br/>Prêt pour Netlify, Vercel, GitHub Pages, OVH...</p>
            <span class="export-badge export-badge-pro">⭐ Recommandé</span>
          </div>
        </div>
        <div class="export-note"><strong>Note :</strong> {{ t.exportNote }}</div>
      </div>
    </div>
  </Transition>

  <!-- PUBLIC PREVIEW (plein écran, sans barre d'outils) -->
  <Transition name="modal">
    <div v-if="showPublicPreview" class="public-preview-overlay">
      <button class="pub-preview-close" @click="showPublicPreview=false">✕ Fermer l'aperçu</button>
      <!-- Navigation du site -->
      <nav class="pub-preview-nav">
        <div class="pub-preview-brand-wrap">
          <img v-if="siteLogo" :src="siteLogo" class="pub-preview-logo" alt="logo"/>
          <span v-else class="pub-preview-brand-icon">◈</span>
          <span class="pub-preview-brand-name">{{ siteName }}</span>
        </div>
        <div class="pub-preview-tabs">
          <button
            v-for="(p,i) in site.pages" :key="p.id"
            class="pub-preview-tab"
            :class="{active: currentPageIndex===i}"
            @click="currentPageIndex=i"
          >{{ p.name }}</button>
        </div>
        <button v-if="cartCount>0" class="pub-preview-cart" @click="showCart=true">
          🛒 <span class="cart-badge">{{ cartCount }}</span>
        </button>
      </nav>
      <!-- Contenu du site -->
      <div class="pub-preview-content" :style="currentPage?.style">
        <div v-for="s in currentPage?.sections" :key="s.id">
          <div v-if="s.type==='hero'" class="prev-hero" :style="s.style">
            <h1 class="prev-hero-title">{{ s.content }}</h1>
            <p class="prev-hero-sub">{{ s.subtitle }}</p>
            <button v-if="s.cta" class="prev-hero-cta">{{ s.cta }}</button>
          </div>
          <div v-else-if="s.type==='text'" class="prev-text" :style="s.style"><p>{{ s.content }}</p></div>
          <div v-else-if="s.type==='image'" class="prev-image" :style="s.style">
            <img v-if="s.url" :src="s.url" :alt="s.alt" class="prev-img"/>
          </div>
          <div v-else-if="s.type==='gallery'" class="prev-gallery" :style="s.style">
            <div v-if="s.images.length" class="prev-gallery-grid" :style="`grid-template-columns:repeat(${s.columns||3},1fr)`">
              <div v-for="img in s.images" :key="img.id" class="prev-gallery-item"><img :src="img.url" :alt="img.alt"/></div>
            </div>
          </div>
          <div v-else-if="s.type==='video'" class="prev-video" :style="s.style">
            <h3 v-if="s.title" class="prev-video-title">{{ s.title }}</h3>
            <div v-if="s.url" class="prev-video-wrap"><iframe :src="getEmbedUrl(s.url)" allowfullscreen class="prev-video-iframe"/></div>
          </div>
          <div v-else-if="s.type==='products'" class="prev-products" :style="s.style">
            <div class="prev-products-grid">
              <div v-for="p in s.items" :key="p.id" class="prev-product-card">
                <div class="prev-product-img-wrap">
                  <img v-if="p.image" :src="p.image" class="prev-product-img"/>
                  <div v-else class="prev-product-img-ph">🛍️</div>
                  <span v-if="p.badge" class="prev-product-badge">{{ p.badge }}</span>
                </div>
                <div class="prev-product-body">
                  <div class="prev-product-name">{{ p.name }}</div>
                  <div class="prev-product-desc">{{ p.description }}</div>
                  <div class="prev-product-footer">
                    <span class="prev-product-price">{{ p.price }}{{ p.currency }}</span>
                    <button class="prev-product-btn" @click="addToCart(p)">🛒 {{ t.prevBuyBtn }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="s.type==='features'" class="prev-features" :style="s.style">
            <div class="prev-features-grid">
              <div v-for="(item,fi) in s.items" :key="fi" class="prev-feature-card">
                <span class="prev-feat-icon">{{ item.icon }}</span>
                <strong>{{ item.title }}</strong><p>{{ item.desc }}</p>
              </div>
            </div>
          </div>
          <div v-else-if="s.type==='payment'" class="prev-payment" :style="s.style">
            <h2 class="prev-payment-title">{{ s.title }}</h2>
            <p class="prev-payment-desc">{{ s.description }}</p>
            <div class="prev-payment-amount">{{ s.amount }}{{ s.currency }}</div>
            <div class="prev-payment-btns">
              <button class="prev-pay-btn stripe-btn" @click="paymentProvider='stripe';openPaymentModal(s)">{{ t.prevPayStripe }}</button>
              <button class="prev-pay-btn paypal-btn" @click="paymentProvider='paypal';openPaymentModal(s)">{{ t.prevPayPaypal }}</button>
            </div>
          </div>
          <div v-else-if="s.type==='form'" class="prev-form" :style="s.style">
            <h3>{{ t.prevContactTitle }}</h3>
            <input :placeholder="t.prevNamePh" class="prev-form-field"/>
            <input :placeholder="t.prevEmailPh" class="prev-form-field"/>
            <textarea :placeholder="t.prevMsgPh" class="prev-form-field prev-form-ta"></textarea>
            <button class="prev-form-btn">{{ t.prevSendBtn }}</button>
          </div>
          <div v-else-if="s.type==='divider'" class="prev-divider" :style="s.style"><hr class="prev-divider-line"/></div>
        </div>
      </div>
    </div>
  </Transition>


  <!-- MODAL PAGES LÉGALES -->
  <Transition name="modal">
    <div v-if="showLegalModal && site.legal" class="modal-overlay" @click.self="showLegalModal=false">
      <div class="modal-box legal-modal">
        <button class="modal-close" @click="showLegalModal=false">✕</button>
        <div class="modal-header">
          <span class="modal-icon">⚖</span>
          <h2>Pages légales</h2>
          <p class="modal-desc">Ces pages seront affichées dans le footer de votre site.</p>
        </div>
        <div class="legal-tabs">
          <button class="legal-tab" :class="{active:legalTab==='mentions'}"      @click="legalTab='mentions'">📋 Mentions légales</button>
          <button class="legal-tab" :class="{active:legalTab==='cgv'}"           @click="legalTab='cgv'">📜 Conditions générales</button>
          <button class="legal-tab" :class="{active:legalTab==='privacy'}"       @click="legalTab='privacy'">🔒 Confidentialité</button>
          <button class="legal-tab" :class="{active:legalTab==='privacyPolicy'}" @click="legalTab='privacyPolicy'">🌐 Privacy Policy</button>
          <button class="legal-tab" :class="{active:legalTab==='remboursement'}" @click="legalTab='remboursement'">💸 Remboursement</button>
        </div>
        <div class="legal-editor">
          <div v-if="legalTab==='mentions'">
            <p class="legal-hint">Informations sur l'éditeur, l'hébergeur, le responsable de publication.</p>
            <textarea v-model="site.legal.mentions" class="legal-textarea" placeholder="Exemple :&#10;Éditeur : Votre Nom / Société&#10;Adresse : 10 rue Exemple, 75000 Paris&#10;Email : contact@monsite.com&#10;Hébergeur : Vercel Inc., San Francisco, CA&#10;SIRET : 000 000 000 00000 (si applicable)"/>
            <button class="btn-action small" @click="fillMentions">✨ Pré-remplir</button>
          </div>
          <div v-if="legalTab==='cgv'">
            <p class="legal-hint">Conditions Générales de Vente — obligatoires si vous vendez en ligne.</p>
            <textarea v-model="site.legal.cgv" class="legal-textarea" placeholder="Article 1 — Objet&#10;Les présentes CGV régissent les ventes réalisées sur le site {{ siteName }}.&#10;&#10;Article 2 — Prix&#10;Les prix sont indiqués en euros TTC.&#10;&#10;Article 3 — Paiement&#10;Le paiement est sécurisé via Stripe / PayPal.&#10;&#10;Article 4 — Livraison&#10;...&#10;&#10;Article 5 — Rétractation&#10;Conformément à la loi, vous disposez de 14 jours pour vous rétracter."/>
            <button class="btn-action small" @click="fillCgv">✨ Pré-remplir</button>
          </div>
          <div v-if="legalTab==='privacy'">
            <p class="legal-hint">Politique de confidentialité — obligatoire (RGPD).</p>
            <textarea v-model="site.legal.privacy" class="legal-textarea" placeholder="Collecte des données&#10;Nous collectons uniquement les données nécessaires au traitement de vos commandes.&#10;&#10;Utilisation&#10;Vos données ne sont jamais revendues à des tiers.&#10;&#10;Droits&#10;Vous pouvez demander la suppression de vos données en contactant : contact@monsite.com&#10;&#10;Cookies&#10;Ce site utilise des cookies fonctionnels uniquement."/>
            <button class="btn-action small" @click="fillPrivacy">✨ Pré-remplir</button>
          </div>
          <div v-if="legalTab==='privacyPolicy'">
            <p class="legal-hint">Privacy Policy (English version) — required for international visitors.</p>
            <textarea v-model="site.legal.privacyPolicy" class="legal-textarea" placeholder="Privacy Policy&#10;&#10;Data Collection&#10;We only collect data necessary to process your orders.&#10;&#10;Use of Data&#10;Your data is never sold to third parties.&#10;&#10;Your Rights&#10;You may request deletion of your data by contacting: contact@mysite.com&#10;&#10;Cookies&#10;This site uses functional cookies only."/>
            <button class="btn-action small" @click="fillPrivacyPolicy">✨ Pre-fill</button>
          </div>
          <div v-if="legalTab==='remboursement'">
            <p class="legal-hint">Politique de remboursement — conditions de retour et remboursement.</p>
            <textarea v-model="site.legal.remboursement" class="legal-textarea" placeholder="Politique de remboursement&#10;&#10;Délai de retour&#10;Vous disposez de 14 jours à compter de la réception pour retourner votre article.&#10;&#10;Conditions&#10;L'article doit être retourné dans son état d'origine, non utilisé.&#10;&#10;Procédure&#10;Contactez-nous à contact@monsite.com pour initier un retour.&#10;&#10;Remboursement&#10;Le remboursement sera effectué sous 5 à 10 jours ouvrés après réception du retour."/>
            <button class="btn-action small" @click="fillRemboursement">✨ Pré-remplir</button>
          </div>
        </div>
        <div class="config-modal-actions">
          <button class="btn-action" @click="showLegalModal=false">Fermer</button>
          <button class="btn-action primary" @click="saveSite(); showLegalModal=false">💾 Sauvegarder</button>
        </div>
      </div>
    </div>
  </Transition>


  <!-- ══ MODAL PRODUITS TENDANCE ══ -->
  <Transition name="modal">
    <div v-if="showTrendModal" class="modal-overlay" @click.self="showTrendModal=false">
      <div class="modal-box trend-modal">
        <button class="modal-close" @click="showTrendModal=false">✕</button>

        <!-- Header -->
        <div class="modal-header">
          <span class="modal-icon">🔥</span>
          <h2>Importer des Produits</h2>
          <p class="modal-desc">Trouvez des produits tendance ou importez directement depuis un site.</p>
        </div>

        <!-- Config manquante -->
        <div v-if="!liveAnthropicConfig.apiKey || liveAnthropicConfig.apiKey.startsWith('sk-ant-VOTRE')" class="trend-config-warn">
          <span>🔑</span>
          <span>Clé API Anthropic non configurée.</span>
          <button class="btn-action small" @click="openConfigEditor('anthropic'); showTrendModal=false">⚙ Configurer anthropic.js</button>
        </div>

        <!-- Onglets -->
        <div class="trend-mode-tabs">
          <button class="trend-mode-tab" :class="{active: trendMode==='search'}" @click="trendMode='search'">🔥 Produits Tendance</button>
          <button class="trend-mode-tab" :class="{active: trendMode==='url'}"    @click="trendMode='url'">🔗 Importer depuis URL</button>
        </div>

        <!-- ══ ONGLET TENDANCE ══ -->
        <template v-if="trendMode==='search'">
          <div class="trend-search-bar">
            <input
              v-model="trendQuery"
              class="trend-input"
              placeholder="Ex: bijoux femme, sneakers, accessoires maison, gadgets..."
              @keydown.enter="searchTrendProducts"
            />
            <select v-model="trendLang" class="trend-lang-select">
              <option value="fr">🇫🇷 FR</option>
              <option value="en">🇬🇧 EN</option>
              <option value="ar">🇸🇦 AR</option>
              <option value="es">🇪🇸 ES</option>
            </select>
            <button class="btn-action primary trend-search-btn" @click="searchTrendProducts" :disabled="trendLoading || !trendQuery.trim()">
              <span v-if="trendLoading" class="spinner"/>
              <span>{{ trendLoading ? "Recherche..." : "🔍 Rechercher" }}</span>
            </button>
          </div>

          <div v-if="trendError" class="trend-error">⚠️ {{ trendError }}</div>

          <div v-if="trendLoading" class="trend-loading">
            <div v-for="i in 4" :key="i" class="trend-skeleton"/>
            <p class="trend-loading-msg">🌐 Recherche des tendances sur internet...</p>
          </div>

          <div v-if="!trendLoading && trendResults.length" class="trend-results-area">
            <div class="trend-results-header">
              <span class="trend-count">{{ trendResults.length }} produits trouvés</span>
              <button class="trend-select-all" @click="selectAllTrend">
                {{ trendSelected.size === trendResults.length ? '✓ Tout désélectionner' : '☐ Tout sélectionner' }}
              </button>
            </div>
            <div class="trend-grid">
              <div v-for="p in trendResults" :key="p.id" class="trend-card" :class="{selected: trendSelected.has(p.id)}" @click="toggleTrendSelect(p.id)">
                <div class="trend-card-check"><span v-if="trendSelected.has(p.id)">✓</span></div>
                <div class="trend-card-badge" v-if="p.badge">{{ p.badge }}</div>
                <div class="trend-card-img">🛍️</div>
                <div class="trend-card-body">
                  <div class="trend-card-name">{{ p.name }}</div>
                  <div class="trend-card-desc">{{ p.description }}</div>
                  <div class="trend-card-why" v-if="p.why">💡 {{ p.why }}</div>
                  <div class="trend-card-price">{{ p.price }} {{ p.currency }}</div>
                </div>
              </div>
            </div>
            <div class="trend-target">
              <label class="trend-target-label">Importer dans :</label>
              <select class="trend-target-select" v-model="trendTargetSection">
                <option :value="null">Nouvelle section catalogue</option>
                <option v-for="(s,i) in currentPage.sections.filter(s=>s.type==='products')" :key="s.id" :value="s">Section catalogue {{ i+1 }}</option>
              </select>
            </div>
          </div>

          <div class="config-modal-actions" v-if="trendResults.length">
            <button class="btn-action" @click="showTrendModal=false">Annuler</button>
            <button class="btn-action primary" @click="importTrendProducts" :disabled="!trendSelected.size">
              ⬇ Importer {{ trendSelected.size > 0 ? trendSelected.size + ' produit(s)' : '' }}
            </button>
          </div>
        </template>

        <!-- ══ ONGLET URL ══ -->
        <template v-if="trendMode==='url'">
          <div class="scrape-search-bar">
            <div class="scrape-url-wrap">
              <span class="scrape-url-icon">🔗</span>
              <input
                v-model="scrapeUrl"
                class="trend-input scrape-url-input"
                placeholder="https://www.exemple.com/produit ou https://www.boutique.com/catalogue"
                @keydown.enter="scrapeProductFromUrl"
              />
            </div>
            <button class="btn-action primary trend-search-btn" @click="scrapeProductFromUrl" :disabled="scrapeLoading || !scrapeUrl.trim()">
              <span v-if="scrapeLoading" class="spinner"/>
              <span>{{ scrapeLoading ? "Analyse..." : "📥 Analyser" }}</span>
            </button>
          </div>
          <p class="scrape-hint">Collez l'URL d'une page produit ou d'un catalogue. Claude va lire la page et extraire les produits automatiquement.</p>

          <div v-if="scrapeError" class="trend-error">⚠️ {{ scrapeError }}</div>

          <div v-if="scrapeLoading" class="trend-loading">
            <div v-for="i in 3" :key="i" class="trend-skeleton"/>
            <p class="trend-loading-msg">🤖 Analyse de la page en cours...</p>
          </div>

          <div v-if="!scrapeLoading && scrapeResults.length" class="trend-results-area">
            <div class="trend-results-header">
              <span class="trend-count">{{ scrapeResults.length }} produit(s) détecté(s)</span>
              <button class="trend-select-all" @click="scrapeSelected = new Set(scrapeResults.map(p=>p.id))">☐ Tout sélectionner</button>
            </div>
            <div class="trend-grid">
              <div v-for="p in scrapeResults" :key="p.id" class="trend-card" :class="{selected: scrapeSelected.has(p.id)}" @click="toggleScrapeSelect(p.id)">
                <div class="trend-card-check"><span v-if="scrapeSelected.has(p.id)">✓</span></div>
                <div class="trend-card-badge" v-if="p.badge">{{ p.badge }}</div>
                <div class="trend-card-img">
                  <img v-if="p.image" :src="p.image" class="scrape-thumb" @error="p.image=''"/>
                  <span v-else>🛍️</span>
                </div>
                <div class="trend-card-body">
                  <div class="trend-card-name">{{ p.name }}</div>
                  <div class="trend-card-desc">{{ p.description }}</div>
                  <div class="trend-card-price">{{ p.price }} {{ p.currency }}</div>
                </div>
              </div>
            </div>
            <div class="trend-target">
              <label class="trend-target-label">Importer dans :</label>
              <select class="trend-target-select" v-model="trendTargetSection">
                <option :value="null">Nouvelle section catalogue</option>
                <option v-for="(s,i) in currentPage.sections.filter(s=>s.type==='products')" :key="s.id" :value="s">Section catalogue {{ i+1 }}</option>
              </select>
            </div>
          </div>

          <div class="config-modal-actions" v-if="scrapeResults.length">
            <button class="btn-action" @click="showTrendModal=false">Annuler</button>
            <button class="btn-action primary" @click="importScrapeProducts" :disabled="!scrapeSelected.size">
              ⬇ Importer {{ scrapeSelected.size > 0 ? scrapeSelected.size + ' produit(s)' : '' }}
            </button>
          </div>
        </template>

      </div>
    </div>
  </Transition>

  <!-- TOPBAR -->
  <header class="topbar">
    <div class="topbar-brand">
      <label class="logo-area" :title="t.logoUpload">
        <input type="file" accept="image/*" @change="uploadLogo" hidden/>
        <img v-if="siteLogo" :src="siteLogo" class="site-logo-img"/>
        <span v-else class="brand-icon">◈</span>
      </label>
      <input v-model="siteName" class="brand-name-input" :placeholder="t.siteNamePlaceholder" :title="t.siteNameLabel"/>
      <span
        class="brand-badge"
        :class="userPlan === 'pro' ? 'brand-badge-pro' : 'brand-badge-free'"
      >{{ userPlan === 'pro' ? '⭐ Pro' : '🆓 Free' }}</span>
      <!-- Boutons aperçu toujours visibles sur mobile -->
      <div class="brand-quick-btns">
        <button
          class="btn-action bqb"
          @click="mode = mode==='preview' ? 'edit' : 'preview'"
          :title="mode==='preview' ? t.edit : t.preview"
        >{{ mode==='preview' ? '✏️' : '👁' }}</button>
        <button
          class="btn-action bqb"
          @click="showPublicPreview=true"
          title="Aperçu public"
        >🔍</button>
      </div>
    </div>
    <nav class="page-tabs">
      <button v-for="(p,i) in site.pages" :key="p.id" class="page-tab" :class="{active:currentPageIndex===i}" @click="goToPage(i)" @dblclick="renamingPageIndex=i">
        <span v-if="renamingPageIndex!==i">{{ p.name }}</span>
        <input v-else v-model="p.name" class="page-tab-input" @blur="renamingPageIndex=null" @keydown.enter="renamingPageIndex=null" @click.stop autofocus/>
        <span v-if="renamingPageIndex!==i && site.pages.length>1" class="tab-del" @click.stop="deletePage(i)">×</span>
      </button>
      <button class="page-tab add-tab" @click="addPage">+</button>
    </nav>


    <div class="topbar-actions" :dir="isRtl?'rtl':'ltr'">

      <!-- Retour Dashboard -->
      <button class="btn-action btn-dashboard" @click="$router.push('/dashboard')" title="Retour au Dashboard">
        🏠 Dashboard
      </button>

      <!-- Connexion / Déconnexion -->
      <div class="topbar-user" v-if="currentUser">
        <span class="topbar-user-email">{{ currentUser.email?.split('@')[0] }}</span>
        <button class="btn-action btn-logout" @click="signOutUser" title="Se déconnecter">
          ⎋ Déconnexion
        </button>
      </div>
      <button v-else class="btn-action btn-login" @click="$router.push('/')" title="Se connecter">
        🔑 Connexion
      </button>

      <button class="btn-action cart-btn" @click="showCart=true" v-if="cartCount>0">
        🛒 <span class="cart-badge">{{ cartCount }}</span>
      </button>
      <select class="lang-select" v-model="currentLang">
        <option v-for="l in langs" :key="l.code" :value="l.code">{{ l.label }}</option>
      </select>
      <!-- 💳🅿 Stripe/PayPal masqués — Stripe Connect intégré pour Pro -->
      <button class="btn-action icon-btn" @click="showExportModal=true" :title="t.export">⬇</button>
      <button class="btn-action icon-btn" @click="showLegalModal=true" title="Pages légales">⚖</button>
      <button class="btn-action icon-btn trend-btn" @click="showTrendModal=true" title="Produits tendance">🔥</button>
      <div class="pub-btn-group">
        <button class="btn-action publish-btn" @click="showPublishModal=true">🌐 {{ t.publish }}</button>
      </div>
      <span class="save-status" :class="{saved:isSaved}">{{ isSaved ? t.saved : t.unsaved }}</span>
      <button class="btn-action" @click="saveSite" :disabled="isSaving" :class="{saving:isSaving}">
        <span v-if="isSaving" class="spinner"/>
        <span>{{ isSaving ? t.saving : t.save }}</span>
      </button>

    </div>
  </header>

  <!-- WORKSPACE -->
  <div class="workspace">

    <!-- SIDEBAR -->
    <aside v-if="mode==='edit'" class="sidebar" :dir="isRtl?'rtl':'ltr'">
      <div class="sidebar-tabs">
        <button :class="{active:sidebarTab==='sections'}" @click="sidebarTab='sections'">{{ t.sections }}</button>
        <button :class="{active:sidebarTab==='style'}" @click="sidebarTab='style'">{{ t.style }}</button>
      </div>
      <div v-if="sidebarTab==='sections'" class="sidebar-content">
        <p class="sidebar-label">{{ t.addSection }}</p>
        <div class="section-grid">
          <button v-for="st in sectionTypes" :key="st.key" class="section-card" @click="addSection(st.key)">
            <span class="sc-icon">{{ st.icon }}</span>
            <span class="sc-label">{{ st.label }}</span>
            <span class="sc-desc">{{ st.desc }}</span>
          </button>
        </div>
        <div v-if="activeSection" class="prop-panel">
          <p class="sidebar-label" style="margin-top:20px">{{ t.properties }}</p>
          <div v-if="activeSection.type==='gallery'" class="prop-row">
            <label>{{ t.columns }}</label>
            <select v-model="activeSection.columns" class="prop-select">
              <option :value="2">{{ t.colOption2 }}</option>
              <option :value="3">{{ t.colOption3 }}</option>
              <option :value="4">{{ t.colOption4 }}</option>
            </select>
          </div>
          <div v-if="['text','hero'].includes(activeSection.type)" class="prop-row">
            <label>{{ t.typography }}</label>
            <div class="style-btns">
              <button :class="{on:activeSection.style?.fontWeight==='bold'}" @click="setStyle('bold')"><b>B</b></button>
              <button :class="{on:activeSection.style?.fontStyle==='italic'}" @click="setStyle('italic')"><i>I</i></button>
              <button @click="setStyle('align','left')">⬛</button>
              <button @click="setStyle('align','center')">☰</button>
              <button @click="setStyle('align','right')">⬛</button>
            </div>
          </div>
          <div class="prop-row"><label>{{ t.textColor }}</label><input type="color" :value="activeSection.style?.color||'#111111'" @input="setStyle('color',$event.target.value)" class="color-input"/></div>
          <div class="prop-row"><label>{{ t.sectionBg }}</label><input type="color" :value="activeSection.style?.backgroundColor||'#ffffff'" @input="setStyle('bg',$event.target.value)" class="color-input"/></div>
          <div v-if="['text','hero'].includes(activeSection.type)" class="prop-row">
            <label>{{ t.fontSize }}</label>
            <select @change="setStyle('fontSize',$event.target.value)" class="prop-select">
              <option value="">{{ t.auto }}</option>
              <option value="14px">{{ t.small }}</option>
              <option value="18px">{{ t.normal }}</option>
              <option value="24px">{{ t.large }}</option>
              <option value="36px">{{ t.xlarge }}</option>
            </select>
          </div>
        </div>
      </div>
      <div v-if="sidebarTab==='style'" class="sidebar-content theme-panel">

        <!-- ── THÈMES INTÉGRÉS ── -->
        <p class="sidebar-label">🎨 Thèmes</p>
        <div class="theme-grid">
          <div
            v-for="th in BUILTIN_THEMES" :key="th.id"
            class="theme-card"
            :class="{active: activeThemeId===th.id}"
            @click="applyThemeToSite(th)"
            :title="th.name"
          >
            <div class="theme-preview">
              <div class="theme-preview-nav" :style="{background: th.nav}"/>
              <div class="theme-preview-body" :style="{background: th.bg}">
                <div class="theme-preview-btn" :style="{background: th.accent, borderRadius: th.btnRadius+'px'}"/>
              </div>
            </div>
            <span class="theme-name">{{ th.name }}</span>
            <span v-if="activeThemeId===th.id" class="theme-active-badge">✓</span>
          </div>
        </div>

        <!-- ── THÈME PERSONNALISÉ ── -->
        <p class="sidebar-label" style="margin-top:16px">✏️ Personnaliser</p>
        <div class="prop-row"><label>Couleur principale</label>
          <input type="color" v-model="customTheme.accent" class="color-input"/>
        </div>
        <div class="prop-row"><label>Fond</label>
          <input type="color" v-model="customTheme.bg" class="color-input"/>
        </div>
        <div class="prop-row"><label>Texte</label>
          <input type="color" v-model="customTheme.text" class="color-input"/>
        </div>
        <div class="prop-row"><label>Navbar</label>
          <input type="color" v-model="customTheme.nav" class="color-input"/>
        </div>
        <div class="prop-row"><label>Texte navbar</label>
          <input type="color" v-model="customTheme.navText" class="color-input"/>
        </div>
        <div class="prop-row"><label>Arrondi boutons</label>
          <input type="range" min="0" max="24" v-model.number="customTheme.btnRadius" class="prop-range"/>
          <span style="font-size:11px;color:#9ca3af">{{ customTheme.btnRadius }}px</span>
        </div>
        <div class="prop-row"><label>Police</label>
          <select v-model="customTheme.font" class="prop-select">
            <option value="'DM Sans',sans-serif">DM Sans</option>
            <option value="'Inter',sans-serif">Inter</option>
            <option value="'Poppins',sans-serif">Poppins</option>
            <option value="'Nunito',sans-serif">Nunito</option>
            <option value="Georgia,serif">Georgia</option>
            <option value="'Playfair Display',serif">Playfair Display</option>
            <option value="'Space Grotesk',sans-serif">Space Grotesk</option>
          </select>
        </div>
        <button class="btn-action primary" style="width:100%;margin-top:8px" @click="applyThemeToSite(customTheme)">
          ✓ Appliquer mon thème
        </button>

        <!-- ── IMPORTER DEPUIS URL ── -->
        <p class="sidebar-label" style="margin-top:16px">🔗 Importer depuis un site</p>
        <p style="font-size:11px;color:#9ca3af;margin-bottom:8px">Claude analyse les couleurs d'un site et crée un thème automatiquement.</p>
        <div class="import-theme-bar">
          <input v-model="importThemeUrl" class="prop-input" placeholder="https://www.exemple.com" @keydown.enter="importThemeFromUrl"/>
          <button class="btn-action primary small" @click="importThemeFromUrl" :disabled="importThemeLoading">
            <span v-if="importThemeLoading" class="spinner"/>
            <span>{{ importThemeLoading ? '...' : '↓' }}</span>
          </button>
        </div>
        <div v-if="importThemeError" class="import-theme-error">⚠️ {{ importThemeError }}</div>

        <!-- ── COULEURS PAGE (legacy) ── -->
        <p class="sidebar-label" style="margin-top:16px">{{ t.pageStyle }}</p>
        <div class="prop-row"><label>{{ t.bgColor }}</label><input type="color" :value="currentPage.style?.backgroundColor||'#ffffff'" @input="setPageStyle('bg',$event.target.value)" class="color-input"/></div>
        <div class="prop-row"><label>{{ t.textColorPage }}</label><input type="color" :value="currentPage.style?.color||'#111111'" @input="setPageStyle('color',$event.target.value)" class="color-input"/></div>
        <div class="prop-row">
          <label>{{ t.font }}</label>
          <select @change="setPageStyle('fontFamily',$event.target.value)" class="prop-select">
            <option value="">{{ t.fontDefault }}</option>
            <option value="Georgia, serif">{{ t.fontGeorgia }}</option>
            <option value="'Courier New', monospace">{{ t.fontCourier }}</option>
            <option value="'Trebuchet MS', sans-serif">{{ t.fontTrebuchet }}</option>
            <option value="Verdana, sans-serif">{{ t.fontVerdana }}</option>
          </select>
        </div>

      </div>
    </aside>

    <!-- CANVAS -->
    <main class="canvas" :class="{preview:mode==='preview'}">
      <div class="canvas-inner" :style="currentPage?.style">
        <template v-if="mode==='edit'">
          <div v-if="!currentPage.sections.length" class="empty-page">
            <span>✦</span><p>{{ t.emptyPage }}</p><p>{{ t.addSectionHint }}</p>
          </div>
          <div v-for="(s,i) in currentPage.sections" :key="s.id" class="section-block" :class="{'is-active':activeSectionIndex===i}" @click="activeSectionIndex=i">
            <div class="section-actions">
              <button @click.stop="moveSection(i,-1)" :disabled="i===0">↑</button>
              <button @click.stop="moveSection(i,1)" :disabled="i===currentPage.sections.length-1">↓</button>
              <button @click.stop="deleteSection(i)" class="del-btn">✕</button>
            </div>
            <!-- HERO -->
            <div v-if="s.type==='hero'" class="sec-hero" :style="s.style">
              <textarea v-model="s.content" class="hero-title-input" :placeholder="t.heroTitlePh"/>
              <input v-model="s.subtitle" class="hero-sub-input" :placeholder="t.heroSubPh"/>
              <input v-model="s.cta" class="hero-cta-input" :placeholder="t.heroCtaPh"/>
            </div>
            <!-- TEXT -->
            <div v-else-if="s.type==='text'" class="sec-text" :style="s.style">
              <textarea v-model="s.content" class="text-input" :placeholder="t.textPh"/>
            </div>
            <!-- IMAGE -->
            <div v-else-if="s.type==='image'" class="sec-image" :style="s.style">
              <label class="img-drop" v-if="!s.url">
                <input type="file" accept="image/*" @change="uploadImage($event,s)" hidden/>
                <span>🖼</span><span>{{ t.imgUploadHint }}</span>
              </label>
              <div v-else class="img-preview-wrap">
                <img :src="s.url" class="img-preview" :alt="s.alt"/>
                <div class="img-overlay">
                  <label class="btn-action" style="cursor:pointer"><input type="file" accept="image/*" @change="uploadImage($event,s)" hidden/>{{ t.imgChange }}</label>
                  <input v-model="s.alt" :placeholder="t.imgAltPh" class="alt-input"/>
                </div>
              </div>
            </div>
            <!-- GALLERY -->
            <div v-else-if="s.type==='gallery'" class="sec-gallery" :style="s.style">
              <div class="gallery-toolbar">
                <span class="sec-type-label">🎨 {{ t.galleryLabel }} — {{ s.images.length }} {{ t.galleryImages }}</span>
                <label class="btn-action small" style="cursor:pointer"><input type="file" accept="image/*" multiple @change="uploadGalleryImage($event,s)" hidden/>{{ t.galleryAdd }}</label>
              </div>
              <div v-if="s.images.length" class="gallery-grid-edit" :style="`grid-template-columns:repeat(${s.columns||3},1fr)`">
                <div v-for="(img,gi) in s.images" :key="img.id" class="gallery-item">
                  <img :src="img.url" :alt="img.alt"/>
                  <button class="gallery-del" @click.stop="removeGalleryImage(s,gi)">✕</button>
                </div>
              </div>
              <div v-else class="gallery-empty">{{ t.galleryEmpty }}</div>
            </div>
            <!-- VIDEO -->
            <div v-else-if="s.type==='video'" class="sec-video" :style="s.style">
              <div class="video-toolbar"><span class="sec-type-label">▶️ {{ t.videoLabel }}</span></div>
              <input v-model="s.title" class="video-title-input" :placeholder="t.videoTitlePh"/>
              <input v-model="s.url" class="video-url-input" :placeholder="t.videoUrlPh"/>
              <div v-if="s.url" class="video-preview"><iframe :src="getEmbedUrl(s.url)" allowfullscreen class="video-iframe"/></div>
              <div v-else class="video-placeholder"><span>▶</span><span>{{ t.videoHint }}</span></div>
            </div>
            <!-- PRODUCTS -->
            <div v-else-if="s.type==='products'" class="sec-products" :style="s.style">
              <div class="products-toolbar">
                <span class="sec-type-label">🛍️ {{ t.productsLabel }}</span>
                <button class="btn-action small" @click.stop="addProduct(s)">{{ t.addProduct }}</button>
              </div>
              <div class="products-grid-edit">
                <div v-for="(p,pi) in s.items" :key="p.id" class="product-card-edit">
                  <button class="product-del" @click.stop="removeProduct(s,pi)">✕</button>
                  <label class="product-img-upload">
                    <input type="file" accept="image/*" @change="uploadProductImage($event,p)" hidden/>
                    <img v-if="p.image" :src="p.image" class="product-img"/>
                    <div v-else class="product-img-ph">🛍️<span>Photo</span></div>
                  </label>
                  <div class="product-fields">
                    <input v-model="p.badge" class="product-badge-input" :placeholder="t.badgePh"/>
                    <input v-model="p.name" class="product-name-input" :placeholder="t.productNamePh"/>
                    <input v-model="p.description" class="product-desc-input" :placeholder="t.productDescPh"/>
                    <div class="product-price-row">
                      <input v-model="p.price" class="product-price-input" :placeholder="t.productPricePh"/>
                      <select v-model="p.currency" class="product-currency-select">
                        <option>€</option><option>$</option><option>£</option><option>MAD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- FEATURES -->
            <div v-else-if="s.type==='features'" class="sec-features" :style="s.style">
              <div class="features-grid">
                <div v-for="(item,fi) in s.items" :key="fi" class="feature-item">
                  <input v-model="item.icon" class="feat-icon-input"/>
                  <input v-model="item.title" class="feat-title-input" :placeholder="t.featureTitlePh"/>
                  <input v-model="item.desc" class="feat-desc-input" :placeholder="t.featureDescPh"/>
                </div>
              </div>
            </div>
            <!-- PAYMENT -->
            <div v-else-if="s.type==='payment'" class="sec-payment" :style="s.style">
              <div class="payment-edit-header">
                <span class="sec-type-label">💳 {{ t.paymentLabel }}</span>
                <div class="pay-providers-badge"><span class="badge-stripe">Stripe</span><span class="badge-paypal">PayPal</span></div>
              </div>
              <div class="payment-edit-fields">
                <input v-model="s.title" class="payment-title-input" :placeholder="t.paymentTitlePh"/>
                <input v-model="s.description" class="payment-desc-input" :placeholder="t.paymentDescPh"/>
                <div class="payment-price-row">
                  <input v-model="s.amount" class="payment-amount-input" :placeholder="t.paymentAmountPh"/>
                  <select v-model="s.currency" class="payment-currency-select">
                    <option>€</option><option>$</option><option>£</option><option>MAD</option>
                  </select>
                </div>
              </div>
              <div class="payment-preview-btns">
                <button class="preview-pay-btn stripe-preview" @click.stop="paymentProvider='stripe';openPaymentModal(s)">{{ t.testStripe }}</button>
                <button class="preview-pay-btn paypal-preview" @click.stop="paymentProvider='paypal';openPaymentModal(s)">{{ t.testPaypal }}</button>
              </div>
              <div class="payment-config-hint">
                <span>⚙</span>
                <button @click.stop="openConfigEditor('stripe')">stripe.js</button>
                <span>·</span>
                <button @click.stop="openConfigEditor('paypal')">paypal.js</button>
              </div>
            </div>
            <!-- FORM -->
            <div v-else-if="s.type==='form'" class="sec-form" :style="s.style">
              <p class="form-label-heading">{{ t.contactLabel }}</p>
              <div class="form-fields">
                <input :placeholder="t.namePh" disabled class="form-field"/>
                <input :placeholder="t.emailPh" disabled class="form-field"/>
                <textarea :placeholder="t.msgPh" disabled class="form-field form-textarea"/>
                <button disabled class="form-submit">{{ t.sendBtn }}</button>
              </div>
            </div>
            <!-- DIVIDER -->
            <div v-else-if="s.type==='divider'" class="sec-divider" :style="s.style">
              <div class="divider-line"></div>
            </div>
          </div>
        </template>

        <!-- PREVIEW -->
        <template v-else>
          <div class="preview-mode">

            <!-- ── Nav du site dans l'aperçu interne ── -->
            <nav class="prev-site-nav" :style="{background: site.theme?.nav || '#fff'}" v-if="site.pages?.length > 1">
              <div class="prev-nav-brand">
                <img v-if="siteLogo" :src="siteLogo" class="prev-nav-logo" alt="logo"/>
                <span v-else class="prev-nav-icon">◈</span>
                <span class="prev-nav-name" :style="{color: site.theme?.navText || '#1a1a2e'}">{{ siteName }}</span>
              </div>
              <div class="prev-nav-pages">
                <button
                  v-for="(p, i) in site.pages" :key="p.id"
                  class="prev-nav-tab"
                  :class="{active: currentPageIndex === i}"
                  :style="currentPageIndex === i ? {background: site.theme?.accent || '#6c63ff', color: '#fff'} : {color: site.theme?.navText || '#6b7280'}""
                  @click="currentPageIndex = i"
                >{{ p.name }}</button>
              </div>
            </nav>

            <div v-for="s in currentPage.sections" :key="s.id">
              <div v-if="s.type==='hero'" class="prev-hero" :style="s.style">
                <h1 class="prev-hero-title">{{ s.content }}</h1>
                <p class="prev-hero-sub">{{ s.subtitle }}</p>
                <button v-if="s.cta" class="prev-hero-cta">{{ s.cta }}</button>
              </div>
              <div v-else-if="s.type==='text'" class="prev-text" :style="s.style"><p>{{ s.content }}</p></div>
              <div v-else-if="s.type==='image'" class="prev-image" :style="s.style">
                <img v-if="s.url" :src="s.url" :alt="s.alt" class="prev-img"/>
                <div v-else class="prev-img-placeholder">{{ t.prevImgEmpty }}</div>
              </div>
              <div v-else-if="s.type==='gallery'" class="prev-gallery" :style="s.style">
                <div v-if="s.images.length" class="prev-gallery-grid" :style="`grid-template-columns:repeat(${s.columns||3},1fr)`">
                  <div v-for="img in s.images" :key="img.id" class="prev-gallery-item"><img :src="img.url" :alt="img.alt"/></div>
                </div>
                <div v-else class="prev-img-placeholder">{{ t.prevGalleryEmpty }}</div>
              </div>
              <div v-else-if="s.type==='video'" class="prev-video" :style="s.style">
                <h3 v-if="s.title" class="prev-video-title">{{ s.title }}</h3>
                <div v-if="s.url" class="prev-video-wrap"><iframe :src="getEmbedUrl(s.url)" allowfullscreen class="prev-video-iframe"/></div>
                <div v-else class="prev-img-placeholder">{{ t.prevVideoEmpty }}</div>
              </div>
              <div v-else-if="s.type==='products'" class="prev-products" :style="s.style">
                <div class="prev-products-grid">
                  <div v-for="p in s.items" :key="p.id" class="prev-product-card">
                    <div class="prev-product-img-wrap">
                      <img v-if="p.image" :src="p.image" class="prev-product-img"/>
                      <div v-else class="prev-product-img-ph">🛍️</div>
                      <span v-if="p.badge" class="prev-product-badge">{{ p.badge }}</span>
                    </div>
                    <div class="prev-product-body">
                      <div class="prev-product-name">{{ p.name }}</div>
                      <div class="prev-product-desc">{{ p.description }}</div>
                      <div class="prev-product-footer">
                        <span class="prev-product-price">{{ p.price }}{{ p.currency }}</span>
                        <button class="prev-product-btn" @click.stop="addToCart(p)">🛒 {{ t.prevBuyBtn }}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else-if="s.type==='features'" class="prev-features" :style="s.style">
                <div class="prev-features-grid">
                  <div v-for="(item,fi) in s.items" :key="fi" class="prev-feature-card">
                    <span class="prev-feat-icon">{{ item.icon }}</span>
                    <strong>{{ item.title }}</strong><p>{{ item.desc }}</p>
                  </div>
                </div>
              </div>
              <div v-else-if="s.type==='payment'" class="prev-payment" :style="s.style">
                <h2 class="prev-payment-title">{{ s.title }}</h2>
                <p class="prev-payment-desc">{{ s.description }}</p>
                <div class="prev-payment-amount">{{ s.amount }}{{ s.currency }}</div>
                <div class="prev-payment-btns">
                  <button class="prev-pay-btn stripe-btn" @click="paymentProvider='stripe';openPaymentModal(s)">{{ t.prevPayStripe }}</button>
                  <button class="prev-pay-btn paypal-btn" @click="paymentProvider='paypal';openPaymentModal(s)">{{ t.prevPayPaypal }}</button>
                </div>
              </div>
              <div v-else-if="s.type==='form'" class="prev-form" :style="s.style">
                <h3>{{ t.prevContactTitle }}</h3>
                <input :placeholder="t.prevNamePh" class="prev-form-field"/>
                <input :placeholder="t.prevEmailPh" class="prev-form-field"/>
                <textarea :placeholder="t.prevMsgPh" class="prev-form-field prev-form-ta"></textarea>
                <button class="prev-form-btn">{{ t.prevSendBtn }}</button>
              </div>
              <div v-else-if="s.type==='divider'" class="prev-divider" :style="s.style">
                <hr class="prev-divider-line"/>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f0f11;--surface:#17171a;--surface2:#1f1f23;--border:#2a2a2f;--border2:#35353c;--accent:#6c63ff;--accent2:#a78bfa;--text:#f0f0f0;--text2:#8a8a9a;--text3:#5a5a6a;--green:#22c55e;--red:#ef4444;--stripe:#635bff;--paypal:#ffc439;--radius:8px;--sidebar-w:260px;--topbar-h:56px}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif}
.saas-root{min-height:100vh;display:flex;flex-direction:column;background:var(--bg)}
.notif{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--green);color:white;padding:10px 24px;border-radius:100px;font-size:14px;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(34,197,94,.35)}
.notif.error{background:var(--red);box-shadow:0 8px 24px rgba(239,68,68,.35)}
.notif-enter-active,.notif-leave-active{transition:all .3s ease}
.notif-enter-from,.notif-leave-to{opacity:0;transform:translateX(-50%) translateY(12px)}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal-box{background:var(--surface);border:1px solid var(--border2);border-radius:16px;padding:32px;position:relative;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.modal-close{position:absolute;top:16px;right:16px;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.modal-header{text-align:center;margin-bottom:24px}
.modal-icon{font-size:36px;display:block;margin-bottom:12px}
.modal-header h2{font-family:'Playfair Display',serif;font-size:24px;color:var(--text);margin-bottom:6px}

.pay-slug-warning-box{text-align:center;max-width:440px}
.pay-slug-warning-icon{font-size:36px;margin-bottom:8px}
.pay-slug-warning-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--text);margin:0 0 12px}
.pay-slug-warning-text{font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:16px;text-align:left}
.pay-slug-warning-text code{background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:13px}
.pay-slug-warning-link{display:block;font-size:14px;font-weight:600;color:var(--accent,#6c63ff);text-decoration:none;background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:12px;margin-bottom:16px;word-break:break-all}
.pay-slug-warning-link:hover{text-decoration:underline}
.pay-slug-warning-actions{display:flex;flex-direction:column;gap:10px}
.pay-slug-btn{justify-content:center;width:100%;padding:11px;font-size:14px}
.modal-desc{font-size:14px;color:var(--text2)}
.modal-amount{font-size:42px;font-weight:700;color:var(--accent);margin-top:12px}
.modal-enter-active,.modal-leave-active{transition:all .25s ease}
.modal-enter-from,.modal-leave-to{opacity:0;transform:scale(.95)}
.pay-tabs{display:flex;gap:8px;margin-bottom:20px}
.pay-tab-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:var(--surface2);border:2px solid var(--border2);color:var(--text2);font-size:14px;font-weight:600;padding:10px;border-radius:var(--radius);cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
.pay-tab-btn.active{border-color:var(--stripe);color:var(--stripe);background:rgba(99,91,255,.1)}
.pay-tab-btn.paypal-tab.active{border-color:#b8860b;color:#b8860b;background:rgba(255,196,57,.1)}
.pay-form{display:flex;flex-direction:column;gap:14px}
.pay-form-row label,.pay-form-two label{display:block;font-size:11px;color:var(--text2);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.card-input-mock{background:var(--surface2);border:1px solid var(--border2);color:var(--text3);padding:10px 14px;border-radius:var(--radius);font-size:14px;font-family:monospace;letter-spacing:1px}
.pay-form-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pay-note{font-size:11px;color:var(--text3);text-align:center}
.pay-note code{background:var(--surface2);padding:2px 6px;border-radius:4px;color:var(--accent2)}
.pay-submit{width:100%;padding:14px;border:none;border-radius:var(--radius);font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:'DM Sans',sans-serif;transition:opacity .15s;margin-top:4px}
.pay-submit:disabled{opacity:.6;cursor:not-allowed}
.stripe-submit{background:var(--stripe);color:white}
.paypal-submit{background:var(--paypal);color:#003087}
.paypal-info{text-align:center;padding:16px 0}
.paypal-logo{font-size:24px;font-weight:800;color:#003087;background:var(--paypal);display:inline-block;padding:6px 20px;border-radius:8px;margin-bottom:14px}
.paypal-info p{font-size:14px;color:var(--text2);line-height:1.6}
.paypal-spinner{border-top-color:#003087}
.pay-config-links{display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
.pay-config-links button{flex:1;background:var(--surface2);border:1px solid var(--border2);color:var(--text2);font-size:11px;padding:8px;border-radius:var(--radius);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.pay-config-links button:hover{border-color:var(--accent);color:var(--accent)}
.pay-success{text-align:center;padding:20px 0}
.pay-success-icon{width:64px;height:64px;border-radius:50%;background:var(--green);color:white;font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.pay-success h2{font-family:'Playfair Display',serif;font-size:24px;color:var(--text);margin-bottom:8px}
.pay-success p{color:var(--text2);margin-bottom:24px}
.config-modal{max-width:640px}
.config-editor-textarea{width:100%;height:300px;background:#0a0a0c;border:1px solid var(--border2);color:#a78bfa;font-family:'Courier New',monospace;font-size:13px;line-height:1.6;padding:16px;border-radius:var(--radius);resize:vertical;outline:none;margin-bottom:16px}
.config-modal-actions{display:flex;gap:10px;justify-content:flex-end}
.export-modal{max-width:520px}
.export-options{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
.export-card{background:var(--surface2);border:2px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:all .15s;text-align:center;position:relative}
.export-card:hover{border-color:var(--accent);background:rgba(108,99,255,.08)}
.export-icon{font-size:32px;display:block;margin-bottom:10px}
.export-card strong{display:block;font-size:14px;color:var(--text);margin-bottom:6px}
.export-card p{font-size:12px;color:var(--text3);line-height:1.5}
.export-badge{position:absolute;top:10px;right:10px;background:var(--accent);color:white;font-size:9px;font-weight:700;padding:2px 7px;border-radius:100px;text-transform:uppercase}
.export-note{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:12px;color:var(--text2);line-height:1.6}
.export-note strong{color:var(--text)}
.topbar{position:fixed;top:0;left:0;right:0;z-index:100;height:var(--topbar-h);background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0;padding:0 16px;overflow:hidden}
.topbar-brand{display:flex;align-items:center;gap:8px;min-width:var(--sidebar-w);padding-right:16px;border-right:1px solid var(--border)}
.brand-icon{font-size:20px;color:var(--accent)}
.brand-name{font-family:'Playfair Display',serif;font-size:17px;font-weight:600;letter-spacing:-.3px}
.brand-name-input{background:transparent;border:none;color:var(--text);font-family:'Playfair Display',serif;font-size:17px;font-weight:600;letter-spacing:-.3px;outline:none;width:140px;min-width:80px;max-width:180px;border-bottom:1px solid transparent;transition:border-color .2s;padding:0}
.brand-name-input:hover,.brand-name-input:focus{border-bottom-color:var(--border2)}
.brand-name-input::placeholder{color:var(--text3)}
.brand-badge{background:var(--accent);color:white;font-size:9px;font-weight:700;padding:2px 7px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px}
.page-tabs{flex:1;display:flex;align-items:center;gap:2px;padding:0 16px;overflow-x:auto;scrollbar-width:none}
.page-tabs::-webkit-scrollbar{display:none}
.page-tab{display:flex;align-items:center;gap:6px;background:transparent;border:1px solid transparent;color:var(--text2);font-size:13px;padding:5px 12px;border-radius:var(--radius);cursor:pointer;white-space:nowrap;transition:all .15s;font-family:'DM Sans',sans-serif}
.page-tab:hover{background:var(--surface2);color:var(--text)}
.page-tab.active{background:var(--surface2);color:var(--text);border-color:var(--border2)}
.page-tab.add-tab{color:var(--accent);font-size:16px;padding:3px 10px}
.tab-del{opacity:0;font-size:12px;color:var(--text3);transition:opacity .15s;margin-left:4px}
.page-tab:hover .tab-del{opacity:1}
.page-tab-input{background:transparent;border:none;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:1px solid var(--accent);border-radius:4px;padding:1px 4px;min-width:80px;max-width:140px}
.topbar-actions{display:flex;align-items:center;gap:8px;padding-left:16px;border-left:1px solid var(--border)}
.save-status{font-size:12px;color:var(--text3);white-space:nowrap}
.save-status.saved{color:var(--green)}
.btn-action{display:flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:13px;font-weight:500;padding:6px 14px;border-radius:var(--radius);cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
.btn-action:hover{background:var(--border2)}
.btn-action.primary{background:var(--accent);border-color:var(--accent);color:white}
.btn-action.primary:hover{background:#7c73ff}
.btn-action:disabled{opacity:.45;cursor:not-allowed}
.btn-action.small{font-size:12px;padding:4px 10px}
.btn-action.icon-btn{padding:6px 10px;font-size:16px}
.spinner{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .6s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
.lang-select{background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:12px;padding:5px 8px;border-radius:var(--radius);cursor:pointer;font-family:'DM Sans',sans-serif;outline:none}
.publish-btn{background:linear-gradient(135deg,#10b981,#059669);border-color:#059669;color:white;font-weight:600}
.publish-btn:hover{background:linear-gradient(135deg,#059669,#047857);border-color:#047857}
.workspace{display:flex;margin-top:var(--topbar-h);min-height:calc(100vh - var(--topbar-h))}
.sidebar{width:var(--sidebar-w);flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:var(--topbar-h);height:calc(100vh - var(--topbar-h));overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.sidebar-tabs{display:flex;border-bottom:1px solid var(--border);flex-shrink:0}
.sidebar-tabs button{flex:1;padding:12px;font-size:13px;font-weight:500;background:transparent;border:none;color:var(--text2);cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent}
.sidebar-tabs button.active{color:var(--text);border-bottom-color:var(--accent)}
.sidebar-content{padding:16px;flex:1}
.sidebar-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:10px}
.section-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.section-card{display:flex;flex-direction:column;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 8px;cursor:pointer;transition:all .15s;text-align:left}
.section-card:hover{border-color:var(--accent);background:rgba(108,99,255,.08)}
.sc-icon{font-size:16px}
.sc-label{font-size:12px;font-weight:600;color:var(--text)}
.sc-desc{font-size:10px;color:var(--text3);line-height:1.4}
.prop-panel{border-top:1px solid var(--border);padding-top:16px}
.prop-row{margin-bottom:14px}
.prop-row label{display:block;font-size:11px;color:var(--text2);margin-bottom:6px;font-weight:500}
.style-btns{display:flex;gap:4px;flex-wrap:wrap}
.style-btns button{background:var(--surface2);border:1px solid var(--border2);color:var(--text2);font-size:13px;padding:4px 10px;border-radius:4px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
.style-btns button:hover{background:var(--border2);color:var(--text)}
.style-btns button.on{background:var(--accent);border-color:var(--accent);color:white}
.color-input{width:40px;height:30px;border:1px solid var(--border2);border-radius:4px;cursor:pointer;background:none;padding:2px}
.prop-select{width:100%;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:13px;padding:7px 10px;border-radius:var(--radius);cursor:pointer;font-family:'DM Sans',sans-serif}
.canvas{flex:1;background:#0a0a0c;padding:32px;display:flex;justify-content:center;overflow-y:auto}
.canvas.preview{padding:0;background:white}
.canvas-inner{width:100%;max-width:900px;min-height:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.6)}
.canvas.preview .canvas-inner{max-width:100%;border-radius:0;min-height:100vh;box-shadow:none}
.empty-page{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;color:#999;text-align:center;gap:8px}
.empty-page span{font-size:32px;opacity:.4}
.empty-page p{font-size:14px}
.section-block{position:relative;border:2px solid transparent;cursor:pointer;transition:border-color .15s}
.section-block:hover{border-color:rgba(108,99,255,.3)}
.section-block.is-active{border-color:var(--accent)!important}
.section-actions{position:absolute;top:8px;right:8px;display:flex;gap:4px;z-index:10;opacity:0;transition:opacity .15s}
.section-block:hover .section-actions,.section-block.is-active .section-actions{opacity:1}
.section-actions button{background:#fff;border:1px solid #ddd;border-radius:4px;width:28px;height:28px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#555;transition:all .15s}
.section-actions button:hover{background:#f0f0f0}
.section-actions button.del-btn:hover{background:#fef2f2;color:var(--red);border-color:#fecaca}
.section-actions button:disabled{opacity:.3;cursor:default}
.sec-type-label{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
.sec-hero{padding:60px 40px;background:linear-gradient(135deg,#f8f7ff 0%,#ede9fe 100%);display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.hero-title-input{width:100%;font-family:'Playfair Display',serif;font-size:42px;font-weight:600;color:#1a1a2e;border:none;background:transparent;resize:none;line-height:1.2;outline:none;min-height:100px}
.hero-sub-input{width:100%;font-size:18px;color:#555;background:transparent;border:none;outline:none;border-bottom:1px dashed rgba(108,99,255,.4);padding-bottom:4px}
.hero-cta-input{font-size:14px;background:#6c63ff;color:white;border:none;outline:none;border-radius:8px;padding:10px 24px;font-weight:600;font-family:'DM Sans',sans-serif;margin-top:8px;cursor:text}
.sec-text{padding:32px 40px}
.text-input{width:100%;min-height:120px;resize:vertical;border:1px dashed #d1d5db;border-radius:6px;padding:12px;font-size:16px;line-height:1.7;color:#374151;outline:none;background:#fafafa;font-family:'DM Sans',sans-serif;transition:border-color .15s}
.text-input:focus{border-color:var(--accent);background:white}
.sec-image{padding:20px 40px}
.img-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:2px dashed #d1d5db;border-radius:12px;padding:50px 20px;cursor:pointer;color:#9ca3af;transition:all .15s}
.img-drop:hover{border-color:var(--accent);color:#6c63ff}
.img-drop span:first-child{font-size:32px}
.img-drop span:last-child{font-size:14px}
.img-preview-wrap{position:relative}
.img-preview{width:100%;border-radius:8px;display:block}
.img-overlay{position:absolute;inset:0;background:rgba(0,0,0,.5);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;opacity:0;transition:opacity .2s}
.img-preview-wrap:hover .img-overlay{opacity:1}
.alt-input{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-align:center;outline:none;width:200px;font-family:'DM Sans',sans-serif}
.sec-gallery{padding:20px 40px}
.gallery-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.gallery-grid-edit{display:grid;gap:8px}
.gallery-item{position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1}
.gallery-item img{width:100%;height:100%;object-fit:cover}
.gallery-del{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.6);border:none;color:white;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.gallery-item:hover .gallery-del{opacity:1}
.gallery-empty{border:2px dashed #d1d5db;border-radius:12px;padding:40px;text-align:center;color:#9ca3af;font-size:14px}
.sec-video{padding:20px 40px}
.video-toolbar{margin-bottom:10px}
.video-title-input{width:100%;font-size:18px;font-weight:600;color:#1a1a2e;border:none;border-bottom:1px dashed #d1d5db;outline:none;padding-bottom:6px;margin-bottom:10px;background:transparent;font-family:'DM Sans',sans-serif}
.video-url-input{width:100%;font-size:13px;color:#6b7280;border:1px dashed #d1d5db;border-radius:6px;outline:none;padding:8px 12px;margin-bottom:12px;background:#fafafa;font-family:'DM Sans',sans-serif}
.video-preview{border-radius:10px;overflow:hidden}
.video-iframe{width:100%;height:340px;border:none;display:block}
.video-placeholder{border:2px dashed #d1d5db;border-radius:12px;padding:50px;text-align:center;color:#9ca3af;display:flex;flex-direction:column;align-items:center;gap:8px}
.video-placeholder span:first-child{font-size:36px;opacity:.4}
.sec-products{padding:20px 40px}
.products-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.products-grid-edit{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.product-card-edit{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;position:relative;display:flex;flex-direction:column}
.product-del{position:absolute;top:8px;right:8px;background:white;border:1px solid #e5e7eb;color:#ef4444;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;z-index:2}
.product-img-upload{display:block;cursor:pointer}
.product-img{width:100%;height:120px;object-fit:cover;display:block}
.product-img-ph{width:100%;height:120px;background:#f3f4f6;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:28px;color:#9ca3af;gap:4px}
.product-img-ph span{font-size:11px}
.product-fields{padding:10px;display:flex;flex-direction:column;gap:6px}
.product-badge-input{font-size:10px;font-weight:700;background:#fef3c7;border:none;color:#92400e;padding:3px 8px;border-radius:100px;outline:none;width:fit-content;font-family:'DM Sans',sans-serif;text-transform:uppercase;letter-spacing:.5px}
.product-name-input{font-size:14px;font-weight:600;color:#111;border:none;border-bottom:1px dashed #d1d5db;outline:none;background:transparent;font-family:'DM Sans',sans-serif;padding-bottom:3px}
.product-desc-input{font-size:12px;color:#6b7280;border:none;outline:none;background:transparent;font-family:'DM Sans',sans-serif}
.product-price-row{display:flex;align-items:center;gap:6px;margin-top:4px}
.product-price-input{font-size:16px;font-weight:700;color:#6c63ff;border:none;outline:none;background:transparent;width:70px;font-family:'DM Sans',sans-serif}
.product-currency-select{font-size:13px;background:transparent;border:1px solid #e5e7eb;border-radius:4px;color:#6b7280;padding:2px 4px;cursor:pointer}
.sec-features{padding:40px}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.feature-item{background:#f8f9fa;border:1px solid #e9ecef;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:6px}
.feat-icon-input{font-size:24px;background:transparent;border:none;outline:none;width:40px}
.feat-title-input{font-weight:600;font-size:15px;background:transparent;border:none;border-bottom:1px dashed #d1d5db;outline:none;color:#1a1a2e;font-family:'DM Sans',sans-serif;padding-bottom:4px}
.feat-desc-input{font-size:13px;color:#6b7280;background:transparent;border:none;outline:none;font-family:'DM Sans',sans-serif}
.sec-payment{padding:32px 40px;background:linear-gradient(135deg,#f8f7ff,#ede9fe)}
.payment-edit-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.pay-providers-badge{display:flex;gap:6px}
.badge-stripe{background:var(--stripe);color:white;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px}
.badge-paypal{background:var(--paypal);color:#003087;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px}
.payment-edit-fields{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.payment-title-input{font-family:'Playfair Display',serif;font-size:24px;font-weight:600;color:#1a1a2e;border:none;border-bottom:1px dashed rgba(108,99,255,.4);outline:none;background:transparent;padding-bottom:6px}
.payment-desc-input{font-size:15px;color:#6b7280;border:none;outline:none;background:transparent;border-bottom:1px dashed #e5e7eb;padding-bottom:4px;font-family:'DM Sans',sans-serif}
.payment-price-row{display:flex;align-items:center;gap:8px}
.payment-amount-input{font-size:36px;font-weight:700;color:#6c63ff;border:none;outline:none;background:transparent;width:120px;font-family:'DM Sans',sans-serif}
.payment-currency-select{font-size:18px;background:transparent;border:1px solid #d1d5db;border-radius:6px;color:#6b7280;padding:4px 8px;cursor:pointer}
.payment-preview-btns{display:flex;gap:10px;margin-bottom:16px}
.preview-pay-btn{padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .15s}
.preview-pay-btn:hover{transform:translateY(-1px)}
.stripe-preview{background:var(--stripe);color:white}
.paypal-preview{background:var(--paypal);color:#003087}
.payment-config-hint{font-size:12px;color:#9ca3af;display:flex;align-items:center;gap:6px}
.payment-config-hint button{background:none;border:none;color:#6c63ff;font-size:12px;cursor:pointer;text-decoration:underline;font-family:'DM Sans',sans-serif}
.sec-form{padding:40px}
.form-label-heading{font-size:18px;font-weight:600;color:#1a1a2e;margin-bottom:16px;font-family:'Playfair Display',serif}
.form-fields{display:flex;flex-direction:column;gap:10px;max-width:480px}
.form-field{padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#374151;background:#f9fafb;font-family:'DM Sans',sans-serif}
.form-textarea{min-height:100px;resize:none}
.form-submit{background:#6c63ff;color:white;border:none;border-radius:8px;padding:11px 24px;font-weight:600;font-size:14px;cursor:default;font-family:'DM Sans',sans-serif;align-self:flex-start}
.sec-divider{padding:12px 40px}
.divider-line{border:none;border-top:1px solid #e5e7eb}
.preview-mode{font-family:'DM Sans',sans-serif}
.prev-hero{padding:100px 60px;background:linear-gradient(135deg,#f8f7ff,#ede9fe);text-align:center}
.prev-hero-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:600;color:#1a1a2e;line-height:1.15;white-space:pre-line;margin-bottom:16px}
.prev-hero-sub{font-size:20px;color:#6b7280;margin-bottom:32px}
.prev-hero-cta{background:#6c63ff;color:white;border:none;border-radius:10px;padding:14px 32px;font-size:16px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .2s}
.prev-hero-cta:hover{transform:translateY(-2px)}
.prev-text{padding:48px 60px}
.prev-text p{font-size:17px;line-height:1.8;color:#374151;max-width:720px}
.prev-image{padding:32px 60px}
.prev-img{width:100%;border-radius:12px}
.prev-img-placeholder{height:200px;background:#f3f4f6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:14px;margin:32px 60px}
.prev-gallery{padding:32px 60px}
.prev-gallery-grid{display:grid;gap:10px}
.prev-gallery-item{border-radius:10px;overflow:hidden;aspect-ratio:1}
.prev-gallery-item img{width:100%;height:100%;object-fit:cover}
.prev-video{padding:32px 60px}
.prev-video-title{font-family:'Playfair Display',serif;font-size:24px;color:#1a1a2e;margin-bottom:16px}
.prev-video-wrap{border-radius:12px;overflow:hidden}
.prev-video-iframe{width:100%;height:400px;border:none;display:block}
.prev-products{padding:48px 60px;background:#fafafa}
.prev-products-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.prev-product-card{background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:transform .2s}
.prev-product-card:hover{transform:translateY(-4px)}
.prev-product-img-wrap{position:relative}
.prev-product-img{width:100%;height:180px;object-fit:cover;display:block}
.prev-product-img-ph{width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:40px}
.prev-product-badge{position:absolute;top:10px;left:10px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px}
.prev-product-body{padding:16px}
.prev-product-name{font-size:15px;font-weight:600;color:#111;margin-bottom:6px}
.prev-product-desc{font-size:13px;color:#6b7280;line-height:1.5;margin-bottom:14px}
.prev-product-footer{display:flex;align-items:center;justify-content:space-between}
.prev-product-price{font-size:18px;font-weight:700;color:#6c63ff}
.prev-product-btn{background:#6c63ff;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
.prev-features{padding:60px;background:#fafafa}
.prev-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:840px;margin:0 auto}
.prev-feature-card{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:28px 24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.prev-feat-icon{font-size:32px;display:block;margin-bottom:12px}
.prev-feature-card strong{font-size:16px;color:#111;display:block;margin-bottom:6px}
.prev-feature-card p{font-size:14px;color:#6b7280;line-height:1.5}
.prev-payment{padding:80px 60px;background:linear-gradient(135deg,#f8f7ff,#ede9fe);text-align:center}
.prev-payment-title{font-family:'Playfair Display',serif;font-size:36px;color:#1a1a2e;margin-bottom:10px}
.prev-payment-desc{font-size:16px;color:#6b7280;margin-bottom:24px}
.prev-payment-amount{font-size:64px;font-weight:700;color:#6c63ff;margin-bottom:36px}
.prev-payment-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.prev-pay-btn{padding:14px 32px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .2s}
.prev-pay-btn:hover{transform:translateY(-2px)}
.prev-pay-btn.stripe-btn{background:var(--stripe);color:white}
.prev-pay-btn.paypal-btn{background:var(--paypal);color:#003087}
.prev-form{padding:60px;background:#f8f7ff;display:flex;flex-direction:column;align-items:center}
.prev-form h3{font-family:'Playfair Display',serif;font-size:30px;color:#1a1a2e;margin-bottom:24px}
.prev-form-field{width:100%;max-width:500px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;margin-bottom:12px;font-family:'DM Sans',sans-serif;background:white;color:#374151}
.prev-form-ta{min-height:120px;resize:none}
.prev-form-btn{background:#6c63ff;color:white;border:none;border-radius:10px;padding:13px 28px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
.prev-divider{padding:8px 60px}
.prev-divider-line{border:none;border-top:1px solid #e5e7eb}
.logo-area{display:flex;align-items:center;cursor:pointer;border-radius:6px;overflow:hidden;width:32px;height:32px;flex-shrink:0}
.site-logo-img{width:32px;height:32px;object-fit:contain;border-radius:6px}
.publish-modal{max-width:560px}
.publish-form{display:flex;flex-direction:column;gap:16px}
.pub-field label{display:block;font-size:11px;color:var(--text2);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.pub-url-wrap{display:flex;align-items:center;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden}
.pub-url-prefix{font-size:11px;color:var(--text3);padding:10px 8px;white-space:nowrap;border-right:1px solid var(--border2)}
.pub-input{flex:1;background:transparent;border:none;color:var(--text);font-size:13px;padding:10px 12px;outline:none;font-family:'DM Sans',sans-serif}
.pub-preview-url{font-size:12px;color:#10b981;margin-top:6px;font-weight:500;word-break:break-all}
.pub-success-badge{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3);border-radius:8px;padding:12px 16px;text-align:center;font-weight:600;margin-bottom:16px}
.pub-url-card{background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:14px}
.pub-url-card label{display:block;font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
.pub-live-url{color:var(--accent);font-size:13px;font-weight:600;text-decoration:none;word-break:break-all;display:block}
.pub-live-url:hover{text-decoration:underline}
.pub-live-url--uid{font-size:11px;color:var(--text3);font-family:monospace}
.pub-equiv-note{font-size:11px;color:var(--green);margin-top:6px;font-weight:500}
.dns-section{background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:14px}
.dns-title{font-family:'Playfair Display',serif;font-size:15px;color:var(--text);margin-bottom:6px}
.dns-desc{font-size:12px;color:var(--text2);margin-bottom:10px}
.dns-table{display:flex;flex-direction:column;gap:4px}
.dns-row{display:grid;grid-template-columns:80px 60px 1fr;gap:8px;font-size:12px;padding:6px 8px;border-radius:4px}
.dns-head{font-weight:700;color:var(--text2);font-size:10px;text-transform:uppercase;letter-spacing:.5px;background:var(--surface);border-radius:4px}
.dns-row:not(.dns-head){background:rgba(108,99,255,.06);color:var(--text)}
.dns-type{color:var(--accent2);font-weight:700;font-family:monospace}
.dns-val{font-family:monospace;font-size:11px;color:var(--text2);word-break:break-all}
.pub-firestore-info{display:flex;align-items:flex-start;gap:10px;background:rgba(255,140,0,.06);border:1px solid rgba(255,140,0,.2);border-radius:8px;padding:12px;margin-top:12px}
.pub-fi-icon{font-size:18px;flex-shrink:0}
.pub-fi-title{font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.pub-fi-detail{font-size:11px;color:var(--text2);font-family:monospace;line-height:1.6}
.pub-fi-detail code{background:var(--surface);padding:1px 5px;border-radius:3px;color:#fb923c}
.pub-note{font-size:12px;color:var(--text3);text-align:center;line-height:1.6}
.pub-note strong{color:var(--text2)}
.dns-input-modal{max-width:520px}
.dns-input-form{display:flex;flex-direction:column;gap:12px;margin-bottom:20px}
.dns-input-row label{display:block;font-size:11px;color:var(--text2);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.dns-input-field{width:100%;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-size:13px;padding:10px 14px;border-radius:var(--radius);outline:none;font-family:'DM Sans',sans-serif;transition:border-color .15s}
.dns-input-field:focus{border-color:var(--accent)}
.dns-input-field::placeholder{color:var(--text3)}
.dns-instructions{background:rgba(108,99,255,.06);border:1px solid rgba(108,99,255,.15);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:6px}
.dns-inst-title{font-size:11px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.dns-inst-step{font-size:12px;color:var(--text2);line-height:1.5}

/* CART */
.cart-btn{position:relative;background:var(--surface2);border:1px solid var(--border2);padding:6px 12px;gap:6px}
.cart-badge{background:var(--accent);color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:100px;min-width:18px;text-align:center;display:inline-block}
.cart-modal{max-width:540px}
.cart-empty{text-align:center;padding:40px 20px;color:var(--text3);display:flex;flex-direction:column;align-items:center;gap:12px}
.cart-empty span{font-size:40px;opacity:.5}
.cart-empty p{font-size:15px}
.cart-items{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;max-height:380px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border2) transparent}
.cart-item{display:grid;grid-template-columns:48px 1fr auto auto 24px;align-items:center;gap:12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
.cart-item-img{width:48px;height:48px;border-radius:8px;overflow:hidden;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.cart-item-img img{width:100%;height:100%;object-fit:cover}
.cart-item-info{min-width:0}
.cart-item-name{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cart-item-price{font-size:12px;color:var(--text3)}
.cart-item-qty{display:flex;align-items:center;gap:6px}
.qty-btn{background:var(--surface);border:1px solid var(--border2);color:var(--text);width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.qty-btn:hover{background:var(--border2)}
.qty-val{font-size:13px;font-weight:600;color:var(--text);min-width:20px;text-align:center}
.cart-item-subtotal{font-size:13px;font-weight:700;color:var(--accent);white-space:nowrap}
.cart-item-del{background:none;border:none;color:var(--text3);font-size:14px;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:all .15s}
.cart-item-del:hover{background:rgba(239,68,68,.15);color:var(--red)}
.cart-footer{border-top:1px solid var(--border);padding-top:16px}
.cart-total-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.cart-total-label{font-size:14px;color:var(--text2);font-weight:500}
.cart-total-amount{font-size:24px;font-weight:700;color:var(--accent)}
.cart-actions{display:flex;gap:10px}
.cart-actions .btn-action{flex:1;justify-content:center}
.cart-checkout-btn{flex:2;margin-top:0}

/* ══ PUBLIC PREVIEW OVERLAY ══════════════════════════════════════ */
.public-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pub-preview-close {
  position: absolute;
  top: 10px;
  right: 14px;
  z-index: 10001;
  background: rgba(0,0,0,.55);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}
.pub-preview-close:hover { background: rgba(0,0,0,.75); }

.pub-preview-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  min-height: 52px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  z-index: 10000;
  box-shadow: 0 1px 6px rgba(0,0,0,.07);
  flex-wrap: wrap;
}
.pub-preview-brand-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.pub-preview-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
}
.pub-preview-brand-icon {
  font-size: 20px;
  color: #6c63ff;
}
.pub-preview-brand-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  font-family: 'Playfair Display', serif;
}
.pub-preview-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
  justify-content: center;
  min-width: 0;
}
.pub-preview-tab {
  background: transparent;
  border: 1px solid transparent;
  color: #6b7280;
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all .15s;
}
.pub-preview-tab:hover { background: #f3f4f6; color: #111; }
.pub-preview-tab.active { background: #6c63ff; color: #fff; border-color: #6c63ff; }

.pub-preview-cart {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

.pub-preview-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ══ MODAL LÉGAL ══════════════════════════════════════════════════ */
.legal-modal { max-width: 680px; width: 95vw; }
.legal-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border, #e5e7eb);
  padding-bottom: 10px;
}
.legal-tab {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #6b7280;
  font-family: 'DM Sans', sans-serif;
  transition: all .15s;
}
.legal-tab:hover { background: #f3f4f6; color: #111; }
.legal-tab.active { background: #6c63ff; color: #fff; border-color: #6c63ff; }
.legal-editor { margin-bottom: 16px; }
.legal-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
  font-style: italic;
}
.legal-textarea {
  width: 100%;
  min-height: 220px;
  background: #1a1a2e;
  color: #e2e8f0;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.legal-textarea:focus { outline: none; border-color: #6c63ff; }

/* ══ MODAL PRODUITS TENDANCE ══════════════════════════════════════ */
.trend-btn { background: linear-gradient(135deg, #ff6b35, #f7c59f) !important; color: #fff !important; }
.trend-btn:hover { opacity: .88; }

.trend-modal { max-width: 760px; width: 96vw; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; }

.trend-search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.trend-input {
  flex: 1;
  min-width: 200px;
  background: #1a1a2e;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px 14px;
  color: #e2e8f0;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
}
.trend-input:focus { outline: none; border-color: #ff6b35; }
.trend-lang-select {
  background: #1a1a2e;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px 10px;
  color: #e2e8f0;
  font-size: 13px;
  cursor: pointer;
}
.trend-search-btn { white-space: nowrap; }

.trend-error {
  background: #2d1b1b;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 10px 14px;
  color: #fca5a5;
  font-size: 13px;
  margin-bottom: 12px;
}

/* Loading */
.trend-loading { padding: 12px 0; }
.trend-skeleton {
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 10px;
  height: 80px;
  margin-bottom: 10px;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.trend-loading-msg { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 8px; }

/* Résultats */
.trend-results-area { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.trend-results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.trend-count { font-size: 13px; color: #9ca3af; }
.trend-select-all {
  background: transparent;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 10px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}
.trend-select-all:hover { border-color: #6c63ff; color: #6c63ff; }

.trend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.trend-card {
  background: #1a1a2e;
  border: 2px solid #1e293b;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  position: relative;
  transition: all .18s;
}
.trend-card:hover { border-color: #ff6b35; transform: translateY(-2px); }
.trend-card.selected { border-color: #6c63ff; background: #1e1b4b; }

.trend-card-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #6c63ff;
  background: #0f172a;
  transition: all .15s;
}
.trend-card.selected .trend-card-check { background: #6c63ff; border-color: #6c63ff; color: #fff; }

.trend-card-badge {
  display: inline-block;
  background: linear-gradient(135deg, #ff6b35, #f7c59f);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.trend-card-img { font-size: 32px; text-align: center; margin: 8px 0; }
.trend-card-name { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 4px; }
.trend-card-desc { font-size: 12px; color: #94a3b8; line-height: 1.4; margin-bottom: 6px; }
.trend-card-why { font-size: 11px; color: #6b7280; font-style: italic; margin-bottom: 6px; line-height: 1.4; }
.trend-card-price { font-size: 15px; font-weight: 700; color: #10b981; }

/* Section cible */
.trend-target {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #1a1a2e;
  border-radius: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.trend-target-label { font-size: 13px; color: #94a3b8; white-space: nowrap; }
.trend-target-select {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 7px 10px;
  color: #e2e8f0;
  font-size: 13px;
  min-width: 160px;
}

.trend-config-warn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1c1a0e;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 10px 14px;
  color: #fbbf24;
  font-size: 13px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.trend-config-warn span:first-child { font-size: 18px; }
.trend-config-warn .btn-action { margin-left: auto; }

/* ══ ONGLETS MODE TREND/URL ══════════════════════════════════════ */
.trend-mode-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 12px;
}
.trend-mode-tab {
  flex: 1;
  background: #1a1a2e;
  border: 2px solid #1e293b;
  border-radius: 10px;
  padding: 10px 16px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all .18s;
}
.trend-mode-tab:hover { border-color: #334155; color: #e2e8f0; }
.trend-mode-tab.active { border-color: #6c63ff; background: #1e1b4b; color: #fff; }

/* ══ SCRAPER URL ══════════════════════════════════════════════════ */
.scrape-search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.scrape-url-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  background: #1a1a2e;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 0 12px;
  min-width: 200px;
}
.scrape-url-icon { font-size: 16px; margin-right: 8px; flex-shrink: 0; }
.scrape-url-input {
  background: transparent !important;
  border: none !important;
  padding: 10px 0 !important;
  flex: 1;
}
.scrape-url-input:focus { outline: none !important; }
.scrape-hint {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 14px;
}
.scrape-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
  margin: 0 auto;
}

/* ══ THÈMES ══════════════════════════════════════════════════════ */
.theme-panel { overflow-y: auto; max-height: calc(100vh - 120px); }

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 4px;
}
.theme-card {
  position: relative;
  border: 2px solid #1e293b;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all .18s;
  background: #0f172a;
}
.theme-card:hover { border-color: #6c63ff; transform: translateY(-2px); }
.theme-card.active { border-color: #6c63ff; box-shadow: 0 0 0 2px #6c63ff44; }

.theme-preview {
  width: 100%;
  height: 52px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.theme-preview-nav {
  height: 14px;
  flex-shrink: 0;
}
.theme-preview-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-preview-btn {
  width: 28px;
  height: 10px;
}

.theme-name {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-align: center;
  padding: 5px 4px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.theme-card.active .theme-name { color: #6c63ff; }

.theme-active-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #6c63ff;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.prop-range { flex: 1; accent-color: #6c63ff; }
.prop-input {
  width: 100%;
  background: #1a1a2e;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 7px 10px;
  color: #e2e8f0;
  font-size: 12px;
  margin-bottom: 6px;
  box-sizing: border-box;
  font-family: 'DM Sans', sans-serif;
}
.prop-input:focus { outline: none; border-color: #6c63ff; }

.import-theme-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.import-theme-bar .prop-input { margin-bottom: 0; flex: 1; }
.import-theme-error {
  font-size: 11px;
  color: #fca5a5;
  background: #2d1b1b;
  border-radius: 6px;
  padding: 6px 8px;
  margin-top: 4px;
}

/* ── Nav dans le mode aperçu interne ──────────────────────────── */
.prev-site-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 54px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 100;
}
.prev-nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.prev-nav-logo {
  width: 28px; height: 28px;
  object-fit: contain; border-radius: 6px;
}
.prev-nav-icon { font-size: 18px; color: #6c63ff; }
.prev-nav-name {
  font-size: 15px; font-weight: 700;
  color: #1a1a2e; font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
}
.prev-nav-pages {
  display: flex; gap: 4px; flex-wrap: wrap; flex: 1;
}
.prev-nav-tab {
  background: transparent;
  border: 1px solid transparent;
  color: #6b7280;
  font-size: 13px; padding: 5px 12px;
  border-radius: 6px; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all .15s;
  white-space: nowrap;
}
.prev-nav-tab:hover  { background: #f3f4f6; color: #111; }
.prev-nav-tab.active { background: #6c63ff; color: #fff; border-color: #6c63ff; }

/* ── Badge plan dynamique ─────────────────────────────────────── */
.brand-badge-pro  { background: linear-gradient(135deg,#6c63ff,#4f46e5)!important; color:#fff!important; }
.brand-badge-free { background: rgba(156,163,175,.2)!important; color:#9ca3af!important; font-size:10px!important; }

/* ── Bouton Dashboard ─────────────────────────────────────────── */
.btn-dashboard {
  background: rgba(99,102,241,.1);
  border: 1px solid rgba(99,102,241,.25) !important;
  color: #818cf8 !important;
  font-size: 12px !important;
  padding: 6px 10px !important;
  white-space: nowrap;
}
.btn-dashboard:hover { background: rgba(99,102,241,.2) !important; }

/* ── Topbar user (email + déconnexion) ───────────────────────── */
.topbar-user {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  padding: 4px 8px;
}
.topbar-user-email {
  font-size: 11px; color: #9ca3af;
  max-width: 90px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.btn-logout {
  background: rgba(239,68,68,.1) !important;
  border: 1px solid rgba(239,68,68,.2) !important;
  color: #f87171 !important;
  font-size: 11px !important;
  padding: 4px 8px !important;
}
.btn-logout:hover { background: rgba(239,68,68,.2) !important; }
.btn-login {
  background: rgba(16,185,129,.1) !important;
  border: 1px solid rgba(16,185,129,.2) !important;
  color: #34d399 !important;
  font-size: 12px !important;
}


/* ── Boutons aperçu dans brand (toujours visibles) ────────────── */
.brand-quick-btns {
  display: flex;
  gap: 4px;
  margin-left: 4px;
  flex-shrink: 0;
}
.bqb {
  padding: 5px 8px !important;
  font-size: 14px !important;
  border-radius: 8px !important;
  flex-shrink: 0;
}
</style>
