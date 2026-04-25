<!-- ============================================================
  SaasBuilder/src/views/SiteViewer.vue
  
  Affiche le site PUBLIÉ d'un propriétaire de store.
  Mode : aperçu final uniquement — pas de barre d'édition.
  
  Route  : /site/:uid
  :uid   : UID Firestore direct OU slug convivial
  
  Résolution :
    1. users/{uid}/siteData          → UID direct
    2. slugs/{uid} → uid réel        → Slug
    3. Introuvable                   → Page 404 intégrée
  
  Paiement client :
    - Lit users/{resolvedUid}/config/payment  (storePaymentConfig)
    - Stripe Elements réel  → backend du STORE
    - PayPal SDK réel       → backend du STORE
    - Commande sauvegardée  → users/{resolvedUid}/orders/{id}
============================================================ -->

<script setup>
import { ref, onMounted, computed, watch } from "vue"
import { useRouter } from "vue-router"
import VoiceAssistantClient from "../components/VoiceAssistantClient.vue"
import { db } from "../firebase.js"
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore"
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth"
const clientAuth      = getAuth()
const svCurrentUser   = ref(null)
const svShowAuth      = ref(false)
const svAuthMode      = ref("login")   // "login" | "register" | "forgot"
const svEmail         = ref("")
const svPassword      = ref("")
const svConfirm       = ref("")
const svName          = ref("")
const svAuthError     = ref("")
const svAuthSuccess   = ref("")
const svAuthLoading   = ref(false)
// ── Profil client ─────────────────────────────────────────────
const svShowProfile   = ref(false)
const svClientOrders  = ref([])
const svLoadingOrders = ref(false)
const svOrdersLoaded  = ref(false)

// ── Props ─────────────────────────────────────────────────────
const props  = defineProps({ uid: { type: String, required: true } })
const router = useRouter()

// ── État global ───────────────────────────────────────────────
const site         = ref(null)

// ── Langue du store (sélecteur visible par les clients) ───────
const svLang  = ref("fr")
const svLangs = [
  { code:"fr", flag:"🇫🇷", full:"Français" },
  { code:"en", flag:"🇬🇧", full:"English"  },
  { code:"ar", flag:"🇲🇦", full:"العربية"  },
  { code:"es", flag:"🇪🇸", full:"Español"  },
]
const svIsRtl = computed(() => svLang.value === "ar")

// Textes traduits du store — utilisés dans tous les boutons/labels
const svT = computed(() => {
  const all = {
    fr:{ buy:"🛒 Acheter", login:"🔑 Se connecter", logout:"Déconnexion", cart:"Mon panier", delivery:"Livraison & Paiement", checkout:"Finaliser la commande", back:"← Retour", payCard:"💳 Payer par carte", name:"Nom complet *", email:"Email *", password:"Mot de passe * (min.6)", confirm:"Confirmer *", createAccount:"✨ Créer mon compte", register:"Inscription", send:"Envoyer", noOrders:"Aucune commande pour le moment.", discover:"Découvrir les produits →", orders:"MES COMMANDES", totalSpent:"TOTAL DÉPENSÉ", forgotPwd:"Mot de passe oublié ?", resetSent:"Email envoyé !", address:"Adresse", zip:"Code postal", city:"Ville", country:"Pays" },
    en:{ buy:"🛒 Buy", login:"🔑 Sign in", logout:"Sign out", cart:"My cart", delivery:"Delivery & Payment", checkout:"Place order", back:"← Back", payCard:"💳 Pay by card", name:"Full name *", email:"Email *", password:"Password * (min.6)", confirm:"Confirm *", createAccount:"✨ Create account", register:"Register", send:"Send", noOrders:"No orders yet.", discover:"Discover products →", orders:"MY ORDERS", totalSpent:"TOTAL SPENT", forgotPwd:"Forgot password?", resetSent:"Email sent!", address:"Address", zip:"Zip code", city:"City", country:"Country" },
    ar:{ buy:"🛒 شراء", login:"🔑 دخول", logout:"خروج", cart:"سلتي", delivery:"التسليم والدفع", checkout:"إتمام الطلب", back:"→ رجوع", payCard:"💳 الدفع ببطاقة", name:"الاسم الكامل *", email:"البريد الإلكتروني *", password:"كلمة المرور * (6 أحرف)", confirm:"تأكيد *", createAccount:"✨ إنشاء حساب", register:"تسجيل", send:"إرسال", noOrders:"لا توجد طلبات حتى الآن.", discover:"اكتشف المنتجات ←", orders:"طلباتي", totalSpent:"الإجمالي المنفق", forgotPwd:"نسيت كلمة المرور؟", resetSent:"تم الإرسال!", address:"العنوان", zip:"الرمز البريدي", city:"المدينة", country:"البلد" },
    es:{ buy:"🛒 Comprar", login:"🔑 Entrar", logout:"Salir", cart:"Mi carrito", delivery:"Entrega y Pago", checkout:"Finalizar pedido", back:"← Volver", payCard:"💳 Pagar con tarjeta", name:"Nombre completo *", email:"Email *", password:"Contraseña * (mín.6)", confirm:"Confirmar *", createAccount:"✨ Crear cuenta", register:"Registro", send:"Enviar", noOrders:"Sin pedidos por ahora.", discover:"Descubrir productos →", orders:"MIS PEDIDOS", totalSpent:"TOTAL GASTADO", forgotPwd:"¿Olvidaste tu contraseña?", resetSent:"¡Email enviado!", address:"Dirección", zip:"Código postal", city:"Ciudad", country:"País" },
  }
  return all[svLang.value] || all.fr
})
const loading      = ref(true)
const error        = ref("")
const resolvedUid  = ref("")
const siteMeta     = ref({})          // { name, logo }
const currentPageIndex = ref(0)

// ── Config paiement du store ──────────────────────────────────
const storePayConfig = ref({ stripe: null, paypal: null })

// ── Plan du propriétaire → backend dynamique ──────────────────
const storeOwner = ref({ plan: "free", paye: false })

const isPro = computed(() =>
  storeOwner.value.plan === "pro" || storeOwner.value.paye === true
)

const BACKEND_URL = computed(() =>
  isPro.value
    ? "https://backendfinal-production-afd2.up.railway.app"
    : "https://backend-master-production-cf50.up.railway.app"
)

// ── Formulaire contact ───────────────────────────────────────
const contactName    = ref("")
const contactEmail   = ref("")
const contactMessage = ref("")
const contactSending = ref(false)
const contactSent    = ref(false)
const contactError   = ref("")

const sendContact = async () => {
  if (!contactName.value || !contactEmail.value || !contactMessage.value) {
    contactError.value = "Veuillez remplir tous les champs."
    return
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.value)
  if (!emailOk) { contactError.value = "Email invalide."; return }

  contactSending.value = true
  contactError.value   = ""
  try {
    // Écrire dans users/{ownerUid}/contacts/{id}
    // Règle Firestore : allow create: if true  → pas besoin d'auth
    const ownerUid = resolvedUid.value
    if (!ownerUid) throw new Error("Store non trouvé")

    await addDoc(collection(db, "users", ownerUid, "contacts"), {
      name:      contactName.value.trim(),
      email:     contactEmail.value.trim().toLowerCase(),
      message:   contactMessage.value.trim(),
      storeUid:  ownerUid,
      siteSlug:  props.uid,
      status:    "nouveau",
      createdAt: new Date().toISOString(),
    })
    contactSent.value    = true
    contactName.value    = ""
    contactEmail.value   = ""
    contactMessage.value = ""
    setTimeout(() => { contactSent.value = false }, 5000)
  } catch(e) {
    contactError.value = "Erreur d'envoi. Réessayez plus tard."
    console.error("Contact error:", e)
  } finally {
    contactSending.value = false
  }
}

// ── Panier ────────────────────────────────────────────────────
const svCartStep = ref("cart")   // "cart" | "checkout"
const svAddress  = ref("")
const svZip      = ref("")
const svCity     = ref("")
const svCountry  = ref("France")
const cart         = ref([])
const showCart     = ref(false)
const showPayModal = ref(false)
const payProvider  = ref("stripe")
const payProcessing = ref(false)
const paySuccess   = ref(false)
const payError     = ref("")
// Pré-remplir depuis la session si disponible
const customerName  = computed({
  get: () => _customerName.value || svCurrentUser.value?.displayName || "",
  set: (v) => { _customerName.value = v }
})
const customerEmail = computed({
  get: () => _customerEmail.value || svCurrentUser.value?.email || "",
  set: (v) => { _customerEmail.value = v }
})
const _customerName  = ref("")
const _customerEmail = ref("")

// Stripe Checkout (redirect vers Stripe)
const stripeLoading = ref(false)

const cartCount    = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))
const cartTotal    = computed(() => cart.value.reduce((s, i) => s + parseFloat(i.price || 0) * i.qty, 0).toFixed(2))
const cartCurrency = computed(() => cart.value[0]?.currency || "€")
const currentPage  = computed(() => site.value?.pages?.[currentPageIndex.value] || site.value?.pages?.[0])

// ── Panier — actions ──────────────────────────────────────────
// Auth Firebase pour vérifier si le client est connecté
const addToCart = (product) => {
  // Vérifier la session locale (clients Firestore) OU Firebase Auth
  // svCurrentUser est défini dès que le client est connecté via n'importe quelle méthode
  if (!svCurrentUser.value) {
    // Non connecté → ouvrir le formulaire de connexion du store
    svShowAuth.value = true
    svAuthMode.value = "login"
    svAuthError.value   = ""
    svAuthSuccess.value = ""
    return
  }
  const ex = cart.value.find(i => i.id === product.id)
  ex ? ex.qty++ : cart.value.push({ ...product, qty: 1 })
  showCart.value = true
}
const removeFromCart = (id) => { cart.value = cart.value.filter(i => i.id !== id) }
const updateQty = (id, delta) => {
  const item = cart.value.find(i => i.id === id)
  if (item) item.qty = Math.max(1, item.qty + delta)
}

// ── Embed vidéo ───────────────────────────────────────────────
const getEmbedUrl = (url) => {
  if (!url) return ""
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return url
}

// ── Chargement site + config paiement ────────────────────────
const debugInfo = ref("")   // infos de diagnostic affichées si erreur

const loadSite = async () => {
  loading.value  = true
  error.value    = ""
  debugInfo.value = ""
  const uid = props.uid?.trim()

  if (!uid) {
    error.value = "Aucun identifiant de site fourni."
    loading.value = false
    return
  }

  console.log("🔍 SiteViewer: chargement pour uid/slug =", uid)

  try {
    // ── Étape 1 : essayer comme UID Firestore direct ──────
    let userSnap = null
    try {
      userSnap = await getDoc(doc(db, "users", uid))
      console.log("  Étape 1 (UID direct):", userSnap.exists() ? "document trouvé" : "non trouvé")
    } catch(e) {
      console.warn("  Étape 1 échouée:", e.message)
    }

    if (userSnap?.exists()) {
      const data = userSnap.data()
      if (data.siteData) {
        // ✅ UID direct avec siteData
        site.value           = data.siteData
        siteMeta.value       = { name: data.siteName || "", logo: data.siteLogo || "" }
        resolvedUid.value    = uid
        storeOwner.value     = { plan: data.plan || "free", paye: data.paye || false }
        await loadPayConfig(uid)
        if (data.siteTheme) applySiteTheme(data.siteTheme)
        loading.value = false
        console.log("  ✅ Site chargé via UID direct | plan:", storeOwner.value.plan, "| backend:", BACKEND_URL.value)
        return
      } else {
        // Utilisateur existe mais pas encore publié
        console.warn("  ⚠️ Utilisateur trouvé mais siteData manquant — site non publié ?")
        debugInfo.value = `Compte trouvé (${uid}) mais le site n'a pas encore été publié.`
      }
    }

    // ── Étape 2 : essayer comme slug dans collection slugs ─
    console.log("  Étape 2: cherche slug 'slugs/" + uid + "'")
    let slugSnap = null
    try {
      slugSnap = await getDoc(doc(db, "slugs", uid))
      console.log("  Étape 2 (slug):", slugSnap.exists() ? "slug trouvé → uid=" + slugSnap.data().uid : "slug non trouvé")
    } catch(e) {
      console.warn("  Étape 2 échouée:", e.message)
    }

    if (slugSnap?.exists()) {
      const realUid = slugSnap.data().uid
      let realSnap  = null
      try {
        realSnap = await getDoc(doc(db, "users", realUid))
      } catch(e) {
        console.warn("  Étape 2b échouée:", e.message)
      }

      if (realSnap?.exists() && realSnap.data().siteData) {
        // ✅ Slug résolu avec succès
        const rd             = realSnap.data()
        site.value           = rd.siteData
        siteMeta.value       = { name: rd.siteName || "", logo: rd.siteLogo || "" }
        resolvedUid.value    = realUid
        storeOwner.value     = { plan: rd.plan || "free", paye: rd.paye || false }
        await loadPayConfig(realUid)
        if (rd.siteTheme) applySiteTheme(rd.siteTheme)
        loading.value = false
        console.log("  ✅ Site chargé via slug →", realUid, "| plan:", storeOwner.value.plan, "| backend:", BACKEND_URL.value)
        return
      } else if (realSnap?.exists()) {
        debugInfo.value = `Slug "${uid}" trouvé → UID ${realUid}, mais le site n'a pas de données publiées.`
        console.warn("  ⚠️ Slug trouvé mais siteData manquant pour", realUid)
      }
    }

    // ── Rien trouvé ───────────────────────────────────────
    if (debugInfo.value) {
      error.value = debugInfo.value
    } else {
      error.value = `Site "${uid}" introuvable.`
      debugInfo.value = `Aucun document trouvé pour "${uid}" dans users/ ni dans slugs/.`
    }
    loading.value = false

  } catch (e) {
    error.value    = "Erreur de chargement : " + e.message
    loading.value  = false
    console.error("SiteViewer loadSite error:", e)
  }
}

const loadPayConfig = async (uid) => {
  try {
    // Chercher d'abord dans users/{uid}/config/payment (sous-collection)
    const snap = await getDoc(doc(db, "users", uid, "config", "payment"))
    if (snap.exists()) { storePayConfig.value = snap.data(); return }
    // Fallback : storePaymentConfig dans le document principal
    const mainSnap = await getDoc(doc(db, "users", uid))
    if (mainSnap.exists() && mainSnap.data().storePaymentConfig) {
      storePayConfig.value = mainSnap.data().storePaymentConfig
    }
  } catch (e) { console.warn("Pas de config paiement:", e.message) }
}

// ── Appliquer le thème du store (depuis Firestore ou localStorage) ──
// Appelé après chaque résolution de slug/uid
const applySiteTheme = (themeData) => {
  if (!themeData) return
  try {
    const th = typeof themeData === "string" ? JSON.parse(themeData) : themeData
    const r  = document.documentElement
    if (th.accent)      r.style.setProperty("--theme-accent",      th.accent)
    if (th.accentHover) r.style.setProperty("--theme-accent-hover",th.accentHover)
    if (th.bg)          r.style.setProperty("--theme-bg",          th.bg)
    if (th.bgAlt)       r.style.setProperty("--theme-bg-alt",      th.bgAlt)
    if (th.bgHero)      r.style.setProperty("--theme-bg-hero",     th.bgHero)
    if (th.text)        r.style.setProperty("--theme-text",        th.text)
    if (th.textSub)     r.style.setProperty("--theme-text-sub",    th.textSub)
    if (th.btnRadius)   r.style.setProperty("--theme-btn-radius",  th.btnRadius)
    if (th.btnPadding)  r.style.setProperty("--theme-btn-padding", th.btnPadding)
    if (th.cardRadius)  r.style.setProperty("--theme-card-radius", th.cardRadius)
    if (th.cardShadow)  r.style.setProperty("--theme-card-shadow", th.cardShadow)
    if (th.heroFont)    r.style.setProperty("--theme-hero-font",   th.heroFont)
    if (th.bodyFont)    r.style.setProperty("--theme-body-font",   th.bodyFont)
    if (th.navBg)       r.style.setProperty("--theme-nav-bg",      th.navBg)
    if (th.navBorder)   r.style.setProperty("--theme-nav-border",  th.navBorder)
    console.log("🎨 Thème appliqué:", th.name || "custom")
  } catch(e) { console.warn("applySiteTheme:", e.message) }
}

onMounted(() => {
  loadSite()

  // Restaurer session client Firestore si déjà connectée
  const savedSession = sessionStorage.getItem("svClientSession")
  if (savedSession) {
    try {
      svCurrentUser.value = JSON.parse(savedSession)
    } catch(e) { sessionStorage.removeItem("svClientSession") }
  }

  // Écouter aussi Firebase Auth (pour anciens comptes)
  onAuthStateChanged(clientAuth, (user) => {
    // Ne pas écraser la session Firestore déjà établie
    if (!svCurrentUser.value && user) {
      svCurrentUser.value = {
        uid:         user.uid,
        email:       user.email,
        displayName: user.displayName || "",
        role:        "customer",
      }
    }
  })
})

// ── Fonctions Auth client du store ───────────────────────────
const svLogin = async () => {
  svAuthError.value   = ""
  svAuthSuccess.value = ""
  if (!svEmail.value || !svPassword.value) {
    svAuthError.value = "Email et mot de passe requis."; return
  }
  svAuthLoading.value = true
  try {
    const email = svEmail.value.trim().toLowerCase()

    // ── Tentative 1 : chercher dans customers/ (compte store Firestore) ──
    const q = await getDocs(
      query(collection(db, "customers"), where("email", "==", email))
    )

    if (!q.empty) {
      const customerDoc  = q.docs[0]
      const customerData = customerDoc.data()

      // Vérifier le mot de passe (hash SHA-256)
      if (customerData.passwordHash) {
        const inputHash = await svHashPassword(svPassword.value)
        if (inputHash !== customerData.passwordHash) {
          svAuthError.value = "Mot de passe incorrect."
          return
        }
      }

      // ✅ Connexion réussie — stocker la session localement
      const clientSession = {
        uid:         customerData.uid || customerDoc.id,
        email:       customerData.email,
        displayName: customerData.displayName || "",
        storeUid:    customerData.storeUid    || resolvedUid.value,
        role:        "customer",
        loggedAt:    new Date().toISOString(),
      }
      sessionStorage.setItem("svClientSession", JSON.stringify(clientSession))
      svCurrentUser.value = clientSession

      svShowAuth.value = false
      svEmail.value    = ""
      svPassword.value = ""
      return
    }

    // ── Tentative 2 : fallback Firebase Auth (anciens comptes) ──
    // Ces anciens clients ont un compte Auth — on les connecte
    // mais ils ne verront pas le builder car isOwner = false
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth")
      const cred = await signInWithEmailAndPassword(clientAuth, email, svPassword.value)
      // Vérifier que ce n'est pas un propriétaire (pas de doc users/)
      const userSnap = await getDoc(doc(db, "users", cred.user.uid))
      if (userSnap.exists() && userSnap.data().role === "owner") {
        // C'est un propriétaire → déconnecter et refuser
        await signOut(clientAuth)
        svAuthError.value = "Veuillez vous connecter depuis l'espace propriétaire."
        return
      }
      // Client avec compte Auth : créer session locale
      const clientSession = {
        uid:         cred.user.uid,
        email:       cred.user.email,
        displayName: cred.user.displayName || "",
        storeUid:    resolvedUid.value,
        role:        "customer",
        loggedAt:    new Date().toISOString(),
      }
      sessionStorage.setItem("svClientSession", JSON.stringify(clientSession))
      svCurrentUser.value = clientSession
      svShowAuth.value    = false
      svEmail.value       = ""
      svPassword.value    = ""
    } catch(authErr) {
      svAuthError.value = "Email ou mot de passe incorrect."
    }

  } catch(e) {
    svAuthError.value = "Erreur de connexion : " + e.message
    console.error("svLogin:", e)
  } finally {
    svAuthLoading.value = false
  }
}

// Hash simple du mot de passe côté client (pour stockage Firestore)
// NB : pas de Firebase Auth — les clients du store ne peuvent pas se connecter au builder
const svHashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data     = encoder.encode(password)
  const hash     = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("")
}

// Générer un ID unique pour le client (sans Firebase Auth)
const svGenerateId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

const svRegister = async () => {
  svAuthError.value   = ""
  svAuthSuccess.value = ""

  // Validations
  if (!svName.value.trim())       { svAuthError.value = "Nom requis."; return }
  if (!svEmail.value.trim())      { svAuthError.value = "Email requis."; return }
  if (svPassword.value.length < 6){ svAuthError.value = "Mot de passe : min. 6 caractères."; return }
  if (svPassword.value !== svConfirm.value) {
    svAuthError.value = "Les mots de passe ne correspondent pas."; return
  }

  svAuthLoading.value = true
  try {
    const email = svEmail.value.trim().toLowerCase()

    // Vérifier si email déjà utilisé dans customers
    const existingQ = await getDocs(
      query(collection(db, "customers"), where("email", "==", email))
    )
    if (!existingQ.empty) {
      svAuthError.value = "Un compte existe déjà avec cet email."
      return
    }

    // Hasher le mot de passe (SHA-256, pas de compte Firebase Auth)
    const passwordHash = await svHashPassword(svPassword.value)

    // Générer un UID client unique
    const clientUid = svGenerateId()

    // Enregistrer dans customers/ UNIQUEMENT (pas dans users/, pas dans Firebase Auth)
    await setDoc(doc(db, "customers", clientUid), {
      uid:          clientUid,
      email,
      displayName:  svName.value.trim(),
      passwordHash,                      // hash SHA-256 pour login Firestore
      storeUid:     resolvedUid.value,   // lié au store
      role:         "customer",
      createdAt:    new Date().toISOString(),
      authMethod:   "firestore",         // distingue des comptes Firebase Auth
    })

    // Connecter le client localement (stocker en sessionStorage)
    const clientSession = {
      uid:         clientUid,
      email,
      displayName: svName.value.trim(),
      storeUid:    resolvedUid.value,
      role:        "customer",
      loggedAt:    new Date().toISOString(),
    }
    sessionStorage.setItem("svClientSession", JSON.stringify(clientSession))
    svCurrentUser.value = clientSession

    svAuthSuccess.value = "Compte créé avec succès ! Bienvenue 🎉"
    setTimeout(() => {
      svShowAuth.value  = false
      svEmail.value     = ""
      svPassword.value  = ""
      svConfirm.value   = ""
      svName.value      = ""
    }, 1400)

  } catch(e) {
    svAuthError.value = "Erreur : " + e.message
    console.error("svRegister:", e)
  } finally {
    svAuthLoading.value = false
  }
}

const svForgot = async () => {
  svAuthError.value = ""; svAuthSuccess.value = ""
  if (!svEmail.value) { svAuthError.value = "Entrez votre email."; return }
  svAuthLoading.value = true
  try {
    const { sendPasswordResetEmail } = await import("firebase/auth")
    await sendPasswordResetEmail(clientAuth, svEmail.value.trim())
    svAuthSuccess.value = "Email envoyé ! Vérifiez votre boîte mail."
  } catch(e) { svAuthError.value = e.message }
  finally { svAuthLoading.value = false }
}

const svSignOut = async () => {
  // Déconnecter Firebase Auth si connecté
  try { await signOut(clientAuth) } catch(e) {}
  // Effacer la session Firestore locale
  sessionStorage.removeItem("svClientSession")
  svCurrentUser.value  = null
  svShowProfile.value  = false
  svClientOrders.value = []
  svOrdersLoaded.value = false
}


const svLoadOrders = async (user) => {
  if (svLoadingOrders.value) return
  svLoadingOrders.value = true
  svOrdersLoaded.value  = false
  const results = []

  // Dédoublonner par id de document Firestore
  const dedup = (id, data) => {
    if (!results.find(r => r.id === id)) results.push({ id, ...data })
  }

  try {
    const { query: q, where, getDocs: gd, collection: col, getDoc: gDoc, doc: fdoc } =
      await import("firebase/firestore")

    const uid   = user.uid   || ""
    let   email = (user.email || "").toLowerCase()

    // ── Étape 0 : retrouver l'email depuis customers/ ─────────
    // IMPORTANT : svCurrentUser.email est stocké à l'inscription
    // mais si manquant, on le récupère depuis Firestore
    if (!email && uid) {
      try {
        const custDoc = await gDoc(fdoc(db, "customers", uid))
        if (custDoc.exists()) {
          email = (custDoc.data().email || "").toLowerCase()
        } else {
          const cq = await gd(q(col(db, "customers"), where("uid", "==", uid)))
          if (!cq.empty) email = (cq.docs[0].data().email || "").toLowerCase()
        }
        console.log("[profil] email depuis customers:", email)
      } catch(e) { console.warn("[profil] customers lookup:", e.message) }
    }

    console.log(`[profil] uid=${uid} | email=${email} | storeUid=${resolvedUid.value}`)

    // ══════════════════════════════════════════════════════════
    // DONNÉES FIRESTORE OBSERVÉES :
    // orders.customerEmail = email client ← CHAMP PRINCIPAL
    // orders.clientUid     = uid client Firestore ← CHAMP SECONDAIRE
    // orders.clientId      = UID du STORE (pas du client !)
    // orders.ownerUid      = UID du store
    // ══════════════════════════════════════════════════════════

    // ── Source 1 : orders par customerEmail (PRINCIPALE) ─────
    if (email) {
      try {
        const s1 = await gd(q(col(db, "orders"), where("customerEmail", "==", email)))
        s1.docs.forEach(d => dedup(d.id, d.data()))
        console.log(`[profil] ✅ orders/customerEmail: ${s1.docs.length}`)
      } catch(e) { console.error("[profil] orders/customerEmail:", e.message) }
    }

    // ── Source 2 : orders par clientUid (UID client Firestore) ─
    if (uid) {
      try {
        const s2 = await gd(q(col(db, "orders"), where("clientUid", "==", uid)))
        s2.docs.forEach(d => dedup(d.id, d.data()))
        console.log(`[profil] ✅ orders/clientUid: ${s2.docs.length}`)
      } catch(e) { console.error("[profil] orders/clientUid:", e.message) }
    }

    // ── Source 3 : users/{storeUid}/orders par customerEmail ──
    if (resolvedUid.value && email) {
      try {
        const s3 = await gd(q(
          col(db, "users", resolvedUid.value, "orders"),
          where("customerEmail", "==", email)))
        s3.docs.forEach(d => dedup(d.id, d.data()))
        console.log(`[profil] ✅ store/orders/customerEmail: ${s3.docs.length}`)
      } catch(e) { console.error("[profil] store/orders:", e.message) }
    }

    // ── Source 4 : cmdclients par clientEmail ─────────────────
    if (email) {
      try {
        const s4 = await gd(q(col(db, "cmdclients"), where("clientEmail", "==", email)))
        s4.docs.forEach(d => dedup(d.id, d.data()))
        console.log(`[profil] ✅ cmdclients/email: ${s4.docs.length}`)
      } catch(e) { console.error("[profil] cmdclients/email:", e.message) }
    }

    // ── Source 5 : cmdclients par clientUid ───────────────────
    if (uid) {
      try {
        const s5 = await gd(q(col(db, "cmdclients"), where("clientUid", "==", uid)))
        s5.docs.forEach(d => dedup(d.id, d.data()))
        console.log(`[profil] ✅ cmdclients/uid: ${s5.docs.length}`)
      } catch(e) { console.error("[profil] cmdclients/uid:", e.message) }
    }

    // ── Source 6 : orders par email simple ────────────────────
    if (email) {
      try {
        const s6 = await gd(q(col(db, "orders"), where("email", "==", email)))
        s6.docs.forEach(d => dedup(d.id, d.data()))
        console.log(`[profil] ✅ orders/email: ${s6.docs.length}`)
      } catch(e) { console.error("[profil] orders/email:", e.message) }
    }

    // Trier par date décroissante
    results.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    svClientOrders.value = results
    svOrdersLoaded.value = true
    console.log(`[profil] ✅ Total: ${results.length} commandes trouvées`)

  } catch(e) { console.error("[profil] svLoadOrders ERREUR:", e.message) }
  finally { svLoadingOrders.value = false }
}

// Ouvrir le profil + recharger les commandes à chaque ouverture
const svOpenProfile = async () => {
  svShowProfile.value  = true
  svOrdersLoaded.value = false

  // S'assurer d'avoir l'objet user avec email
  let userForOrders = svCurrentUser.value
  if (!userForOrders) {
    // Tenter de restaurer depuis sessionStorage
    const saved = sessionStorage.getItem("svClientSession")
    if (saved) {
      try { userForOrders = JSON.parse(saved) } catch(e) {}
    }
  }

  if (userForOrders) {
    // Log pour debug
    console.log("[profil] Ouverture profil — user:", userForOrders.email, "| uid:", userForOrders.uid)
    await svLoadOrders(userForOrders)
  } else {
    console.warn("[profil] svOpenProfile : aucun user connecté")
  }
}

// ── Stripe Checkout (redirect) ───────────────────────────────
// Le backend retourne { url } → on redirige vers Stripe Checkout
// Pas besoin de Stripe Elements (formulaire inline)

// ── PayPal buttons ────────────────────────────────────────────
const initPaypal = async () => {
  const cfg = storePayConfig.value?.paypal
  if (!cfg?.clientId || cfg.clientId.length < 5) {
    payError.value = "Paiement PayPal non configuré pour ce store."
    return
  }
  try {
    if (!window.paypal || window.paypal._clientId !== cfg.clientId) {
      const old = document.getElementById("paypal-sdk")
      if (old) old.remove()
      await new Promise((res, rej) => {
        const s = document.createElement("script")
        s.id  = "paypal-sdk"
        s.src = `https://www.paypal.com/sdk/js?client-id=${cfg.clientId}&currency=${cfg.currency || "EUR"}`
        s.onload = () => { window.paypal._clientId = cfg.clientId; res() }
        s.onerror = rej
        document.head.appendChild(s)
      })
    }
    const container = document.getElementById("sv-paypal-container")
    if (container) container.innerHTML = ""
    await new Promise(r => setTimeout(r, 100))
    window.paypal.Buttons({
      createOrder: async () => {
        if (!cfg.createOrderUrl) throw new Error("createOrderUrl non défini")
        const res = await fetch(cfg.createOrderUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount:   cartTotal.value,
            currency: cfg.currency || "EUR",
            items:    cart.value.map(i => ({ name: i.name, unit_amount: parseFloat(i.price), quantity: i.qty })),
          }),
        })
        const data = await res.json()
        return data.orderID
      },
      onApprove: async (data) => {
        payProcessing.value = true
        if (cfg.captureOrderUrl) {
          const res = await fetch(cfg.captureOrderUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: data.orderID }),
          })
          const result = await res.json()
          if (result.status === "COMPLETED") {
            await saveOrder("paypal", result.id)
            paySuccess.value    = true
            payProcessing.value = false
          }
        }
      },
      onError: (err) => { payError.value = "Erreur PayPal : " + String(err) },
    }).render("#sv-paypal-container")
  } catch (e) { payError.value = "Erreur PayPal : " + e.message }
}

// ── Watch payment modal → init PayPal si nécessaire ─────────
watch([showPayModal, payProvider], ([open, provider]) => {
  if (!open) return
  payError.value = ""
  if (provider === "paypal") setTimeout(initPaypal, 150)
})

// ── Paiement Stripe Checkout (redirect) ──────────────────────
const payWithStripe = async () => {
  const cfg = storePayConfig.value?.stripe

  // Vérifier que le client est connecté (session Firestore OU Firebase Auth)
  if (!svCurrentUser.value) {
    payError.value = "Veuillez vous connecter pour finaliser votre achat."
    svShowAuth.value = true
    svAuthMode.value = "login"
    return
  }

  if (!customerName.value || !customerEmail.value) {
    payError.value = "Nom et email obligatoires."; return
  }

  // Pré-remplir email depuis la session si vide
  if (!customerEmail.value && svCurrentUser.value?.email) {
    customerEmail.value = svCurrentUser.value.email
  }
  if (!customerName.value && svCurrentUser.value?.displayName) {
    customerName.value = svCurrentUser.value.displayName
  }
  payProcessing.value = true
  payError.value = ""

  try {
    const adresseLivraison = [svAddress.value, svZip.value, svCity.value, svCountry.value]
      .filter(Boolean).join(", ")

    // ── Sauvegarder dans localStorage (survit au redirect cross-domain)
    const pendingOrder = {
      items:           cart.value.map(i => ({ id: i.id, name: i.name, price: i.price, currency: i.currency, qty: i.qty, image: i.image || "" })),
      total:           cartTotal.value,
      currency:        cartCurrency.value,
      itemCount:       cartCount.value,
      customerName:    customerName.value,
      customerEmail:   customerEmail.value,
      customerAddress: adresseLivraison,
      siteSlug:        props.uid,
      ownerUid:        resolvedUid.value,
      storeUid:        resolvedUid.value,
      clientUid:       svCurrentUser.value?.uid || clientAuth.currentUser?.uid || "",
      provider:        "stripe",
      createdAt:       new Date().toISOString(),
    }
    localStorage.setItem("pendingStripeOrder", JSON.stringify(pendingOrder))
    localStorage.setItem("stripeOwnerUid",  resolvedUid.value)
    localStorage.setItem("stripeSiteSlug",  props.uid)

    // ── URLs retour Stripe
    // Stripe accepte les query params même avec hash history
    // successUrl : Stripe redirige vers la racine avec ?stripe=ok
    // main.js intercepte avant Vue et redirige vers /#/payment-success
    const origin     = "https://musrh.github.io/SaasBuilder"
    const slug       = props.uid || resolvedUid.value
    const ownerUid   = resolvedUid.value
    const successUrl = cfg?.successUrl ||
      `${origin}/?stripe=ok&slug=${encodeURIComponent(slug)}&owner=${encodeURIComponent(ownerUid)}`
    const cancelUrl  = cfg?.cancelUrl  || `${origin}/#/site/${slug}`

    // ── Backend selon le plan du store (isPro = computed)
    const backendUrl = `${BACKEND_URL.value}/create-store-session`
    console.log(`💳 Paiement → ${backendUrl} (isPro: ${isPro.value})`)

    const res = await fetch(backendUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.value.map(i => ({
          nom:      i.name,
          prix:     parseFloat(i.price),
          quantity: i.qty,
        })),
        email:            customerEmail.value,
        ownerUid:         resolvedUid.value,
        storeUid:         resolvedUid.value,
        clientId:         svCurrentUser.value?.uid || clientAuth.currentUser?.uid || resolvedUid.value,
        siteSlug:         props.uid,
        adresseLivraison,
        storeName:        cfg?.storeName || siteMeta.value.name || "Store",
        currency:         cfg?.currency  || "eur",
        plan:             storeOwner.value.plan,
        successUrl,
        cancelUrl,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || err.details || `Erreur serveur ${res.status}`)
    }

    const data = await res.json()
    if (data.url) {
      showCart.value     = false
      showPayModal.value = false
      window.location.href = data.url
      return
    }
    throw new Error(data.error || "Pas d'URL Stripe reçue")

  } catch (e) {
    payError.value      = e.message
    payProcessing.value = false
  }
}

// ── Sauvegarde commande Firestore ─────────────────────────────
// Écrit dans DEUX endroits :
//   1. users/{ownerUid}/orders/{id}  → dashboard propriétaire
//   2. orders/{id}                   → collection globale (webhook Stripe)
const saveOrder = async (provider, transactionId) => {
  if (!resolvedUid.value) return
  const orderData = {
    items: cart.value.map(i => ({
      id: i.id, name: i.name, price: i.price,
      currency: i.currency, qty: i.qty, image: i.image || "",
    })),
    total:         cartTotal.value,
    currency:      cartCurrency.value,
    itemCount:     cartCount.value,
    provider,
    transactionId: transactionId || "stripe-checkout",
    customerName:  customerName.value,
    customerEmail: customerEmail.value,
    status:        "paid",
    createdAt:     new Date().toISOString(),
    siteSlug:      props.uid,
    storeUid:      resolvedUid.value,
    ownerUid:      resolvedUid.value,
  }
  try {
    // 1. Sous-collection du store (vue dashboard Orders.vue)
    await addDoc(collection(db, "users", resolvedUid.value, "orders"), orderData)
    console.log("✓ Order saved to users/" + resolvedUid.value + "/orders")
  } catch (e) {
    console.error("Erreur sauvegarde commande (sous-collection):", e.message)
  }
  try {
    // 2. Collection racine orders (compatible règle Firestore fournie)
    await addDoc(collection(db, "orders"), {
      ...orderData,
      clientId: resolvedUid.value,
    })
    console.log("✓ Order saved to orders/")
  } catch (e) {
    console.error("Erreur sauvegarde commande (racine):", e.message)
  }
  try {
    // 3. Collection cmdclients — commandes du CLIENT (pour profil client)
    await addDoc(collection(db, "cmdclients"), {
      ...orderData,
      clientUid:   svCurrentUser.value?.uid || clientAuth.currentUser?.uid || "",
      clientEmail: orderData.customerEmail || "",
      clientName:  orderData.customerName  || "",
      storeUid:    resolvedUid.value,
      siteSlug:    props.uid,
    })
    console.log("✓ Order saved to cmdclients/")
  } catch (e) {
    console.error("Erreur sauvegarde cmdclients:", e.message)
  }
  // Stocker pour PaymentSuccess.vue
  localStorage.setItem("pendingStripeOrder", JSON.stringify({
    ...orderData,
    clientUid: clientAuth.currentUser?.uid || "",
  }))
  cart.value = []
}
</script>

<template>
<div class="sv-root" :dir="svIsRtl ? 'rtl' : 'ltr'">

  <!-- LOADING -->
  <div v-if="loading" class="sv-loading">
    <div class="sv-spinner"></div>
    <p>Chargement du site...</p>
  </div>

  <!-- ERREUR -->
  <div v-else-if="error" class="sv-error">
    <span>🔍</span>
    <h2>Site introuvable</h2>
    <p class="sv-error-msg">{{ error }}</p>
    <div class="sv-error-debug">
      <p>Adresse demandée : <code>{{ uid }}</code></p>
      <p v-if="debugInfo" class="sv-debug-info">{{ debugInfo }}</p>
      <div class="sv-error-hints">
        <p>Causes possibles :</p>
        <ul>
          <li>Le site n'a pas encore été publié (cliquez sur <strong>Publier</strong> dans le builder)</li>
          <li>Le slug choisi est différent de <code>{{ uid }}</code></li>
          <li>Essayez avec votre UID Firestore à la place du slug</li>
        </ul>
      </div>
    </div>
    <button class="sv-error-retry" @click="loadSite">🔄 Réessayer</button>
  </div>

  <!-- SITE -->
  <template v-else-if="site">

    <!-- NAV du store -->
    <nav class="sv-nav">
      <!-- Logo -->
      <div class="sv-brand">
        <img v-if="siteMeta.logo" :src="siteMeta.logo" class="sv-brand-logo" alt="logo"/>
        <span v-else class="sv-brand-icon">◈</span>
        <span class="sv-brand-name">{{ siteMeta.name || site.pages?.[0]?.name || 'Mon Store' }}</span>
      </div>

      <!-- ① CONNEXION/DÉCONNEXION — avant le menu ───────────── -->
      <div class="sv-nav-auth">
        <!-- Connecté : avatar + nom + bouton déconnexion -->
        <div v-if="svCurrentUser" class="sv-user-pill" @click="svOpenProfile" title="Mon profil">
          <div class="sv-user-avatar">
            <img v-if="svCurrentUser.photoURL" :src="svCurrentUser.photoURL" class="sv-avatar-img" alt=""/>
            <span v-else>{{ (svCurrentUser.displayName||svCurrentUser.email||'?')[0].toUpperCase() }}</span>
          </div>
          <span class="sv-user-name">{{ svCurrentUser.displayName || svCurrentUser.email?.split('@')[0] }}</span>
          <span class="sv-profile-arrow">▾</span>
        </div>
        <!-- Non connecté : bouton Se connecter -->
        <button v-else class="sv-login-btn" @click="svShowAuth=true; svAuthMode='login'; svAuthError=''; svAuthSuccess=''">
          {{ svT.login }}
        </button>
      </div>

      <!-- ② MENU PAGES ────────────────────────────────────────── -->
      <div class="sv-page-tabs">
        <button
          v-for="(p, i) in site.pages" :key="p.id"
          class="sv-tab" :class="{ active: currentPageIndex === i }"
          @click="currentPageIndex = i"
        >{{ p.name }}</button>
      </div>

      <!-- ③ SÉLECTEUR LANGUE ──────────────────────────────────── -->
      <div class="sv-lang-sel" dir="ltr">
        <button
          v-for="l in svLangs" :key="l.code"
          :class="['sv-lang-flag', svLang===l.code && 'sv-lang-active']"
          @click="svLang=l.code"
          :title="l.full"
        >{{ l.flag }}</button>
      </div>

      <!-- ④ PANIER ─────────────────────────────────────────────── -->
      <button class="sv-cart-btn" @click="showCart = true">
        🛒 <span v-if="cartCount > 0" class="sv-cart-badge">{{ cartCount }}</span>
      </button>
    </nav>

    <!-- CONTENU PAGE -->
    <main class="sv-page" :style="currentPage?.style">
      <template v-for="s in currentPage?.sections" :key="s.id">

        <!-- HERO -->
        <div v-if="s.type==='hero'" class="sv-hero" :style="s.style">
          <h1 class="sv-hero-title">{{ s.content }}</h1>
          <p  class="sv-hero-sub">{{ s.subtitle }}</p>
          <button v-if="s.cta" class="sv-hero-cta">{{ s.cta }}</button>
        </div>

        <!-- TEXT -->
        <div v-else-if="s.type==='text'" class="sv-text" :style="s.style">
          <p>{{ s.content }}</p>
        </div>

        <!-- IMAGE -->
        <div v-else-if="s.type==='image'" class="sv-image" :style="s.style">
          <img v-if="s.url" :src="s.url" :alt="s.alt"/>
        </div>

        <!-- GALLERY -->
        <div v-else-if="s.type==='gallery'" class="sv-gallery" :style="s.style">
          <div class="sv-gallery-grid" :style="`grid-template-columns:repeat(${s.columns||3},1fr)`">
            <div v-for="img in s.images" :key="img.id" class="sv-gallery-item">
              <img :src="img.url" :alt="img.alt"/>
            </div>
          </div>
        </div>

        <!-- VIDEO -->
        <div v-else-if="s.type==='video'" class="sv-video" :style="s.style">
          <h3 v-if="s.title" class="sv-video-title">{{ s.title }}</h3>
          <div v-if="s.url" class="sv-video-wrap">
            <iframe :src="getEmbedUrl(s.url)" allowfullscreen></iframe>
          </div>
        </div>

        <!-- PRODUCTS -->
        <div v-else-if="s.type==='products'" class="sv-products" :style="s.style">
          <div class="sv-products-grid">
            <div v-for="p in s.items" :key="p.id" class="sv-product-card">
              <div class="sv-product-img-wrap">
                <img v-if="p.image" :src="p.image" :alt="p.name" class="sv-product-img"/>
                <div v-else class="sv-product-img-ph">🛍️</div>
                <span v-if="p.badge" class="sv-product-badge">{{ p.badge }}</span>
              </div>
              <div class="sv-product-body">
                <div class="sv-product-name">{{ p.name }}</div>
                <div class="sv-product-desc">{{ p.description }}</div>
                <div class="sv-product-footer">
                  <span class="sv-product-price">{{ p.price }}{{ p.currency }}</span>
                  <button class="sv-product-btn" @click="addToCart(p)">{{ svT.buy }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- FEATURES -->
        <div v-else-if="s.type==='features'" class="sv-features" :style="s.style">
          <div class="sv-features-grid">
            <div v-for="(item, fi) in s.items" :key="fi" class="sv-feature-card">
              <span class="sv-feat-icon">{{ item.icon }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>

        <!-- PAYMENT -->
        <div v-else-if="s.type==='payment'" class="sv-payment" :style="s.style">
          <h2 class="sv-payment-title">{{ s.title }}</h2>
          <p  class="sv-payment-desc">{{ s.description }}</p>
          <div class="sv-payment-amount">{{ s.amount }}{{ s.currency }}</div>
          <div class="sv-payment-btns">
            <button class="sv-pay-btn sv-stripe"
              @click="cart=[{...s, id:'direct', qty:1, price:s.amount}]; payProvider='stripe'; showPayModal=true">
              💳 Payer avec Stripe
            </button>
            <button class="sv-pay-btn sv-paypal"
              @click="cart=[{...s, id:'direct', qty:1, price:s.amount}]; payProvider='paypal'; showPayModal=true">
              🅿 Payer avec PayPal
            </button>
          </div>
        </div>

        <!-- FORM -->
        <div v-else-if="s.type==='form'" class="sv-form" :style="s.style">
          <h3>Contactez-nous</h3>
          <input
            v-model="contactName"
            placeholder="Nom complet"
            class="sv-form-input"
          />
          <input
            v-model="contactEmail"
            placeholder="Email"
            type="email"
            class="sv-form-input"
          />
          <textarea
            v-model="contactMessage"
            rows="4"
            placeholder="Votre message..."
            class="sv-form-input sv-form-textarea"
          ></textarea>
          <p v-if="contactError" class="sv-form-error">⚠ {{ contactError }}</p>
          <div v-if="contactSent" class="sv-form-success">
            ✅ Message envoyé ! Nous vous répondrons bientôt.
          </div>
          <button
            type="button"
            class="sv-form-btn"
            @click="sendContact"
            :disabled="contactSending"
          >
            <span v-if="contactSending">Envoi en cours...</span>
            <span v-else>Envoyer →</span>
          </button>
        </div>

        <!-- DIVIDER -->
        <div v-else-if="s.type==='divider'" class="sv-divider" :style="s.style">
          <hr/>
        </div>

      </template>
    </main>

    <!-- ── MODAL PANIER 2 ÉTAPES (panier → livraison → paiement) -->
    <Transition name="sv-modal">
      <div v-if="showCart" class="sv-modal-overlay sv-cart-overlay"
           @click.self="showCart=false; svCartStep='cart'">
        <div class="sv-modal-box sv-cart-box">

          <!-- HEADER -->
          <div class="sv-cart-header">
            <button v-if="svCartStep==='checkout'" class="sv-back-btn" @click="svCartStep='cart'">
              ← Retour
            </button>
            <div class="sv-cart-header-title">
              <span>{{ svCartStep==='cart' ? '🛒' : '📋' }}</span>
              <h2>{{ svCartStep==='cart' ? svT.cart : svT.delivery }}</h2>
              <span v-if="svCartStep==='cart' && cart.length>0" class="sv-cart-count">
                {{ cartCount }} article{{ cartCount>1?'s':'' }}
              </span>
            </div>
            <button class="sv-modal-close" @click="showCart=false; svCartStep='cart'">✕</button>
          </div>

          <!-- ÉTAPE 1 : ARTICLES -->
          <template v-if="svCartStep==='cart'">
            <div v-if="cart.length===0" class="sv-cart-empty">
              <span>🛍️</span><p>Votre panier est vide</p>
            </div>
            <div v-else class="sv-cart-items">
              <div v-for="item in cart" :key="item.id" class="sv-cart-item">
                <div class="sv-ci-img">
                  <img v-if="item.image" :src="item.image" :alt="item.name"/>
                  <span v-else>🛍️</span>
                </div>
                <div class="sv-ci-info">
                  <div class="sv-ci-name">{{ item.name }}</div>
                  <div class="sv-ci-price">{{ item.price }}{{ item.currency }}</div>
                </div>
                <div class="sv-ci-qty">
                  <button class="sv-qty-btn" @click="updateQty(item.id,-1)">−</button>
                  <span class="sv-qty-val">{{ item.qty }}</span>
                  <button class="sv-qty-btn" @click="updateQty(item.id,1)">+</button>
                </div>
                <div class="sv-ci-subtotal">{{ (parseFloat(item.price)*item.qty).toFixed(2) }}{{ item.currency }}</div>
                <button class="sv-ci-del" @click="removeFromCart(item.id)">✕</button>
              </div>
            </div>
            <div v-if="cart.length>0" class="sv-cart-footer">
              <div class="sv-cart-total-row">
                <span>Total</span>
                <strong>{{ cartTotal }}{{ cartCurrency }}</strong>
              </div>
              <div class="sv-cart-footer-btns">
                <button class="sv-btn-sec" @click="showCart=false">Continuer</button>
                <button class="sv-btn-primary sv-checkout-btn" @click="svCartStep='checkout'">
                  📋 {{ svT.delivery }} →
                </button>
              </div>
            </div>
          </template>

          <!-- ÉTAPE 2 : LIVRAISON + PAIEMENT -->
          <template v-else-if="svCartStep==='checkout'">

            <!-- Résumé articles -->
            <div class="sv-checkout-summary">
              <div v-for="item in cart" :key="item.id" class="sv-summary-item">
                <div class="sv-summary-img">
                  <img v-if="item.image" :src="item.image" :alt="item.name"/>
                  <span v-else>🛍️</span>
                </div>
                <span class="sv-summary-name">{{ item.name }} ×{{ item.qty }}</span>
                <span class="sv-summary-price">{{ (parseFloat(item.price)*item.qty).toFixed(2) }}{{ item.currency }}</span>
              </div>
              <div class="sv-summary-total">
                <span>Total</span>
                <strong>{{ cartTotal }}{{ cartCurrency }}</strong>
              </div>
            </div>

            <!-- Formulaire client + livraison -->
            <div class="sv-checkout-fields">
              <div class="sv-checkout-section">👤 Informations client</div>
              <div class="sv-checkout-row">
                <div class="sv-checkout-field">
                  <label>Nom complet *</label>
                  <input v-model="customerName"  placeholder="Jean Dupont" class="sv-checkout-input"/>
                </div>
                <div class="sv-checkout-field">
                  <label>Email *</label>
                  <input v-model="customerEmail" placeholder="jean@email.com" type="email" class="sv-checkout-input"/>
                </div>
              </div>

              <div class="sv-checkout-section" style="margin-top:12px">📦 Adresse de livraison</div>
              <div class="sv-checkout-field">
                <label>Adresse *</label>
                <input v-model="svAddress" placeholder="123 rue de la Paix" class="sv-checkout-input"/>
              </div>
              <div class="sv-checkout-row">
                <div class="sv-checkout-field">
                  <label>Code postal</label>
                  <input v-model="svZip" placeholder="75001" class="sv-checkout-input"/>
                </div>
                <div class="sv-checkout-field">
                  <label>Ville</label>
                  <input v-model="svCity" placeholder="Paris" class="sv-checkout-input"/>
                </div>
              </div>
              <div class="sv-checkout-field">
                <label>Pays</label>
                <select v-model="svCountry" class="sv-checkout-input sv-checkout-select">
                  <option>France</option>
                  <option>Maroc</option>
                  <option>Belgique</option>
                  <option>Suisse</option>
                  <option>Canada</option>
                  <option>Algérie</option>
                  <option>Tunisie</option>
                  <option>Sénégal</option>
                  <option>Côte d'Ivoire</option>
                </select>
              </div>
            </div>

            <div v-if="payError" class="sv-pay-error">⚠ {{ payError }}</div>

            <!-- Bouton payer -->
            <button class="sv-pay-final-btn" @click="payWithStripe" :disabled="payProcessing">
              <span v-if="payProcessing" class="sv-spinner"></span>
              <span v-else>💳</span>
              {{ payProcessing ? 'Redirection Stripe...' : `Payer ${cartTotal}${cartCurrency}` }}
            </button>
            <p class="sv-secure-note">🔒 Paiement sécurisé via Stripe</p>
          </template>

        </div>
      </div>
    </Transition>

  </template>
  <!-- ── MODAL PROFIL CLIENT ──────────────────────────────── -->
  <Transition name="sv-modal">
    <div v-if="svShowProfile && svCurrentUser" class="sv-modal-overlay sv-profile-overlay"
         @click.self="svShowProfile=false">
      <div class="sv-modal-box sv-profile-box">
        <button class="sv-modal-close" @click="svShowProfile=false">✕</button>

        <!-- Avatar + infos ─────────────────────────────────── -->
        <div class="svp-header">
          <div class="svp-avatar">
            <img v-if="svCurrentUser.photoURL" :src="svCurrentUser.photoURL" class="svp-avatar-img" alt=""/>
            <span v-else class="svp-avatar-initials">
              {{ (svCurrentUser.displayName||svCurrentUser.email||'?')[0].toUpperCase() }}
            </span>
          </div>
          <div class="svp-info">
            <div class="svp-name">{{ svCurrentUser.displayName || "Client" }}</div>
            <div class="svp-email">{{ svCurrentUser.email }}</div>
            <span class="svp-badge">🛍 Client du store</span>
          </div>
        </div>

        <!-- Action déconnexion ─────────────────────────────── -->
        <button class="svp-signout-btn" @click="svSignOut">
          ⏻ Se déconnecter
        </button>
      </div>
    </div>
  </Transition>

  <!-- ── MODAL AUTH STORE ──────────────────────────────────── -->
  <Transition name="sv-modal">
    <div v-if="svShowAuth" class="sv-modal-overlay sv-auth-overlay" @click.self="svShowAuth=false">
      <div class="sv-modal-box sv-auth-box">
        <button class="sv-modal-close" @click="svShowAuth=false">✕</button>

        <!-- Branding store -->
        <div class="sv-auth-brand">
          <div class="sv-auth-logo-wrap">
            <img v-if="siteMeta.logo" :src="siteMeta.logo" class="sv-auth-logo-img"/>
            <span v-else class="sv-auth-logo-ph">◈</span>
          </div>
          <span class="sv-auth-store">{{ siteMeta.name || 'Notre boutique' }}</span>
        </div>

        <!-- Onglets -->
        <div class="sv-auth-tabs">
          <button :class="['sv-auth-tab',{active:svAuthMode==='login'}]"    @click="svAuthMode='login';svAuthError='';svAuthSuccess=''">Connexion</button>
          <button :class="['sv-auth-tab',{active:svAuthMode==='register'}]" @click="svAuthMode='register';svAuthError='';svAuthSuccess=''">Inscription</button>
        </div>

        <!-- Messages -->
        <p v-if="svAuthError"   class="sv-auth-error">⚠ {{ svAuthError }}</p>
        <p v-if="svAuthSuccess" class="sv-auth-success">✓ {{ svAuthSuccess }}</p>

        <!-- CONNEXION -->
        <div v-if="svAuthMode==='login'" class="sv-auth-form">
          <input v-model="svEmail"    type="email"    placeholder="Email *"         class="sv-auth-input" @keydown.enter="svLogin"/>
          <input v-model="svPassword" type="password" placeholder="Mot de passe *"  class="sv-auth-input" @keydown.enter="svLogin"/>
          <button class="sv-auth-forgot-link" @click="svAuthMode='forgot';svAuthError='';svAuthSuccess=''">Mot de passe oublié ?</button>
          <button class="sv-auth-submit" @click="svLogin" :disabled="svAuthLoading">
            <span v-if="svAuthLoading" class="sv-auth-spin"></span>
            <span v-else>🔑 Se connecter</span>
          </button>
        </div>

        <!-- INSCRIPTION -->
        <div v-else-if="svAuthMode==='register'" class="sv-auth-form">
          <input v-model="svName"     type="text"     placeholder="Nom complet *"          class="sv-auth-input"/>
          <input v-model="svEmail"    type="email"    placeholder="Email *"                class="sv-auth-input"/>
          <input v-model="svPassword" type="password" placeholder="Mot de passe * (min.6)" class="sv-auth-input"/>
          <input v-model="svConfirm"  type="password" placeholder="Confirmer *"            class="sv-auth-input" @keydown.enter="svRegister"/>
          <button class="sv-auth-submit" @click="svRegister" :disabled="svAuthLoading">
            <span v-if="svAuthLoading" class="sv-auth-spin"></span>
            <span v-else>✨ Créer mon compte</span>
          </button>
        </div>

        <!-- MOT DE PASSE OUBLIÉ -->
        <div v-else-if="svAuthMode==='forgot'" class="sv-auth-form">
          <p class="sv-auth-forgot-desc">Entrez votre email pour recevoir un lien.</p>
          <input v-model="svEmail" type="email" placeholder="Email" class="sv-auth-input" @keydown.enter="svForgot"/>
          <button class="sv-auth-submit" @click="svForgot" :disabled="svAuthLoading">
            <span v-if="svAuthLoading" class="sv-auth-spin"></span>
            <span v-else>📧 Envoyer le lien</span>
          </button>
          <button class="sv-auth-back-link" @click="svAuthMode='login';svAuthError='';svAuthSuccess=''">← Retour</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ASSISTANT VOCAL CLIENT (Groq IA) -->
  <VoiceAssistantClient
    v-if="resolvedUid"
    :store-uid="resolvedUid"
    :store-name="siteMeta.name || 'Notre boutique'"
    :store-email="storePayConfig?.stripe?.storeName || ''"
    :lang="'fr'"
    :backend-url="'https://backend-master-production-cf50.up.railway.app'"
  />

</div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.sv-root{min-height:100vh;font-family:'DM Sans',sans-serif;color:#374151;background:#fff}

/* LOADING / ERROR */
.sv-loading,.sv-error{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#6b7280;text-align:center;padding:20px}
.sv-spinner{width:40px;height:40px;border:3px solid #e5e7eb;border-top-color:#6c63ff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.sv-error span{font-size:48px}.sv-error h2{font-size:22px;color:#374151}
.sv-error p{font-size:14px}.sv-error code{background:#f3f4f6;padding:2px 8px;border-radius:4px}

/* NAV */
.sv-nav{background:#fff;border-bottom:1px solid #e5e7eb;padding:0 14px;display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:100;box-shadow:0 1px 8px rgba(0,0,0,.06);height:56px;flex-wrap:nowrap}
.sv-lang-sel{display:flex;gap:2px;align-items:center;flex-shrink:0;direction:ltr}
.sv-lang-flag{background:none;border:2px solid transparent;border-radius:6px;padding:2px 4px;font-size:16px;cursor:pointer;transition:.15s;line-height:1}
.sv-lang-flag:hover{background:#f3f4f6;border-color:#e5e7eb}
.sv-lang-active{background:#6c63ff14;border-color:#6c63ff66 !important}
/* Nav auth (connexion/déconnexion) */
.sv-nav-auth{display:flex;align-items:center;flex-shrink:0}
.sv-user-pill{display:flex;align-items:center;gap:6px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:100px;padding:4px 10px 4px 4px}
.sv-user-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#a78bfa);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;overflow:hidden;flex-shrink:0}
.sv-avatar-img{width:100%;height:100%;object-fit:cover}
.sv-user-name{font-size:12px;font-weight:600;color:#374151;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sv-signout-btn{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:14px;padding:2px 4px;border-radius:4px;line-height:1;transition:all .15s}
.sv-signout-btn:hover{color:#ef4444;background:rgba(239,68,68,.1)}
.sv-login-btn{display:flex;align-items:center;gap:5px;background:#6c63ff;color:white;border:none;border-radius:9px;padding:7px 13px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
.sv-login-btn:hover{background:#5b52ee}
/* Auth modal */
.sv-auth-overlay .sv-modal-box{padding:0}
.sv-auth-box{max-width:380px}
.sv-auth-brand{display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px 20px 0;text-align:center}
.sv-auth-logo-wrap{width:52px;height:52px;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f3f4f6}
.sv-auth-logo-img{width:100%;height:100%;object-fit:contain}
.sv-auth-logo-ph{font-size:24px;color:#6c63ff}
.sv-auth-store{font-family:'Playfair Display',serif;font-size:17px;font-weight:600;color:#1a1a2e}
.sv-auth-tabs{display:flex;background:#f3f4f6;border-radius:10px;padding:3px;margin:14px 18px 0;gap:3px}
.sv-auth-tab{flex:1;padding:8px;background:none;border:none;border-radius:8px;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.sv-auth-tab.active{background:white;color:#6c63ff;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.1)}
.sv-auth-error{margin:10px 18px 0;background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:9px 12px;border-radius:8px;font-size:13px}
.sv-auth-success{margin:10px 18px 0;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;padding:9px 12px;border-radius:8px;font-size:13px}
.sv-auth-form{display:flex;flex-direction:column;gap:10px;padding:14px 18px 20px}
.sv-auth-input{padding:11px 13px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;color:#1a1a2e;transition:border-color .15s;width:100%}
.sv-auth-input:focus{border-color:#6c63ff;box-shadow:0 0 0 3px rgba(108,99,255,.08)}
.sv-auth-forgot-link{background:none;border:none;color:#6c63ff;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:right;padding:0;align-self:flex-end}
.sv-auth-submit{padding:13px;background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s}
.sv-auth-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(108,99,255,.35)}
.sv-auth-submit:disabled{opacity:.6;cursor:not-allowed}
.sv-auth-spin{width:15px;height:15px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:sv-auth-spin .6s linear infinite;flex-shrink:0}
@keyframes sv-auth-spin{to{transform:rotate(360deg)}}
.sv-auth-forgot-desc{font-size:13px;color:#6b7280;text-align:center;line-height:1.6}
.sv-auth-back-link{background:none;border:none;color:#9ca3af;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:center;padding:4px;transition:color .15s}
.sv-auth-back-link:hover{color:#374151}
@media(max-width:480px){.sv-user-name{display:none}.sv-login-btn{padding:7px 10px;font-size:11px}}
.sv-brand{display:flex;align-items:center;gap:8px;margin-right:auto}
.sv-brand-logo{width:32px;height:32px;border-radius:6px;object-fit:contain}
.sv-brand-icon{font-size:20px;color:#6c63ff}
.sv-brand-name{font-family:'Playfair Display',serif;font-size:18px;color:#1a1a2e;font-weight:600}
.sv-page-tabs{display:flex;gap:4px;flex-wrap:wrap}
.sv-tab{background:transparent;border:1px solid transparent;color:#6b7280;font-size:14px;padding:6px 14px;border-radius:6px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
.sv-tab:hover{background:#f3f4f6;color:#111}
.sv-tab.active{background:#6c63ff;color:white;border-color:#6c63ff}
.sv-cart-btn{display:flex;align-items:center;gap:6px;background:#f3f4f6;border:1px solid #e5e7eb;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:14px;font-family:'DM Sans',sans-serif;transition:all .15s}
.sv-cart-btn:hover{background:#ede9fe;border-color:#6c63ff}
.sv-cart-badge{background:#6c63ff;color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px}
.sv-page{min-height:calc(100vh - 57px)}

/* HERO */
.sv-hero{padding:100px 60px;background:linear-gradient(135deg,#f8f7ff,#ede9fe);text-align:center}
.sv-hero-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:600;color:#1a1a2e;line-height:1.15;white-space:pre-line;margin-bottom:16px}
.sv-hero-sub{font-size:20px;color:#6b7280;margin-bottom:32px}
.sv-hero-cta{background:#6c63ff;color:white;border:none;border-radius:10px;padding:14px 32px;font-size:16px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .2s}
.sv-hero-cta:hover{transform:translateY(-2px)}
/* TEXT */
.sv-text{padding:48px 60px}.sv-text p{font-size:17px;line-height:1.8;color:#374151;max-width:720px}
/* IMAGE */
.sv-image{padding:32px 60px}.sv-image img{width:100%;border-radius:12px;display:block}
/* GALLERY */
.sv-gallery{padding:32px 60px}.sv-gallery-grid{display:grid;gap:10px}
.sv-gallery-item{border-radius:10px;overflow:hidden;aspect-ratio:1}
.sv-gallery-item img{width:100%;height:100%;object-fit:cover;display:block}
/* VIDEO */
.sv-video{padding:32px 60px}
.sv-video-title{font-family:'Playfair Display',serif;font-size:24px;color:#1a1a2e;margin-bottom:16px}
.sv-video-wrap{border-radius:12px;overflow:hidden}
.sv-video-wrap iframe{width:100%;height:400px;border:none;display:block}
/* PRODUCTS */
.sv-products{padding:48px 60px;background:#fafafa}
.sv-products-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.sv-product-card{background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:transform .2s}
.sv-product-card:hover{transform:translateY(-4px)}
.sv-product-img-wrap{position:relative}
.sv-product-img{width:100%;height:200px;object-fit:cover;display:block}
.sv-product-img-ph{width:100%;height:200px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:48px}
.sv-product-badge{position:absolute;top:12px;left:12px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px}
.sv-product-body{padding:18px}
.sv-product-name{font-size:16px;font-weight:600;color:#111;margin-bottom:6px}
.sv-product-desc{font-size:13px;color:#6b7280;line-height:1.5;margin-bottom:14px}
.sv-product-footer{display:flex;align-items:center;justify-content:space-between}
.sv-product-price{font-size:20px;font-weight:700;color:#6c63ff}
.sv-product-btn{background:#6c63ff;color:white;border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;display:flex;align-items:center;gap:6px}
.sv-product-btn:hover{background:#5b52ee;transform:translateY(-1px)}
/* FEATURES */
.sv-features{padding:60px;background:#fafafa}
.sv-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:840px;margin:0 auto}
.sv-feature-card{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:28px 24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.sv-feat-icon{font-size:32px;display:block;margin-bottom:12px}
.sv-feature-card strong{font-size:16px;color:#111;display:block;margin-bottom:6px}
.sv-feature-card p{font-size:14px;color:#6b7280;line-height:1.5}
/* PAYMENT */
.sv-payment{padding:80px 60px;background:linear-gradient(135deg,#f8f7ff,#ede9fe);text-align:center}
.sv-payment-title{font-family:'Playfair Display',serif;font-size:36px;color:#1a1a2e;margin-bottom:10px}
.sv-payment-desc{font-size:16px;color:#6b7280;margin-bottom:24px}
.sv-payment-amount{font-size:64px;font-weight:700;color:#6c63ff;margin-bottom:36px}
.sv-payment-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sv-pay-btn{padding:14px 32px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .2s}
.sv-pay-btn:hover{transform:translateY(-2px)}
.sv-stripe{background:#635bff;color:white}.sv-paypal{background:#ffc439;color:#003087}
/* FORM */
.sv-form{padding:60px;background:#f8f7ff;display:flex;flex-direction:column;align-items:center;gap:12px}
.sv-form h3{font-family:'Playfair Display',serif;font-size:30px;color:#1a1a2e;margin-bottom:12px}
.sv-form-input{width:100%;max-width:500px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:white;outline:none;transition:border-color .15s}
.sv-form-input:focus{border-color:#6c63ff}
.sv-form-textarea{min-height:120px;resize:vertical}
.sv-form-error{color:#ef4444;font-size:13px;width:100%;max-width:500px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px}
.sv-form-success{color:#065f46;font-size:14px;font-weight:600;width:100%;max-width:500px;padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;text-align:center}
.sv-form-btn{background:#6c63ff;color:white;border:none;border-radius:10px;padding:13px 28px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;width:100%;max-width:500px}
.sv-form-btn:hover:not(:disabled){background:#5b52ee;transform:translateY(-1px)}
.sv-form-btn:disabled{opacity:.6;cursor:not-allowed}
/* DIVIDER */
.sv-divider hr{border:none;border-top:1px solid #e5e7eb;margin:8px 60px}

/* MODALS */
.sv-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:500;display:flex;align-items:flex-start;justify-content:center;padding:16px 20px;overflow-y:auto}
.sv-modal-box{background:white;border-radius:16px;padding:32px;position:relative;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.18)}
.sv-modal-close{position:absolute;top:16px;right:16px;background:#f3f4f6;border:none;color:#6b7280;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.sv-modal-header{text-align:center;margin-bottom:20px}
.sv-modal-header span{font-size:36px;display:block;margin-bottom:10px}
.sv-modal-header h2{font-family:'Playfair Display',serif;font-size:22px;color:#1a1a2e}
.sv-modal-enter-active,.sv-modal-leave-active{transition:all .25s ease}
.sv-modal-enter-from,.sv-modal-leave-to{opacity:0;transform:scale(.95)}
/* CART */
.sv-cart-empty{text-align:center;padding:40px;color:#9ca3af;display:flex;flex-direction:column;align-items:center;gap:12px}
.sv-cart-empty span{font-size:40px;opacity:.5}
.sv-cart-items{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;max-height:340px;overflow-y:auto}
.sv-cart-item{display:grid;grid-template-columns:48px 1fr auto auto 24px;align-items:center;gap:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px}
.sv-ci-img{width:48px;height:48px;border-radius:8px;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.sv-ci-img img{width:100%;height:100%;object-fit:cover}
.sv-ci-info{min-width:0}
.sv-ci-name{font-size:13px;font-weight:600;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sv-ci-price{font-size:12px;color:#6b7280}
.sv-ci-qty{display:flex;align-items:center;gap:6px}
.sv-ci-qty button{background:#e5e7eb;border:none;color:#374151;width:24px;height:24px;border-radius:5px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.sv-ci-qty span{font-size:13px;font-weight:600;min-width:20px;text-align:center}
.sv-ci-subtotal{font-size:13px;font-weight:700;color:#6c63ff;white-space:nowrap}
.sv-ci-del{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:14px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:4px}
.sv-ci-del:hover{background:#fee2e2;color:#ef4444}
.sv-cart-footer{border-top:1px solid #e5e7eb;padding-top:16px}
.sv-cart-total{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.sv-cart-total span{font-size:14px;color:#6b7280}
.sv-cart-total strong{font-size:24px;font-weight:700;color:#6c63ff}
.sv-cart-actions{display:flex;gap:10px}
.sv-btn-sec{flex:1;padding:11px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:14px;font-family:'DM Sans',sans-serif;color:#374151}
.sv-btn-primary{flex:2;padding:12px;background:#6c63ff;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif}
.sv-btn-primary:hover{background:#5b52ee}
/* PAYMENT MODAL */
.sv-pay-box{max-width:440px}
.sv-pay-amount{font-size:34px;font-weight:700;color:#6c63ff;margin-top:6px}
.sv-customer-fields{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.sv-cust-input{width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none}
.sv-cust-input:focus{border-color:#6c63ff}
.sv-pay-error{background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px}
.sv-pay-tabs{display:flex;gap:8px;margin-bottom:16px}
.sv-pay-tabs button{flex:1;padding:10px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;color:#6b7280;transition:all .15s}
.sv-pay-tabs button.active{background:#635bff;color:white;border-color:#635bff}
.sv-pay-form{display:flex;flex-direction:column;gap:12px}
.sv-stripe-checkout-info{background:#f8f9ff;border:1px solid #e0e7ff;border-radius:10px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.sv-stripe-logo{background:#635bff;color:white;font-size:13px;font-weight:800;letter-spacing:2px;padding:6px 16px;border-radius:6px;text-transform:lowercase}
.sv-stripe-checkout-desc{font-size:13px;color:#6b7280;line-height:1.6}
.sv-stripe-badges{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.sv-stripe-badges span{background:#f3f4f6;border:1px solid #e5e7eb;color:#374151;font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px}
.sv-paypal-wrap{min-height:50px}
.sv-pay-note{font-size:11px;color:#9ca3af;text-align:center}
.sv-pay-submit{width:100%;padding:14px;background:#635bff;color:white;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px}
.sv-pay-submit:disabled{opacity:.6;cursor:not-allowed}
.sv-spinner-sm{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .6s linear infinite}
/* PAY SUCCESS */
.sv-pay-success{text-align:center;padding:16px 0}
.sv-success-icon{width:64px;height:64px;background:#10b981;border-radius:50%;color:white;font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.sv-pay-success h2{font-family:'Playfair Display',serif;font-size:22px;color:#1a1a2e;margin-bottom:8px}
.sv-pay-success p{font-size:14px;color:#6b7280;line-height:1.6}

@media(max-width:768px){
  .sv-nav{padding:10px 16px;flex-wrap:wrap}
  .sv-hero{padding:60px 24px}.sv-hero-title{font-size:34px}
  .sv-text,.sv-image,.sv-gallery,.sv-video,.sv-products,.sv-features,.sv-payment,.sv-form{padding-left:20px;padding-right:20px}
  .sv-products-grid{grid-template-columns:1fr 1fr}.sv-features-grid{grid-template-columns:1fr}
}
@media(max-width:480px){
  .sv-products-grid{grid-template-columns:1fr}
  .sv-cart-item{grid-template-columns:40px 1fr auto 24px}
  .sv-ci-subtotal{display:none}
}

/* ── Cart 2 étapes SiteViewer ───────────────────────────── */
.sv-cart-overlay .sv-modal-box{padding:0;display:flex;flex-direction:column;max-height:92vh;overflow:hidden}
.sv-cart-box{max-width:520px}
.sv-cart-header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e5e7eb;background:#f9fafb;flex-shrink:0}
.sv-back-btn{background:#f3f4f6;border:1px solid #e5e7eb;color:#6b7280;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all .15s}
.sv-back-btn:hover{background:#e5e7eb}
.sv-cart-header-title{display:flex;align-items:center;gap:8px;flex:1}
.sv-cart-header-title span:first-child{font-size:20px}
.sv-cart-header-title h2{font-size:16px;font-weight:700;color:#1a1a2e;margin:0}
.sv-cart-count{background:#6c63ff;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px}
.sv-cart-items{overflow-y:auto;flex:1;padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.sv-cart-item{display:grid;grid-template-columns:44px 1fr auto auto 24px;align-items:center;gap:8px;padding:10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px}
.sv-ci-img{width:44px;height:44px;border-radius:8px;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:20px}
.sv-ci-img img{width:100%;height:100%;object-fit:cover}
.sv-ci-info{min-width:0}
.sv-ci-name{font-size:13px;font-weight:600;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sv-ci-price{font-size:12px;color:#6b7280}
.sv-ci-qty{display:flex;align-items:center;gap:5px}
.sv-qty-btn{width:24px;height:24px;background:#e5e7eb;border:none;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.sv-qty-val{font-size:13px;font-weight:600;min-width:18px;text-align:center}
.sv-ci-subtotal{font-size:12px;font-weight:700;color:#6c63ff;white-space:nowrap}
.sv-ci-del{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:13px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px}
.sv-ci-del:hover{background:#fef2f2;color:#ef4444}
.sv-cart-footer{padding:12px 16px;border-top:1px solid #e5e7eb;flex-shrink:0}
.sv-cart-total-row{display:flex;justify-content:space-between;align-items:center;font-size:15px;color:#374151;margin-bottom:12px}
.sv-cart-total-row strong{font-size:20px;font-weight:800;color:#6c63ff}
.sv-cart-footer-btns{display:flex;gap:8px}
.sv-checkout-btn{flex:2;justify-content:center}

/* Checkout step */
.sv-checkout-summary{padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;flex-shrink:0;max-height:140px;overflow-y:auto}
.sv-summary-item{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f3f4f6}
.sv-summary-item:last-of-type{border-bottom:none}
.sv-summary-img{width:32px;height:32px;border-radius:6px;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.sv-summary-img img{width:100%;height:100%;object-fit:cover}
.sv-summary-name{flex:1;font-size:12px;color:#374151}
.sv-summary-price{font-size:12px;font-weight:700;color:#6c63ff;white-space:nowrap}
.sv-summary-total{display:flex;justify-content:space-between;padding-top:8px;margin-top:4px;border-top:1px solid #e5e7eb;font-size:14px;color:#374151}
.sv-summary-total strong{font-size:16px;color:#6c63ff}

.sv-checkout-fields{padding:12px 16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1}
.sv-checkout-section{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;padding-bottom:5px;border-bottom:1px solid #f3f4f6}
.sv-checkout-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sv-checkout-field{display:flex;flex-direction:column;gap:4px}
.sv-checkout-field label{font-size:11px;color:#6b7280;font-weight:500}
.sv-checkout-input{padding:9px 12px;border:1px solid #e5e7eb;border-radius:9px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;color:#374151;transition:border-color .15s;width:100%;background:white}
.sv-checkout-input:focus{border-color:#6c63ff}
.sv-checkout-select{cursor:pointer}

.sv-pay-error{margin:0 16px;background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:8px 12px;border-radius:8px;font-size:13px;flex-shrink:0}
.sv-pay-final-btn{margin:10px 16px;width:calc(100% - 32px);padding:14px;background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;flex-shrink:0}
.sv-pay-final-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(108,99,255,.35)}
.sv-pay-final-btn:disabled{opacity:.6;cursor:not-allowed}
.sv-secure-note{text-align:center;font-size:11px;color:#9ca3af;padding-bottom:12px;flex-shrink:0}
.sv-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:sv-spin .6s linear infinite;flex-shrink:0}
@keyframes sv-spin{to{transform:rotate(360deg)}}


/* ── Profil client — pill cliquable ────────────────────── */
.sv-user-pill{cursor:pointer;transition:all .15s}
.sv-user-pill:hover{background:#ede9fe;border-color:#6c63ff}
.sv-profile-arrow{font-size:11px;color:#9ca3af;margin-left:2px}

/* ── Modal profil ───────────────────────────────────────── */
.sv-profile-overlay .sv-modal-box{padding:0;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;margin-top:0}
.sv-profile-box{max-width:440px}

/* Header avatar */
.svp-header{display:flex;align-items:center;gap:14px;padding:20px 20px 16px;background:linear-gradient(135deg,#6c63ff,#a78bfa);flex-shrink:0}
.svp-avatar{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,.4)}
.svp-avatar-img{width:100%;height:100%;object-fit:cover}
.svp-avatar-initials{color:white;font-size:22px;font-weight:700}
.svp-info{flex:1;min-width:0}
.svp-name{font-size:16px;font-weight:700;color:white;margin-bottom:2px}
.svp-email{font-size:12px;color:rgba(255,255,255,.8);word-break:break-all}
.svp-badge{display:inline-block;background:rgba(255,255,255,.2);color:white;font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px;margin-top:5px;border:1px solid rgba(255,255,255,.3)}

/* Stats */





/* Section commandes */






@keyframes svp-spin{to{transform:rotate(360deg)}}



.svp-shop-btn:hover{background:#5b52ee}


/* Carte commande */

.svp-order-card:hover{border-color:#6c63ff}










.svp-s-delivered{background:#f0fdf4;color:#15803d}
.svp-s-cancelled{background:#fef2f2;color:#dc2626}




/* Déconnexion */
.svp-signout-btn{width:calc(100% - 32px);margin:10px 16px 14px;padding:11px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#ef4444;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;text-align:center;flex-shrink:0}
.svp-signout-btn:hover{background:rgba(239,68,68,.15)}


/* ══ VARIABLES THÈME (appliquées par SaasGenerator) ════════ */
/* Valeurs par défaut — remplacées dynamiquement via JS */
:root {
  --theme-accent:      #6c63ff;
  --theme-accent-hover:#4f46e5;
  --theme-bg:          #ffffff;
  --theme-bg-alt:      #fafafa;
  --theme-bg-hero:     linear-gradient(135deg,#f8f7ff,#ede9fe);
  --theme-text:        #1a1a2e;
  --theme-text-sub:    #6b7280;
  --theme-btn-radius:  10px;
  --theme-btn-padding: 14px 32px;
  --theme-card-radius: 16px;
  --theme-card-shadow: 0 2px 12px rgba(0,0,0,.06);
  --theme-hero-font:   'Playfair Display',serif;
  --theme-body-font:   'DM Sans',sans-serif;
  --theme-nav-bg:      #ffffff;
  --theme-nav-border:  #e5e7eb;
}
/* Sections du store branchées sur les variables thème */
.sv-hero-section    { background: var(--theme-bg-hero) !important; }
.sv-hero-title      { font-family: var(--theme-hero-font) !important; color: var(--theme-text) !important; }
.sv-hero-sub        { color: var(--theme-text-sub) !important; }
.sv-hero-cta        { background: var(--theme-accent) !important; border-radius: var(--theme-btn-radius) !important; padding: var(--theme-btn-padding) !important; font-family: var(--theme-body-font) !important; }
.sv-hero-cta:hover  { background: var(--theme-accent-hover) !important; }
.sv-product-card    { border-radius: var(--theme-card-radius) !important; box-shadow: var(--theme-card-shadow) !important; }
.sv-product-price   { color: var(--theme-accent) !important; }
.sv-product-btn     { background: var(--theme-accent) !important; border-radius: calc(var(--theme-btn-radius) * .6) !important; font-family: var(--theme-body-font) !important; }
.sv-product-btn:hover { background: var(--theme-accent-hover) !important; }
.sv-nav             { background: var(--theme-nav-bg) !important; border-bottom-color: var(--theme-nav-border) !important; }
.sv-cart-btn        { background: var(--theme-accent) !important; }
.sv-login-btn       { border-color: var(--theme-accent) !important; color: var(--theme-accent) !important; }
.sv-pay-btn         { background: var(--theme-accent) !important; border-radius: var(--theme-btn-radius) !important; }
.sv-pay-btn:hover   { background: var(--theme-accent-hover) !important; }
.sv-form-btn        { background: var(--theme-accent) !important; border-radius: var(--theme-btn-radius) !important; }
.sv-tab.active      { background: var(--theme-accent) !important; color: #fff !important; }
</style>
