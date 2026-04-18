<script setup>
import { ref, computed, onMounted, watch } from "vue"
import VoiceAssistantClient from "../components/VoiceAssistantClient.vue"
import { db, auth } from "../firebase.js"
import { doc, getDoc, setDoc, addDoc, deleteDoc, collection } from "firebase/firestore"
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { stripeConfig, loadStripeSDK } from "./stripe.js"
import { paypalConfig, loadPaypalSDK } from "./paypal.js"

// Site vide par défaut — sera remplacé par les données Firestore au login
// ou restera vide pour la première inscription
const site = ref({
  pages: [{ id: 1, name: "Accueil", style: {}, sections: [] }]
})

const mode = ref("edit")
const currentPageIndex = ref(0)
const activeSectionIndex = ref(null)
const isSaved = ref(true)
const isSaving = ref(false)
const currentUser   = ref(null)
const userRole      = ref("")      // "owner" | "customer" | ""
const userOrders    = ref([])
const loadingOrders = ref(false)
const isOwner  = computed(() => userRole.value === "owner" || userRole.value === "")
const isClient = computed(() => userRole.value === "customer")
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
const showThemeImport  = ref(false)
const themeImportError = ref("")
const themeImportFile  = ref(null)
const themeScope       = ref("site")   // "site" | "page"

// ── Import de thème externe ────────────────────────────────
// Format attendu : JSON exporté depuis SaasBuilder
// { pages: [...] }  → importer tout le site
// { sections: [...] } → importer dans la page courante
const importTheme = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  themeImportError.value = ""
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)

      if (themeScope.value === "site" && data.pages && Array.isArray(data.pages)) {
        // Importer tout le site
        site.value = { pages: data.pages }
        notify("✅ Thème appliqué sur tout le site !", "success")
        showThemeImport.value = false

      } else if (data.sections && Array.isArray(data.sections)) {
        // Importer uniquement les sections dans la page courante
        const page = currentPage.value
        if (page) {
          page.sections = data.sections.map(s => ({ ...s, id: Date.now() + Math.random() }))
          notify("✅ Thème appliqué sur la page courante !", "success")
        }
        showThemeImport.value = false

      } else if (data.pages && Array.isArray(data.pages) && themeScope.value === "page") {
        // Importer les sections de la première page du thème dans la page courante
        const page = currentPage.value
        if (page && data.pages[0]?.sections) {
          page.sections = data.pages[0].sections.map(s => ({ ...s, id: Date.now() + Math.random() }))
          notify("✅ Sections du thème importées dans la page courante !", "success")
        }
        showThemeImport.value = false

      } else {
        themeImportError.value = "Format invalide. Le fichier doit contenir { pages: [...] } ou { sections: [...] }"
      }
    } catch(err) {
      themeImportError.value = "Fichier JSON invalide : " + err.message
    }
  }
  reader.readAsText(file)
  // Reset input pour permettre re-sélection du même fichier
  event.target.value = ""
}

// Exporter le site actuel comme thème JSON téléchargeable
const exportTheme = () => {
  const json = JSON.stringify(site.value, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `theme-${siteName.value || "saasbuilder"}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  notify("✅ Thème exporté !", "success")
}

// ===== I18N =====
const currentLang = ref("fr")
const langs = [
  { code: "fr", label: "🇫🇷 Français" },
  { code: "en", label: "🇬🇧 English" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "ar", label: "🇲🇦 العربية" },
]
const t = computed(() => translations[currentLang.value])

const translations = {
  fr: {
    save: "Sauvegarder", saving: "Sauvegarde...", notConnected: "Non connecté",
    saved: "✓ Sauvegardé", unsaved: "● Non sauvegardé",
    edit: "✏ Éditer", preview: "▶ Aperçu",
    sections: "Sections", style: "Style",
    addSection: "Ajouter une section",
    properties: "Propriétés", typography: "Typographie",
    textColor: "Couleur texte", sectionBg: "Fond de section",
    fontSize: "Taille de police", auto: "Auto",
    small: "Petite", normal: "Normale", large: "Grande", xlarge: "Très grande",
    pageStyle: "Style de la page", bgColor: "Couleur de fond",
    textColorPage: "Couleur du texte", font: "Police",
    columns: "Colonnes", emptyPage: "Cette page est vide.",
    addSectionHint: "Ajoutez une section depuis le panneau gauche.",
    export: "Exporter", exportTitle: "Exporter le site",
    exportDesc: "Choisissez votre format d'export",
    htmlStatic: "HTML statique", htmlDesc: "Un fichier .html tout-en-un, prêt à héberger.",
    download: "Télécharger", dlDesc: "Téléchargez votre site complet.",
    exportNote: "Les images sont intégrées en base64. Les paiements Stripe/PayPal nécessitent un backend.",
    recommended: "Recommandé", exportSuccess: "Site exporté en HTML ✓",
    publish: "Publier", publishTitle: "Publier votre site",
    publishDesc: "Choisissez une adresse pour votre site",
    siteAddress: "Adresse du site", siteAddressPlaceholder: "mon-site (ex: mon-boutique)",
    domainLink: "Lier un nom de domaine (optionnel)", domainPlaceholder: "ex: www.mondomaine.com",
    publishBtn: "Publier le site", publishSuccess: "Site publié ✓",
    dnsTitle: "Configuration DNS", dnsDesc: "Ajoutez ces enregistrements chez votre registrar :",
    dnsInputTitle: "Saisir vos DNS personnalisés", dnsInputDesc: "Entrez les serveurs DNS fournis par votre registrar (ex: Godaddy, Namecheap...)",
    dnsNs1: "Serveur DNS 1 (NS1)", dnsNs2: "Serveur DNS 2 (NS2)",
    dnsNs3: "Serveur DNS 3 (optionnel)", dnsNs4: "Serveur DNS 4 (optionnel)",
    saveDns: "Enregistrer les DNS", dnsInstructions: "Instructions",
    dnsStep1: "1. Connectez-vous à votre registrar (GoDaddy, Namecheap, OVH...)",
    dnsStep2: "2. Allez dans la gestion des DNS de votre domaine",
    dnsStep3: "3. Remplacez les NS existants par ceux ci-dessus",
    dnsStep4: "4. La propagation prend 24-48h",
    copyDns: "Copier", dnsCopied: "Copié ✓",
    logoTitle: "Logo du site", logoUpload: "Changer le logo", logoRemove: "Supprimer",
    logoHint: "Cliquez pour ajouter un logo",
    siteNameLabel: "Nom du site", siteNamePlaceholder: "Nom de votre site...",
    configureStripe: "Configurer Stripe", configurePaypal: "Configurer PayPal",
    newPage: "Nouvelle page", keepOnePage: "Gardez au moins une page.",
    connectedError: "Vous devez être connecté.", saveError: "Erreur de sauvegarde.",
    loadError: "Erreur de chargement. Données locales utilisées.",
    paySuccess: "Paiement réussi !", payDone: "Votre paiement a bien été traité.",
    close: "Fermer", cancel: "Annuler", modifyAddress: "Modifier l'adresse",
    cartTitle: "Mon panier", cartEmpty: "Votre panier est vide", cartTotal: "Total", cartCheckout: "Finaliser la commande", cartRemove: "Supprimer", cartContinue: "Continuer les achats", cartAdd: "Ajouter au panier",
    siteUrlLabel: "URL de votre site",
    publishNoteFile: "Le fichier publier.txt a été téléchargé avec tous les détails.",
    // Section labels
    sHero: "Titre + CTA", sText: "Paragraphe libre", sImage: "Photo / illustration",
    sGallery: "Grille d'images", sVideo: "YouTube / Vimeo", sProducts: "Catalogue",
    sFeatures: "Grille avantages", sPayment: "Stripe & PayPal", sForm: "Formulaire", sDivider: "Ligne décorative",
    // Section edit labels
    heroTitlePh: "Titre principal...", heroSubPh: "Sous-titre...", heroCtaPh: "Bouton CTA...",
    textPh: "Votre texte ici...",
    imgUploadHint: "Cliquer pour charger une image", imgChange: "Changer", imgAltPh: "Texte alt...",
    galleryLabel: "Galerie", galleryImages: "image(s)", galleryAdd: "+ Ajouter",
    galleryEmpty: "Aucune image — cliquez sur \"+ Ajouter\"",
    videoLabel: "Vidéo", videoTitlePh: "Titre de la vidéo...", videoUrlPh: "URL YouTube ou Vimeo...",
    videoHint: "Collez une URL YouTube ou Vimeo",
    productsLabel: "Catalogue produits", addProduct: "+ Produit",
    badgePh: "Badge (Nouveau, Promo...)", productNamePh: "Nom du produit",
    productDescPh: "Description courte", productPricePh: "Prix",
    featureTitlePh: "Titre...", featureDescPh: "Description...",
    paymentLabel: "Section Paiement", paymentTitlePh: "Titre du paiement...",
    paymentDescPh: "Description...", paymentAmountPh: "Montant",
    testStripe: "💳 Tester Stripe", testPaypal: "🅿 Tester PayPal",
    contactLabel: "Formulaire de contact", namePh: "Nom complet", emailPh: "Adresse email",
    msgPh: "Votre message...", sendBtn: "Envoyer →",
    // Preview labels
    prevContactTitle: "Contactez-nous", prevNamePh: "Nom complet", prevEmailPh: "Email",
    prevMsgPh: "Message...", prevSendBtn: "Envoyer →",
    prevPayStripe: "💳 Payer avec Stripe", prevPayPaypal: "🅿 Payer avec PayPal",
    prevImgEmpty: "Image non définie", prevGalleryEmpty: "Galerie vide", prevVideoEmpty: "URL vidéo non définie",
    prevBuyBtn: "Acheter",
    // Default font options
    fontDefault: "Par défaut", fontGeorgia: "Georgia", fontCourier: "Courier New",
    fontTrebuchet: "Trebuchet", fontVerdana: "Verdana",
    colOption2: "2 colonnes", colOption3: "3 colonnes", colOption4: "4 colonnes",
  },
  en: {
    save: "Save", saving: "Saving...", notConnected: "Not connected",
    saved: "✓ Saved", unsaved: "● Unsaved",
    edit: "✏ Edit", preview: "▶ Preview",
    sections: "Sections", style: "Style",
    addSection: "Add a section",
    properties: "Properties", typography: "Typography",
    textColor: "Text color", sectionBg: "Section background",
    fontSize: "Font size", auto: "Auto",
    small: "Small", normal: "Normal", large: "Large", xlarge: "Extra large",
    pageStyle: "Page style", bgColor: "Background color",
    textColorPage: "Text color", font: "Font",
    columns: "Columns", emptyPage: "This page is empty.",
    addSectionHint: "Add a section from the left panel.",
    export: "Export", exportTitle: "Export site",
    exportDesc: "Choose your export format",
    htmlStatic: "Static HTML", htmlDesc: "A single all-in-one .html file, ready to host.",
    download: "Download", dlDesc: "Download your complete site.",
    exportNote: "Images are embedded in base64. Stripe/PayPal payments require a backend.",
    recommended: "Recommended", exportSuccess: "Site exported as HTML ✓",
    publish: "Publish", publishTitle: "Publish your site",
    publishDesc: "Choose an address for your site",
    siteAddress: "Site address", siteAddressPlaceholder: "my-site (e.g. my-shop)",
    domainLink: "Link a domain name (optional)", domainPlaceholder: "e.g. www.mydomain.com",
    publishBtn: "Publish site", publishSuccess: "Site published ✓",
    dnsTitle: "DNS Configuration", dnsDesc: "Add these records at your registrar:",
    dnsInputTitle: "Enter your custom DNS", dnsInputDesc: "Enter the DNS servers provided by your registrar (e.g. GoDaddy, Namecheap...)",
    dnsNs1: "DNS Server 1 (NS1)", dnsNs2: "DNS Server 2 (NS2)",
    dnsNs3: "DNS Server 3 (optional)", dnsNs4: "DNS Server 4 (optional)",
    saveDns: "Save DNS", dnsInstructions: "Instructions",
    dnsStep1: "1. Log in to your registrar (GoDaddy, Namecheap, OVH...)",
    dnsStep2: "2. Go to the DNS management of your domain",
    dnsStep3: "3. Replace existing NS with the ones above",
    dnsStep4: "4. Propagation takes 24-48h",
    copyDns: "Copy", dnsCopied: "Copied ✓",
    logoTitle: "Site logo", logoUpload: "Change logo", logoRemove: "Remove",
    logoHint: "Click to add a logo",
    siteNameLabel: "Site name", siteNamePlaceholder: "Your site name...",
    configureStripe: "Configure Stripe", configurePaypal: "Configure PayPal",
    newPage: "New page", keepOnePage: "Keep at least one page.",
    connectedError: "You must be logged in.", saveError: "Save error.",
    loadError: "Load error. Local data used.",
    paySuccess: "Payment successful!", payDone: "Your payment has been processed.",
    close: "Close", cancel: "Cancel", modifyAddress: "Modify address",
    cartTitle: "My cart", cartEmpty: "Your cart is empty", cartTotal: "Total", cartCheckout: "Checkout", cartRemove: "Remove", cartContinue: "Continue shopping", cartAdd: "Add to cart",
    siteUrlLabel: "Your site URL",
    publishNoteFile: "The publier.txt file has been downloaded with all details.",
    sHero: "Title + CTA", sText: "Free paragraph", sImage: "Photo / illustration",
    sGallery: "Image grid", sVideo: "YouTube / Vimeo", sProducts: "Catalog",
    sFeatures: "Features grid", sPayment: "Stripe & PayPal", sForm: "Form", sDivider: "Decorative line",
    heroTitlePh: "Main title...", heroSubPh: "Subtitle...", heroCtaPh: "CTA Button...",
    textPh: "Your text here...",
    imgUploadHint: "Click to upload an image", imgChange: "Change", imgAltPh: "Alt text...",
    galleryLabel: "Gallery", galleryImages: "image(s)", galleryAdd: "+ Add",
    galleryEmpty: "No images — click \"+ Add\"",
    videoLabel: "Video", videoTitlePh: "Video title...", videoUrlPh: "YouTube or Vimeo URL...",
    videoHint: "Paste a YouTube or Vimeo URL",
    productsLabel: "Product catalog", addProduct: "+ Product",
    badgePh: "Badge (New, Sale...)", productNamePh: "Product name",
    productDescPh: "Short description", productPricePh: "Price",
    featureTitlePh: "Title...", featureDescPh: "Description...",
    paymentLabel: "Payment Section", paymentTitlePh: "Payment title...",
    paymentDescPh: "Description...", paymentAmountPh: "Amount",
    testStripe: "💳 Test Stripe", testPaypal: "🅿 Test PayPal",
    contactLabel: "Contact Form", namePh: "Full name", emailPh: "Email address",
    msgPh: "Your message...", sendBtn: "Send →",
    prevContactTitle: "Contact Us", prevNamePh: "Full name", prevEmailPh: "Email",
    prevMsgPh: "Message...", prevSendBtn: "Send →",
    prevPayStripe: "💳 Pay with Stripe", prevPayPaypal: "🅿 Pay with PayPal",
    prevImgEmpty: "Image not defined", prevGalleryEmpty: "Empty gallery", prevVideoEmpty: "Video URL not defined",
    prevBuyBtn: "Buy",
    fontDefault: "Default", fontGeorgia: "Georgia", fontCourier: "Courier New",
    fontTrebuchet: "Trebuchet", fontVerdana: "Verdana",
    colOption2: "2 columns", colOption3: "3 columns", colOption4: "4 columns",
  },
  es: {
    save: "Guardar", saving: "Guardando...", notConnected: "No conectado",
    saved: "✓ Guardado", unsaved: "● No guardado",
    edit: "✏ Editar", preview: "▶ Vista previa",
    sections: "Secciones", style: "Estilo",
    addSection: "Añadir una sección",
    properties: "Propiedades", typography: "Tipografía",
    textColor: "Color de texto", sectionBg: "Fondo de sección",
    fontSize: "Tamaño de fuente", auto: "Auto",
    small: "Pequeño", normal: "Normal", large: "Grande", xlarge: "Muy grande",
    pageStyle: "Estilo de página", bgColor: "Color de fondo",
    textColorPage: "Color de texto", font: "Fuente",
    columns: "Columnas", emptyPage: "Esta página está vacía.",
    addSectionHint: "Añade una sección desde el panel izquierdo.",
    export: "Exportar", exportTitle: "Exportar sitio",
    exportDesc: "Elige tu formato de exportación",
    htmlStatic: "HTML estático", htmlDesc: "Un archivo .html todo-en-uno, listo para alojar.",
    download: "Descargar", dlDesc: "Descarga tu sitio completo.",
    exportNote: "Las imágenes están integradas en base64. Los pagos Stripe/PayPal requieren un backend.",
    recommended: "Recomendado", exportSuccess: "Sitio exportado en HTML ✓",
    publish: "Publicar", publishTitle: "Publicar su sitio",
    publishDesc: "Elija una dirección para su sitio",
    siteAddress: "Dirección del sitio", siteAddressPlaceholder: "mi-sitio (ej: mi-tienda)",
    domainLink: "Vincular un dominio (opcional)", domainPlaceholder: "ej: www.midominio.com",
    publishBtn: "Publicar sitio", publishSuccess: "Sitio publicado ✓",
    dnsTitle: "Configuración DNS", dnsDesc: "Añade estos registros en tu registrador:",
    dnsInputTitle: "Introducir DNS personalizados", dnsInputDesc: "Introduce los servidores DNS de tu registrador (ej. GoDaddy, Namecheap...)",
    dnsNs1: "Servidor DNS 1 (NS1)", dnsNs2: "Servidor DNS 2 (NS2)",
    dnsNs3: "Servidor DNS 3 (opcional)", dnsNs4: "Servidor DNS 4 (opcional)",
    saveDns: "Guardar DNS", dnsInstructions: "Instrucciones",
    dnsStep1: "1. Inicia sesión en tu registrador (GoDaddy, Namecheap, OVH...)",
    dnsStep2: "2. Ve a la gestión DNS de tu dominio",
    dnsStep3: "3. Reemplaza los NS existentes por los de arriba",
    dnsStep4: "4. La propagación tarda 24-48h",
    copyDns: "Copiar", dnsCopied: "Copiado ✓",
    logoTitle: "Logo del sitio", logoUpload: "Cambiar logo", logoRemove: "Eliminar",
    logoHint: "Haz clic para añadir un logo",
    siteNameLabel: "Nombre del sitio", siteNamePlaceholder: "Nombre de tu sitio...",
    configureStripe: "Configurar Stripe", configurePaypal: "Configurar PayPal",
    newPage: "Nueva página", keepOnePage: "Mantén al menos una página.",
    connectedError: "Debes estar conectado.", saveError: "Error al guardar.",
    loadError: "Error de carga. Datos locales usados.",
    paySuccess: "¡Pago exitoso!", payDone: "Tu pago ha sido procesado.",
    close: "Cerrar", cancel: "Cancelar", modifyAddress: "Modificar dirección",
    cartTitle: "Mi carrito", cartEmpty: "Tu carrito está vacío", cartTotal: "Total", cartCheckout: "Finalizar pedido", cartRemove: "Eliminar", cartContinue: "Seguir comprando", cartAdd: "Añadir al carrito",
    siteUrlLabel: "URL de tu sitio",
    publishNoteFile: "El archivo publier.txt fue descargado con todos los detalles.",
    sHero: "Título + CTA", sText: "Párrafo libre", sImage: "Foto / ilustración",
    sGallery: "Cuadrícula de imágenes", sVideo: "YouTube / Vimeo", sProducts: "Catálogo",
    sFeatures: "Cuadrícula de ventajas", sPayment: "Stripe & PayPal", sForm: "Formulario", sDivider: "Línea decorativa",
    heroTitlePh: "Título principal...", heroSubPh: "Subtítulo...", heroCtaPh: "Botón CTA...",
    textPh: "Tu texto aquí...",
    imgUploadHint: "Haz clic para cargar una imagen", imgChange: "Cambiar", imgAltPh: "Texto alt...",
    galleryLabel: "Galería", galleryImages: "imagen(es)", galleryAdd: "+ Añadir",
    galleryEmpty: "Sin imágenes — haz clic en \"+ Añadir\"",
    videoLabel: "Vídeo", videoTitlePh: "Título del vídeo...", videoUrlPh: "URL de YouTube o Vimeo...",
    videoHint: "Pega una URL de YouTube o Vimeo",
    productsLabel: "Catálogo de productos", addProduct: "+ Producto",
    badgePh: "Etiqueta (Nuevo, Oferta...)", productNamePh: "Nombre del producto",
    productDescPh: "Descripción corta", productPricePh: "Precio",
    featureTitlePh: "Título...", featureDescPh: "Descripción...",
    paymentLabel: "Sección de Pago", paymentTitlePh: "Título del pago...",
    paymentDescPh: "Descripción...", paymentAmountPh: "Importe",
    testStripe: "💳 Probar Stripe", testPaypal: "🅿 Probar PayPal",
    contactLabel: "Formulario de contacto", namePh: "Nombre completo", emailPh: "Correo electrónico",
    msgPh: "Tu mensaje...", sendBtn: "Enviar →",
    prevContactTitle: "Contáctenos", prevNamePh: "Nombre completo", prevEmailPh: "Email",
    prevMsgPh: "Mensaje...", prevSendBtn: "Enviar →",
    prevPayStripe: "💳 Pagar con Stripe", prevPayPaypal: "🅿 Pagar con PayPal",
    prevImgEmpty: "Imagen no definida", prevGalleryEmpty: "Galería vacía", prevVideoEmpty: "URL de vídeo no definida",
    prevBuyBtn: "Comprar",
    fontDefault: "Por defecto", fontGeorgia: "Georgia", fontCourier: "Courier New",
    fontTrebuchet: "Trebuchet", fontVerdana: "Verdana",
    colOption2: "2 columnas", colOption3: "3 columnas", colOption4: "4 columnas",
  },
  ar: {
    save: "حفظ", saving: "جارٍ الحفظ...", notConnected: "غير متصل",
    saved: "✓ تم الحفظ", unsaved: "● غير محفوظ",
    edit: "✏ تحرير", preview: "▶ معاينة",
    sections: "الأقسام", style: "النمط",
    addSection: "إضافة قسم",
    properties: "الخصائص", typography: "الخط",
    textColor: "لون النص", sectionBg: "خلفية القسم",
    fontSize: "حجم الخط", auto: "تلقائي",
    small: "صغير", normal: "عادي", large: "كبير", xlarge: "كبير جداً",
    pageStyle: "نمط الصفحة", bgColor: "لون الخلفية",
    textColorPage: "لون النص", font: "الخط",
    columns: "الأعمدة", emptyPage: "هذه الصفحة فارغة.",
    addSectionHint: "أضف قسماً من اللوحة اليسرى.",
    export: "تصدير", exportTitle: "تصدير الموقع",
    exportDesc: "اختر تنسيق التصدير",
    htmlStatic: "HTML ثابت", htmlDesc: "ملف .html واحد جاهز للاستضافة.",
    download: "تحميل", dlDesc: "حمّل موقعك الكامل.",
    exportNote: "الصور مدمجة بصيغة base64. مدفوعات Stripe/PayPal تتطلب خادماً خلفياً.",
    recommended: "موصى به", exportSuccess: "تم تصدير الموقع ✓",
    publish: "نشر", publishTitle: "نشر موقعك",
    publishDesc: "اختر عنواناً لموقعك",
    siteAddress: "عنوان الموقع", siteAddressPlaceholder: "موقعي (مثال: متجري)",
    domainLink: "ربط اسم نطاق (اختياري)", domainPlaceholder: "مثال: www.نطاقي.com",
    publishBtn: "نشر الموقع", publishSuccess: "تم نشر الموقع ✓",
    dnsTitle: "إعداد DNS", dnsDesc: "أضف هذه السجلات لدى المسجّل:",
    dnsInputTitle: "إدخال DNS المخصص", dnsInputDesc: "أدخل خوادم DNS من مزود النطاق الخاص بك (GoDaddy, Namecheap...)",
    dnsNs1: "خادم DNS 1 (NS1)", dnsNs2: "خادم DNS 2 (NS2)",
    dnsNs3: "خادم DNS 3 (اختياري)", dnsNs4: "خادم DNS 4 (اختياري)",
    saveDns: "حفظ DNS", dnsInstructions: "تعليمات",
    dnsStep1: "1. سجّل الدخول إلى مزود النطاق (GoDaddy, Namecheap, OVH...)",
    dnsStep2: "2. انتقل إلى إدارة DNS للنطاق",
    dnsStep3: "3. استبدل NS الحالية بالخوادم أعلاه",
    dnsStep4: "4. قد يستغرق الانتشار 24-48 ساعة",
    copyDns: "نسخ", dnsCopied: "تم النسخ ✓",
    logoTitle: "شعار الموقع", logoUpload: "تغيير الشعار", logoRemove: "حذف",
    logoHint: "انقر لإضافة شعار",
    siteNameLabel: "اسم الموقع", siteNamePlaceholder: "اسم موقعك...",
    configureStripe: "إعداد Stripe", configurePaypal: "إعداد PayPal",
    newPage: "صفحة جديدة", keepOnePage: "احتفظ بصفحة واحدة على الأقل.",
    connectedError: "يجب أن تكون متصلاً.", saveError: "خطأ في الحفظ.",
    loadError: "خطأ في التحميل. تم استخدام البيانات المحلية.",
    paySuccess: "تم الدفع بنجاح!", payDone: "تمت معالجة دفعتك.",
    close: "إغلاق", cancel: "إلغاء", modifyAddress: "تعديل العنوان",
    cartTitle: "سلة التسوق", cartEmpty: "سلتك فارغة", cartTotal: "المجموع", cartCheckout: "إتمام الطلب", cartRemove: "حذف", cartContinue: "مواصلة التسوق", cartAdd: "أضف إلى السلة",
    siteUrlLabel: "رابط موقعك",
    publishNoteFile: "تم تحميل ملف publier.txt مع جميع التفاصيل.",
    sHero: "عنوان + CTA", sText: "فقرة حرة", sImage: "صورة / رسم",
    sGallery: "شبكة صور", sVideo: "يوتيوب / فيميو", sProducts: "كتالوج",
    sFeatures: "شبكة مميزات", sPayment: "Stripe & PayPal", sForm: "نموذج", sDivider: "فاصل زخرفي",
    heroTitlePh: "العنوان الرئيسي...", heroSubPh: "العنوان الفرعي...", heroCtaPh: "زر CTA...",
    textPh: "نصك هنا...",
    imgUploadHint: "انقر لتحميل صورة", imgChange: "تغيير", imgAltPh: "نص بديل...",
    galleryLabel: "معرض", galleryImages: "صورة/صور", galleryAdd: "+ إضافة",
    galleryEmpty: "لا توجد صور — انقر على \"+ إضافة\"",
    videoLabel: "فيديو", videoTitlePh: "عنوان الفيديو...", videoUrlPh: "رابط يوتيوب أو فيميو...",
    videoHint: "الصق رابط يوتيوب أو فيميو",
    productsLabel: "كتالوج المنتجات", addProduct: "+ منتج",
    badgePh: "شارة (جديد، عرض...)", productNamePh: "اسم المنتج",
    productDescPh: "وصف قصير", productPricePh: "السعر",
    featureTitlePh: "العنوان...", featureDescPh: "الوصف...",
    paymentLabel: "قسم الدفع", paymentTitlePh: "عنوان الدفع...",
    paymentDescPh: "الوصف...", paymentAmountPh: "المبلغ",
    testStripe: "💳 اختبار Stripe", testPaypal: "🅿 اختبار PayPal",
    contactLabel: "نموذج الاتصال", namePh: "الاسم الكامل", emailPh: "البريد الإلكتروني",
    msgPh: "رسالتك...", sendBtn: "إرسال →",
    prevContactTitle: "اتصل بنا", prevNamePh: "الاسم الكامل", prevEmailPh: "البريد الإلكتروني",
    prevMsgPh: "الرسالة...", prevSendBtn: "إرسال →",
    prevPayStripe: "💳 الدفع عبر Stripe", prevPayPaypal: "🅿 الدفع عبر PayPal",
    prevImgEmpty: "الصورة غير محددة", prevGalleryEmpty: "المعرض فارغ", prevVideoEmpty: "رابط الفيديو غير محدد",
    prevBuyBtn: "شراء",
    fontDefault: "افتراضي", fontGeorgia: "Georgia", fontCourier: "Courier New",
    fontTrebuchet: "Trebuchet", fontVerdana: "Verdana",
    colOption2: "عمودان", colOption3: "3 أعمدة", colOption4: "4 أعمدة",
  }
}

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
  // Passer à l'étape checkout dans la même modale panier
  cartStep.value    = "checkout"
  cartPayError.value = ""
}

const backToCart = () => { cartStep.value = "cart" }

// Payer depuis le panier (Stripe Checkout → backend)
const payCart = async () => {
  cartPayError.value = ""
  // Vérifier que le client est connecté avant de payer
  if (!currentUser.value) {
    cartPayError.value = "Connectez-vous pour finaliser votre commande."
    // Fermer le panier et rediriger vers l'auth
    setTimeout(() => {
      showCart.value = false
      cartStep.value = "cart"
      window.location.hash = "#/auth"
    }, 1200)
    return
  }
  if (!cartCustomerName.value.trim())    { cartPayError.value = "Nom obligatoire.";    return }
  if (!cartCustomerEmail.value.trim())   { cartPayError.value = "Email obligatoire.";  return }
  if (!cartCustomerAddress.value.trim()) { cartPayError.value = "Adresse obligatoire."; return }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cartCustomerEmail.value)
  if (!emailOk) { cartPayError.value = "Email invalide."; return }

  const cfg = liveStripeConfig.value
  if (!cfg.backendUrl || cfg.backendUrl.includes("votre-backend")) {
    notify("⚠️ Configurez votre backendUrl dans stripe.js", "error"); return
  }

  paymentProcessing.value = true
  try {
    const adresseLivraison = `${cartCustomerAddress.value}, ${cartCustomerZip.value} ${cartCustomerCity.value}, ${cartCustomerCountry.value}`.trim()

    // Sauvegarder en localStorage avant le redirect Stripe
    const pendingOrder = {
      items:            cart.value.map(i => ({
        id: i.id, name: i.name, price: i.price,
        currency: i.currency || "€", qty: i.qty, image: i.image || "",
      })),
      total:            cartTotal.value,
      currency:         cartCurrency.value || "€",
      itemCount:        cartCount.value,
      customerName:     cartCustomerName.value.trim(),
      customerEmail:    cartCustomerEmail.value.trim().toLowerCase(),
      customerAddress:  adresseLivraison,
      ownerUid:         currentUser.value?.uid,
      siteSlug:         currentUser.value?.uid,
      provider:         "stripe",
      createdAt:        new Date().toISOString(),
    }
    localStorage.setItem("pendingStripeOrder", JSON.stringify(pendingOrder))
    localStorage.setItem("stripeOwnerUid",     currentUser.value?.uid || "")

    // Appel backend Stripe
    const res = await fetch(cfg.backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount:   Math.round(parseFloat(cartTotal.value) * 100),
        currency: cfg.currency || "eur",
        description: `Commande — ${cartCount.value} article(s)`,
        items:    cart.value.map(i => ({
          nom:         i.name,
          prix:        parseFloat(i.price),
          quantity:    i.qty,
          description: i.description || "",
          image:       i.image || "",
        })),
        email:            cartCustomerEmail.value.trim(),
        clientId:         currentUser.value?.uid || "guest",
        storeName:        cfg.storeName || siteName.value,
        adresseLivraison,
        customerName:     cartCustomerName.value.trim(),
        successUrl:       `https://musrh.github.io/SaasBuilder/`,
        cancelUrl:        `https://musrh.github.io/SaasBuilder/`,
      }),
    })

    if (!res.ok) throw new Error("Erreur serveur " + res.status)
    const data = await res.json()
    if (!data.url) throw new Error(data.error || "Pas d'URL Stripe reçue")

    // Fermer et rediriger
    showCart.value = false
    window.location.href = data.url

  } catch(e) {
    cartPayError.value = e.message
    notify("Erreur paiement : " + e.message, "error")
  } finally {
    paymentProcessing.value = false
  }
}

const emptyCart = () => { cart.value = [] }

// ===== INFOS CLIENT PANIER =====
const cartCustomerName    = ref("")
const cartCustomerEmail   = ref("")
const cartCustomerAddress = ref("")   // adresse de livraison
const cartCustomerCity    = ref("")
const cartCustomerZip     = ref("")
const cartCustomerCountry = ref("France")
const cartStep            = ref("cart")  // "cart" | "checkout" | "success"
const cartPayError        = ref("")

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
const showMobileSidebar = ref(false)  // sidebar visible sur mobile
const showUserProfile   = ref(false)  // popup profil utilisateur
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

const publishSite = async () => {
  if (!publishAddress.value.trim()) { notify("Entrez une adresse pour le site.", "error"); return }
  if (!currentUser.value) { notify(t.value.connectedError, "error"); return }

  const uid    = currentUser.value.uid
  const slug   = publishAddress.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
  const domain = publishDomain.value.trim()

  // URL principale : /site/{uid} — route Vue Router dans SaasBuilder
  // URL slug (alias convivial) : /site/{slug} → résolu via collection slugs
  const urlUid  = `https://musrh.github.io/SaasBuilder/#/site/${uid}`
  const urlSlug = `https://musrh.github.io/SaasBuilder/#/site/${slug}`

  try {
    // 1. Sauvegarder siteData + slug dans le document de l'utilisateur
    const userRef = doc(db, "users", uid)
    await setDoc(userRef, {
      siteData: site.value,
      siteName: siteName.value,
      siteLogo: siteLogo.value,
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

    // 4. Synchroniser les produits du site vers prodinfos (pour l'assistant vocal)
    try {
      const { getDocs: gd2, query: q2, where: w2, deleteDoc: del2, doc: d2 }
        = await import("firebase/firestore")

      // Supprimer les anciens prodinfos de ce store
      const oldSnap = await gd2(q2(
        collection(db, "prodinfos"), w2("storeUid", "==", uid)))
      for (const oldDoc of oldSnap.docs) {
        await del2(d2(db, "prodinfos", oldDoc.id))
      }

      // Écrire les produits actuels du site
      for (const page of site.value.pages || []) {
        for (const section of page.sections || []) {
          if (section.type === "products" && Array.isArray(section.items)) {
            for (const p of section.items) {
              await addDoc(collection(db, "prodinfos"), {
                name:        p.name        || "",
                price:       parseFloat(p.price) || 0,
                description: p.description || "",
                badge:       p.badge       || "",
                currency:    p.currency    || "€",
                image:       p.image       || "",
                storeUid:    uid,
                syncedAt:    new Date().toISOString(),
              })
            }
          }
        }
      }
      console.log("✅ prodinfos synchronisés avec siteData")
    } catch(eSyncProd) {
      console.warn("Sync prodinfos:", eSyncProd.message)
    }

    publishInfo.value = { slug, urlUid, urlSlug, domain, uid }
    publishStatus.value = "published"

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

// ===== FORMULAIRE CONTACT =====
const contactForm = ref({ name: "", email: "", message: "" })
const contactSending = ref(false)
const contactSent    = ref(false)
const contactError   = ref("")

const sendContact = async (sectionStyle) => {
  if (!contactForm.value.name || !contactForm.value.email || !contactForm.value.message) {
    contactError.value = "Veuillez remplir tous les champs."; return
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.value.email)
  if (!emailValid) { contactError.value = "Email invalide."; return }

  contactSending.value = true
  contactError.value   = ""
  try {
    // uid du propriétaire du store :
    //   - si connecté (builder) → currentUser.uid
    //   - si aperçu public → publishInfo.uid
    const uid = currentUser.value?.uid || publishInfo.value?.uid
    if (!uid) {
      contactError.value = "Impossible d'identifier le store. Réessayez."
      return
    }
    const contactData = {
      name:      contactForm.value.name.trim(),
      email:     contactForm.value.email.trim().toLowerCase(),
      message:   contactForm.value.message.trim(),
      createdAt: new Date().toISOString(),
      storeUid:  uid,
      status:    "nouveau",
    }
    // Écrire dans users/{uid}/contacts → règle Firestore : allow create: if true
    await addDoc(collection(db, "users", uid, "contacts"), contactData)
    contactSent.value   = true
    contactForm.value   = { name: "", email: "", message: "" }
    notify("✓ Message envoyé avec succès !")
    setTimeout(() => { contactSent.value = false }, 4000)
  } catch(e) {
    contactError.value = "Erreur d'envoi. Réessayez."
    console.error("Contact form error:", e)
  } finally {
    contactSending.value = false
  }
}

onMounted(() => {
  // Restaurer depuis localStorage immédiatement (avant Firestore)
  const sn = localStorage.getItem("siteName")
  const sl = localStorage.getItem("siteLogo")
  if (sn) siteName.value = sn
  if (sl) siteLogo.value = sl
  onAuthStateChanged(auth, async (user) => {
    if (!user) { userRole.value = ""; userOrders.value = []; return }
    currentUser.value = user
    await loadSavedConfigs()
    // Détecter propriétaire vs client
    try {
      const ownerSnap = await getDoc(doc(db, "users", user.uid))
      if (ownerSnap.exists()) {
        userRole.value = "owner"
      } else {
        const custSnap = await getDoc(doc(db, "customers", user.uid))
        userRole.value = custSnap.exists() ? "customer" : "owner"
        if (userRole.value === "customer") {
          // Charger commandes du client
          const storeUid = custSnap.data()?.storeUid || ""
          if (storeUid) {
            try {
              const { query: q, where, getDocs: gd } = await import("firebase/firestore")
              const results = []
              const dedup = (d) => { if (!results.find(r => r.id === d.id)) results.push({ id: d.id, ...d.data() }) }
              const uid   = user.uid
              const email = (user.email || "").toLowerCase()

              // SANS orderBy → pas d'index composite requis, tri côté client

              // Source 1 : orders par clientId
              try {
                const s1 = await gd(q(collection(db, "orders"), where("clientId", "==", uid)))
                s1.docs.forEach(dedup)
              } catch(e) { console.error("orders/clientId:", e.message) }

              // Source 2 : orders par customerEmail
              if (email) {
                try {
                  const s2 = await gd(q(collection(db, "orders"), where("customerEmail", "==", email)))
                  s2.docs.forEach(dedup)
                } catch(e) { console.error("orders/email:", e.message) }
              }

              // Source 3 : cmdclients par clientUid
              try {
                const s3 = await gd(q(collection(db, "cmdclients"), where("clientUid", "==", uid)))
                s3.docs.forEach(dedup)
              } catch(e) { console.error("cmdclients/uid:", e.message) }

              // Source 4 : cmdclients par clientEmail
              if (email) {
                try {
                  const s4 = await gd(q(collection(db, "cmdclients"), where("clientEmail", "==", email)))
                  s4.docs.forEach(dedup)
                } catch(e) { console.error("cmdclients/email:", e.message) }
              }

              // Tri côté client
              results.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
              userOrders.value = results
            } catch(e) { console.warn("orders:", e.message) }
          }
        }
      }
    } catch(e) { userRole.value = "owner" }

    try {
      const docRef = doc(db, "users", user.uid)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const d = snap.data()
        if (d.siteName) siteName.value = d.siteName
        if (d.siteLogo) siteLogo.value = d.siteLogo

        if (d.siteData) {
          // Utilisateur existant : charger son site sauvegardé
          site.value = d.siteData
        } else {
          // Première inscription : site VIDE (ne pas charger localStorage)
          // L'utilisateur part d'une page blanche
          site.value = {
            pages: [{ id: 1, name: "Accueil", style: {}, sections: [] }]
          }
          localStorage.removeItem("siteDataPro")  // Effacer tout résidu
        }

        // ── Recharger le slug publié ──────────────────────
        if (d.publishedSlug) {
          publishAddress.value = d.publishedSlug
          publishStatus.value  = "published"
          const base = "https://musrh.github.io/SaasBuilder"
          publishInfo.value = {
            slug:    d.publishedSlug,
            uid:     user.uid,
            urlSlug: `${base}/#/site/${d.publishedSlug}`,
            urlUid:  `${base}/#/site/${user.uid}`,
            domain:  d.customDomain || null,
          }
        }
      } else {
        // Nouveau compte : document users/ inexistant → site VIDE
        site.value = {
          pages: [{ id: 1, name: "Accueil", style: {}, sections: [] }]
        }
        localStorage.removeItem("siteDataPro")
      }
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

const signedOut      = ref(false)   // afficher écran déconnexion
const soMode         = ref("login") // "login" | "register" | "forgot"
const soEmail        = ref("")
const soPassword     = ref("")
const soConfirm      = ref("")
const soDisplayName  = ref("")
const soError        = ref("")
const soSuccess      = ref("")
const soLoading      = ref(false)

// Messages d'erreur Firebase → français
const authErrMsg = (code) => ({
  "auth/user-not-found":       "Aucun compte avec cet email.",
  "auth/wrong-password":       "Mot de passe incorrect.",
  "auth/invalid-email":        "Format d'email invalide.",
  "auth/email-already-in-use": "Un compte existe déjà avec cet email.",
  "auth/weak-password":        "Mot de passe trop court (min. 6 caractères).",
  "auth/too-many-requests":    "Trop de tentatives. Réessayez plus tard.",
  "auth/invalid-credential":   "Email ou mot de passe incorrect.",
}[code] || "Erreur : " + code)

// Connexion
const soLogin = async () => {
  soError.value = ""; soSuccess.value = ""
  if (!soEmail.value.trim() || !soPassword.value) {
    soError.value = "Email et mot de passe requis."; return
  }
  soLoading.value = true
  try {
    await signInWithEmailAndPassword(auth, soEmail.value.trim(), soPassword.value)
    signedOut.value = false
    soEmail.value = ""; soPassword.value = ""
  } catch(e) { soError.value = authErrMsg(e.code) }
  finally { soLoading.value = false }
}

// Inscription nouveau client du store
const soRegister = async () => {
  soError.value = ""; soSuccess.value = ""
  if (!soDisplayName.value.trim()) { soError.value = "Votre nom est requis."; return }
  if (!soEmail.value.trim())       { soError.value = "Email requis."; return }
  if (soPassword.value.length < 6) { soError.value = "Mot de passe : min. 6 caractères."; return }
  if (soPassword.value !== soConfirm.value) { soError.value = "Les mots de passe ne correspondent pas."; return }
  soLoading.value = true
  try {
    const cred = await createUserWithEmailAndPassword(auth, soEmail.value.trim(), soPassword.value)
    await updateProfile(cred.user, { displayName: soDisplayName.value.trim() })
    // storeUid = UID du propriétaire du store
    // On le lit depuis publishInfo (déjà chargé) ou currentUser si c'est le builder
    const storeUid = publishInfo.value?.uid || currentUser.value?.uid || ""
    // Écrire dans customers/{clientUid} — règle Firestore : allow create: if request.auth != null
    await setDoc(
      doc(db, "customers", cred.user.uid),
      {
        uid:         cred.user.uid,
        email:       soEmail.value.trim().toLowerCase(),
        displayName: soDisplayName.value.trim(),
        storeUid,
        role:        "customer",
        createdAt:   new Date().toISOString(),
      },
      { merge: true }
    )
    soSuccess.value = "Compte créé avec succès ! Bienvenue 🎉"
    signedOut.value = false
    soEmail.value = ""; soPassword.value = ""; soConfirm.value = ""; soDisplayName.value = ""
    soMode.value = "login"
  } catch(e) { soError.value = authErrMsg(e.code) }
  finally { soLoading.value = false }
}

// Récupération mot de passe
const soForgot = async () => {
  soError.value = ""; soSuccess.value = ""
  if (!soEmail.value.trim()) { soError.value = "Entrez votre email d'abord."; return }
  soLoading.value = true
  try {
    await sendPasswordResetEmail(auth, soEmail.value.trim())
    soSuccess.value = "Email de réinitialisation envoyé ! Vérifiez votre boîte mail."
  } catch(e) { soError.value = authErrMsg(e.code) }
  finally { soLoading.value = false }
}

// Connexion Google
const soGoogleLogin = async () => {
  soError.value = ""; soLoading.value = true
  try {
    const provider = new GoogleAuthProvider()
    const result   = await signInWithPopup(auth, provider)
    const storeUid = publishInfo.value?.uid || currentUser.value?.uid || ""
    await setDoc(
      doc(db, "customers", result.user.uid),
      {
        uid:         result.user.uid,
        email:       result.user.email,
        displayName: result.user.displayName || "",
        photoURL:    result.user.photoURL    || "",
        storeUid,
        role:        "customer",
        createdAt:   new Date().toISOString(),
      },
      { merge: true }
    )
    signedOut.value = false
  } catch(e) { soError.value = authErrMsg(e.code) }
  finally { soLoading.value = false }
}

const handleSignOut = async () => {
  try {
    showUserProfile.value = false
    await signOut(auth)
    signedOut.value = true
  } catch(e) {
    notify("Erreur déconnexion", "error")
  }
}

const notify = (msg, type = "success") => {
  notifMsg.value = msg; notifType.value = type; showNotif.value = true
  setTimeout(() => showNotif.value = false, 2800)
}

const saveSite = async () => {
  if (!currentUser.value) { notify(t.value.connectedError, "error"); return }
  if (isSaving.value) return
  isSaving.value = true
  try {
    const docRef = doc(db, "users", currentUser.value.uid)
    await setDoc(docRef, { siteData: site.value, siteName: siteName.value, siteLogo: siteLogo.value }, { merge: true })
    localStorage.setItem("siteDataPro", JSON.stringify(site.value))
    isSaved.value = true
    notify(t.value.saved)
  } catch (e) {
    console.error("Erreur sauvegarde :", e)
    notify(t.value.saveError, "error")
  } finally { isSaving.value = false }
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
  // Section Paiement masquée : les Pro utilisent Stripe Connect, les Free simulent les ventes
  // { key: "payment",  label: t.value.publish==="نشر"?"دفع":"Paiement", icon: "💳", desc: t.value.sPayment },
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

// Config Paddle
const livePaddleConfig = ref({
  vendorId: "",
  productId: "",
  environment: "sandbox",
  currency: "EUR",
  successCallback: "",
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
      if (d.storePaymentConfig?.paddle) {
        livePaddleConfig.value = { ...livePaddleConfig.value, ...d.storePaymentConfig.paddle }
      }
    }
  } catch(e) { console.warn("Config load error:", e) }
}

const openConfigEditor = (target) => {
  configEditorTarget.value = target
  showConfigEditor.value   = true
}

const saveConfigFile = async () => {
  if (!currentUser.value) { notify("Connectez-vous d'abord.", "error"); return }
  try {
    // Les champs sont déjà liés via v-model sur liveStripeConfig / livePaypalConfig / livePaddleConfig
    // On sauvegarde directement les refs dans Firestore — pas de parsing JSON nécessaire
    const storePaymentConfig = {
      stripe: {
        publishableKey:    liveStripeConfig.value.publishableKey    || "",
        backendUrl:        liveStripeConfig.value.backendUrl        || "",
        currency:          liveStripeConfig.value.currency          || "eur",
        storeName:         liveStripeConfig.value.storeName         || siteName.value,
        mode:              liveStripeConfig.value.mode              || "test",
        successUrl:        liveStripeConfig.value.successUrl        || "",
        cancelUrl:         liveStripeConfig.value.cancelUrl         || "",
        shippingCountries: liveStripeConfig.value.shippingCountries || [],
      },
      paypal: {
        clientId:        livePaypalConfig.value.clientId        || "",
        mode:            livePaypalConfig.value.mode            || "sandbox",
        currency:        livePaypalConfig.value.currency        || "EUR",
        locale:          livePaypalConfig.value.locale          || "fr_FR",
        createOrderUrl:  livePaypalConfig.value.createOrderUrl  || "",
        captureOrderUrl: livePaypalConfig.value.captureOrderUrl || "",
        successUrl:      livePaypalConfig.value.successUrl      || "",
        brandName:       livePaypalConfig.value.brandName       || siteName.value,
      },
      paddle: {
        vendorId:        livePaddleConfig.value.vendorId        || "",
        productId:       livePaddleConfig.value.productId       || "",
        environment:     livePaddleConfig.value.environment     || "sandbox",
        currency:        livePaddleConfig.value.currency        || "EUR",
        successCallback: livePaddleConfig.value.successCallback || "",
      },
    }

    await setDoc(
      doc(db, "users", currentUser.value.uid),
      { storePaymentConfig },
      { merge: true }
    )

    notify("✓ Config paiement sauvegardée dans Firestore")
    showConfigEditor.value = false
  } catch(e) {
    notify("Erreur sauvegarde : " + e.message, "error")
    console.error("saveConfigFile error:", e)
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

const exportSite = () => {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${site.value.pages[0]?.name||'Mon Site'}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;color:#374151;background:#fff}
nav{background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 32px;display:flex;gap:16px;align-items:center;position:sticky;top:0;z-index:10}
nav a{text-decoration:none;color:#6b7280;font-size:14px;font-weight:500;padding:6px 12px;border-radius:6px;transition:.15s;cursor:pointer}
nav a:hover,nav a.active{background:#f3f4f6;color:#111}.brand{font-family:'Playfair Display',serif;font-size:18px;color:#1a1a2e;margin-right:auto}
.page{display:none}.page.active{display:block}
.hero{padding:100px 60px;background:linear-gradient(135deg,#f8f7ff,#ede9fe);text-align:center}
.hero h1{font-family:'Playfair Display',serif;font-size:52px;color:#1a1a2e;line-height:1.15;white-space:pre-line;margin-bottom:16px}
.hero p{font-size:20px;color:#6b7280;margin-bottom:32px}.hero .cta{background:#6c63ff;color:#fff;border:none;border-radius:10px;padding:14px 32px;font-size:16px;font-weight:600;cursor:pointer}
.sec-text{padding:48px 60px}.sec-text p{font-size:17px;line-height:1.8;color:#374151;max-width:720px}
.sec-image{padding:32px 60px}.sec-image img{width:100%;border-radius:12px}
.gallery{padding:40px 60px}.gallery-grid{display:grid;gap:10px}.gallery-grid img{width:100%;border-radius:8px;object-fit:cover;aspect-ratio:1}
.video-wrap{padding:32px 60px}.video-wrap iframe{width:100%;height:400px;border-radius:12px;border:none;display:block}
.products{padding:48px 60px;background:#fafafa}.products-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.product-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.product-card img{width:100%;height:180px;object-fit:cover}.product-img-ph{width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:36px}
.product-body{padding:16px}.product-name{font-weight:600;font-size:15px;color:#111;margin-bottom:6px}.product-desc{font-size:13px;color:#6b7280;line-height:1.5;margin-bottom:12px}
.product-footer{display:flex;align-items:center;justify-content:space-between}.product-price{font-size:18px;font-weight:700;color:#6c63ff}
.product-btn{background:#6c63ff;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer}
.badge{display:inline-block;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 8px;border-radius:100px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
.features{padding:60px;background:#fafafa}.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:840px;margin:0 auto}
.feature-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px 24px;text-align:center}.feature-card .icon{font-size:32px;display:block;margin-bottom:12px}
.feature-card strong{font-size:16px;color:#111;display:block;margin-bottom:6px}.feature-card p{font-size:14px;color:#6b7280;line-height:1.5}
.payment-sec{padding:80px 60px;background:linear-gradient(135deg,#f8f7ff,#ede9fe);text-align:center}
.payment-sec h2{font-family:'Playfair Display',serif;font-size:36px;color:#1a1a2e;margin-bottom:10px}
.payment-sec p{font-size:16px;color:#6b7280;margin-bottom:24px}.payment-amount{font-size:64px;font-weight:700;color:#6c63ff;margin-bottom:36px}
.pay-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.pay-btn{padding:14px 32px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}
.pay-btn.stripe{background:#635bff;color:#fff}.pay-btn.paypal{background:#ffc439;color:#003087}
.form-sec{padding:60px;background:#f8f7ff;display:flex;flex-direction:column;align-items:center}
.form-sec h3{font-family:'Playfair Display',serif;font-size:30px;color:#1a1a2e;margin-bottom:24px}
.form-sec input,.form-sec textarea{width:100%;max-width:500px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;margin-bottom:12px;font-family:'DM Sans',sans-serif;background:#fff}
.form-sec button{background:#6c63ff;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-size:15px;font-weight:600;cursor:pointer}
hr.divider{border:none;border-top:1px solid #e5e7eb;margin:8px 60px}
</body></html>`
  const blob = new Blob([html], { type: "text/html" })
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mon-site.html"; a.click()
  notify(t.value.exportSuccess); showExportModal.value = false
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

  <!-- CART MODAL — Panier + Livraison + Paiement -->
  <Transition name="modal">
    <div v-if="showCart" class="modal-overlay cart-overlay" @click.self="showCart=false; cartStep='cart'" :dir="isRtl?'rtl':'ltr'">
      <div class="modal-box cart-modal">

        <!-- HEADER -->
        <div class="cart-modal-header">
          <button v-if="cartStep==='checkout'" class="cart-back-btn" @click="backToCart">← Retour</button>
          <div class="cart-header-title">
            <span>{{ cartStep==='cart' ? '🛒' : cartStep==='checkout' ? '📋' : '✅' }}</span>
            <div>
              <h2>{{ cartStep==='cart' ? t.cartTitle : cartStep==='checkout' ? 'Livraison & Paiement' : 'Commande confirmée !' }}</h2>
              <p v-if="cartStep==='cart' && cart.length > 0" class="cart-header-sub">{{ cartCount }} article{{ cartCount > 1 ? 's' : '' }}</p>
            </div>
          </div>
          <button class="modal-close" @click="showCart=false; cartStep='cart'">✕</button>
        </div>

        <!-- ÉTAPE 1 : PANIER -->
        <template v-if="cartStep==='cart'">
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
                📋 Livraison & Paiement →
              </button>
            </div>
          </div>
        </template>

        <!-- ÉTAPE 2 : INFOS LIVRAISON + PAIEMENT -->
        <template v-else-if="cartStep==='checkout'">

          <!-- Résumé commande -->
          <div class="checkout-summary">
            <div v-for="item in cart" :key="item.id" class="checkout-item">
              <div class="checkout-item-img">
                <img v-if="item.image" :src="item.image" :alt="item.name"/>
                <span v-else>🛍️</span>
              </div>
              <span class="checkout-item-name">{{ item.name }} ×{{ item.qty }}</span>
              <span class="checkout-item-price">{{ (parseFloat(item.price)*item.qty).toFixed(2) }}{{ item.currency }}</span>
            </div>
            <div class="checkout-total">
              <span>Total</span>
              <strong>{{ cartTotal }}{{ cartCurrency }}</strong>
            </div>
          </div>

          <!-- Infos client -->
          <div class="checkout-fields">
            <div class="checkout-section-title">👤 Informations client</div>
            <div class="checkout-row">
              <div class="checkout-field">
                <label>Nom complet *</label>
                <input v-model="cartCustomerName" placeholder="Jean Dupont" class="checkout-input"/>
              </div>
              <div class="checkout-field">
                <label>Email *</label>
                <input v-model="cartCustomerEmail" placeholder="jean@email.com" type="email" class="checkout-input"/>
              </div>
            </div>

            <div class="checkout-section-title" style="margin-top:14px">📦 Adresse de livraison</div>
            <div class="checkout-field">
              <label>Adresse *</label>
              <input v-model="cartCustomerAddress" placeholder="123 rue de la Paix" class="checkout-input"/>
            </div>
            <div class="checkout-row">
              <div class="checkout-field">
                <label>Code postal</label>
                <input v-model="cartCustomerZip" placeholder="75001" class="checkout-input"/>
              </div>
              <div class="checkout-field">
                <label>Ville</label>
                <input v-model="cartCustomerCity" placeholder="Paris" class="checkout-input"/>
              </div>
            </div>
            <div class="checkout-field">
              <label>Pays</label>
              <select v-model="cartCustomerCountry" class="checkout-input checkout-select">
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

          <p v-if="cartPayError" class="cart-pay-error">⚠ {{ cartPayError }}</p>

          <button
            class="pay-submit stripe-submit cart-pay-final"
            @click="payCart"
            :disabled="paymentProcessing"
          >
            <span v-if="paymentProcessing" class="spinner"/>
            <span v-else>💳</span>
            {{ paymentProcessing ? "Redirection Stripe..." : `Payer ${cartTotal}${cartCurrency}` }}
          </button>

          <p class="cart-secure-note">🔒 Paiement sécurisé via Stripe</p>
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

  <!-- CONFIG PAIEMENT MODAL — Stripe / PayPal / Paddle -->
  <Transition name="modal">
    <div v-if="showConfigEditor" class="modal-overlay" @click.self="showConfigEditor=false">
      <div class="modal-box config-modal pay-config-modal">
        <button class="modal-close" @click="showConfigEditor=false">✕</button>

        <div class="modal-header">
          <span class="modal-icon">⚙️</span>
          <h2>Configuration Paiement</h2>
          <p class="modal-desc">Configurez vos prestataires de paiement. Sauvegardé dans Firestore.</p>
        </div>

        <!-- Onglets prestataires -->
        <div class="pay-tabs">
          <button :class="['pay-tab-btn', { active: configEditorTarget==='stripe' }]"  @click="configEditorTarget='stripe'">💳 Stripe</button>
          <button :class="['pay-tab-btn', { active: configEditorTarget==='paypal' }]"  @click="configEditorTarget='paypal'">🅿 PayPal</button>
          <button :class="['pay-tab-btn', { active: configEditorTarget==='paddle' }]"  @click="configEditorTarget='paddle'">🏓 Paddle</button>
        </div>

        <!-- ── STRIPE ────────────────────────────────────── -->
        <div v-if="configEditorTarget==='stripe'" class="pay-form-fields">
          <div class="pcf-section-title">🔑 Clés API Stripe</div>
          <div class="pcf-field">
            <label>Publishable Key <span class="pcf-required">*</span></label>
            <input v-model="liveStripeConfig.publishableKey" placeholder="pk_test_..." class="pcf-input" spellcheck="false"/>
            <span class="pcf-hint">Clé publique depuis stripe.com → Developers → API Keys</span>
          </div>
          <div class="pcf-field">
            <label>Backend URL <span class="pcf-required">*</span></label>
            <input v-model="liveStripeConfig.backendUrl" placeholder="https://votre-backend.com/create-stripe-session" class="pcf-input" spellcheck="false"/>
            <span class="pcf-hint">Endpoint de votre serveur qui crée la session Stripe</span>
          </div>
          <div class="pcf-row">
            <div class="pcf-field">
              <label>Devise</label>
              <select v-model="liveStripeConfig.currency" class="pcf-input pcf-select">
                <option value="eur">EUR €</option>
                <option value="usd">USD $</option>
                <option value="gbp">GBP £</option>
                <option value="mad">MAD</option>
                <option value="cad">CAD</option>
              </select>
            </div>
            <div class="pcf-field">
              <label>Mode</label>
              <select v-model="liveStripeConfig.mode" class="pcf-input pcf-select">
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </div>
          </div>
          <div class="pcf-field">
            <label>Nom du store</label>
            <input v-model="liveStripeConfig.storeName" :placeholder="siteName" class="pcf-input"/>
          </div>
          <div class="pcf-section-title" style="margin-top:14px">📦 Livraison (affiché au client)</div>
          <div class="pcf-field">
            <label>Pays de livraison disponibles</label>
            <div class="pcf-checkbox-group">
              <label v-for="pays in ['FR','MA','BE','CH','CA','DZ','TN','SN','CI']" :key="pays" class="pcf-checkbox">
                <input type="checkbox" :value="pays" v-model="liveStripeConfig.shippingCountries"/> {{ pays }}
              </label>
            </div>
            <span class="pcf-hint">Les clients pourront saisir leur adresse lors du paiement</span>
          </div>
          <div class="pcf-section-title" style="margin-top:14px">🔗 URLs de retour (auto-générées)</div>
          <div class="pcf-field">
            <label>URL Succès</label>
            <input v-model="liveStripeConfig.successUrl" placeholder="Auto (recommandé : laisser vide)" class="pcf-input pcf-url" spellcheck="false"/>
          </div>
          <div class="pcf-field">
            <label>URL Annulation</label>
            <input v-model="liveStripeConfig.cancelUrl" placeholder="Auto (recommandé : laisser vide)" class="pcf-input pcf-url" spellcheck="false"/>
          </div>
        </div>

        <!-- ── PAYPAL ─────────────────────────────────────── -->
        <div v-else-if="configEditorTarget==='paypal'" class="pay-form-fields">
          <div class="pcf-section-title">🔑 Clés API PayPal</div>
          <div class="pcf-field">
            <label>Client ID <span class="pcf-required">*</span></label>
            <input v-model="livePaypalConfig.clientId" placeholder="AXxxxxxxxxxxxxxxx..." class="pcf-input" spellcheck="false"/>
            <span class="pcf-hint">Depuis developer.paypal.com → Apps & Credentials</span>
          </div>
          <div class="pcf-row">
            <div class="pcf-field">
              <label>Mode</label>
              <select v-model="livePaypalConfig.mode" class="pcf-input pcf-select">
                <option value="sandbox">Sandbox (test)</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div class="pcf-field">
              <label>Devise</label>
              <select v-model="livePaypalConfig.currency" class="pcf-input pcf-select">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>
          <div class="pcf-field">
            <label>Nom de la marque</label>
            <input v-model="livePaypalConfig.brandName" :placeholder="siteName" class="pcf-input"/>
          </div>
          <div class="pcf-section-title" style="margin-top:14px">🔗 Endpoints backend</div>
          <div class="pcf-field">
            <label>Create Order URL</label>
            <input v-model="livePaypalConfig.createOrderUrl" placeholder="https://votre-backend.com/paypal/create-order" class="pcf-input pcf-url" spellcheck="false"/>
          </div>
          <div class="pcf-field">
            <label>Capture Order URL</label>
            <input v-model="livePaypalConfig.captureOrderUrl" placeholder="https://votre-backend.com/paypal/capture-order" class="pcf-input pcf-url" spellcheck="false"/>
          </div>
          <div class="pcf-field">
            <label>URL Succès</label>
            <input v-model="livePaypalConfig.successUrl" placeholder="Auto (laisser vide)" class="pcf-input pcf-url" spellcheck="false"/>
          </div>
        </div>

        <!-- ── PADDLE ─────────────────────────────────────── -->
        <div v-else-if="configEditorTarget==='paddle'" class="pay-form-fields">
          <div class="pcf-section-title">🏓 Configuration Paddle</div>
          <div class="pcf-info-box">
            Paddle est un Merchant of Record — il gère la TVA et la compliance automatiquement.
            Créez votre compte sur <a href="https://paddle.com" target="_blank" class="pcf-link">paddle.com</a>
          </div>
          <div class="pcf-field">
            <label>Vendor ID <span class="pcf-required">*</span></label>
            <input v-model="livePaddleConfig.vendorId" placeholder="123456" class="pcf-input"/>
            <span class="pcf-hint">Depuis Paddle Dashboard → Developer Tools → Authentication</span>
          </div>
          <div class="pcf-field">
            <label>Product / Price ID <span class="pcf-required">*</span></label>
            <input v-model="livePaddleConfig.productId" placeholder="pri_xxxxxxxx" class="pcf-input"/>
            <span class="pcf-hint">ID du produit ou du prix dans Paddle Catalog</span>
          </div>
          <div class="pcf-row">
            <div class="pcf-field">
              <label>Environnement</label>
              <select v-model="livePaddleConfig.environment" class="pcf-input pcf-select">
                <option value="sandbox">Sandbox (test)</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div class="pcf-field">
              <label>Devise</label>
              <select v-model="livePaddleConfig.currency" class="pcf-input pcf-select">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div class="pcf-field">
            <label>Success Callback URL</label>
            <input v-model="livePaddleConfig.successCallback" placeholder="https://votre-site.com/merci" class="pcf-input pcf-url" spellcheck="false"/>
          </div>
        </div>

        <!-- Actions -->
        <div class="config-modal-actions">
          <button class="btn-action" @click="showConfigEditor=false">Annuler</button>
          <button class="btn-action primary" @click="saveConfigFile">
            💾 Sauvegarder dans Firestore
          </button>
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
              <span class="pub-url-prefix">SaasBuilder/#/site/</span>
              <input v-model="publishAddress" class="pub-input" :placeholder="t.siteAddressPlaceholder"/>
            </div>
            <div v-if="publishAddress" class="pub-preview-url">
              🔗 musrh.github.io/SaasBuilder/#/site/{{ publishAddress.toLowerCase().replace(/[^a-z0-9-]/g,'-') }}
            </div>
            <div v-if="currentUser && publishAddress" class="pub-preview-url" style="color:var(--text3);font-size:11px;margin-top:4px">
              🆔 uid: musrh.github.io/SaasBuilder/#/site/{{ currentUser.uid }}
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
            <strong>{{ t.htmlStatic }}</strong>
            <p>{{ t.htmlDesc }}</p>
            <span class="export-badge">{{ t.recommended }}</span>
          </div>
          <div class="export-card" @click="exportSite">
            <span class="export-icon">📦</span>
            <strong>{{ t.download }}</strong>
            <p>{{ t.dlDesc }}</p>
          </div>
        </div>
        <div class="export-note"><strong>Note :</strong> {{ t.exportNote }}</div>
      </div>
    </div>
  </Transition>

  <!-- PUBLIC PREVIEW (plein écran, sans barre d'outils) -->
  <Transition name="modal">
    <div v-if="showPublicPreview" class="public-preview-overlay" :dir="isRtl?'rtl':'ltr'">

      <!-- Bandeau "Aperçu" discret en haut -->
      <div class="pv-topband">
        <span class="pv-topband-label">👁 Mode aperçu</span>
        <button class="pv-topband-close" @click="showPublicPreview=false">✕ Fermer</button>
      </div>

      <!-- ── NAVIGATION DU STORE ───────────────────────── -->
      <nav class="pv-nav">

        <!-- Logo + Nom du site -->
        <div class="pv-brand">
          <img v-if="siteLogo" :src="siteLogo" class="pv-logo" alt="logo"/>
          <span v-else class="pv-logo-placeholder">◈</span>
          <span class="pv-site-name">{{ siteName }}</span>
        </div>

        <!-- Menu pages (visible et clair) -->
        <div class="pv-menu">
          <button
            v-for="(p,i) in site.pages"
            :key="p.id"
            class="pv-menu-item"
            :class="{ active: currentPageIndex===i }"
            @click="currentPageIndex=i"
          >{{ p.name }}</button>
        </div>

        <!-- Droite : Sélecteur de langue + Panier -->
        <div class="pv-nav-right">
          <!-- Sélecteur de langue -->
          <select class="pv-lang-select" v-model="currentLang">
            <option v-for="l in langs" :key="l.code" :value="l.code">{{ l.label }}</option>
          </select>

          <!-- Connexion / Déconnexion dans l'aperçu -->
          <div v-if="currentUser" class="pv-user-btn" @click="showUserProfile=true; showPublicPreview=false" title="Mon profil">
            <div class="pv-user-avatar">
              <img v-if="currentUser.photoURL" :src="currentUser.photoURL" class="pv-user-avatar-img"/>
              <span v-else>{{ (currentUser.email||"?")[0].toUpperCase() }}</span>
            </div>
            <span class="pv-user-name">{{ currentUser.displayName || currentUser.email?.split("@")[0] }}</span>
          </div>
          <button v-else class="pv-login-btn" @click="showPublicPreview=false; signedOut=true; soMode='login'">
            🔑 Se connecter
          </button>

          <!-- Panier — toujours visible (même vide) -->
          <button class="pv-cart-btn" @click="showCart=true; cartStep='cart'">
            <span class="pv-cart-icon">🛒</span>
            <span v-if="cartCount > 0" class="pv-cart-badge">{{ cartCount }}</span>
            <span class="pv-cart-label">{{ t.cartTitle }}</span>
          </button>
        </div>

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
            <input v-model="contactForm.name"    :placeholder="t.prevNamePh"  class="prev-form-field"/>
            <input v-model="contactForm.email"   :placeholder="t.prevEmailPh" class="prev-form-field" type="email"/>
            <textarea v-model="contactForm.message" :placeholder="t.prevMsgPh" class="prev-form-field prev-form-ta"></textarea>
            <p v-if="contactError" class="prev-form-error">{{ contactError }}</p>
            <div v-if="contactSent" class="prev-form-success">✓ Message envoyé !</div>
            <button class="prev-form-btn" @click="sendContact(s.style)" :disabled="contactSending">
              <span v-if="contactSending">Envoi...</span>
              <span v-else>{{ t.prevSendBtn }}</span>
            </button>
          </div>
          <div v-else-if="s.type==='divider'" class="prev-divider" :style="s.style"><hr class="prev-divider-line"/></div>
        </div>
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
      <span class="brand-badge">Pro</span>
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
      <!-- Bouton sidebar mobile (uniquement si connecté) -->
      <button v-if="currentUser" class="sidebar-toggle-btn" @click="showMobileSidebar=!showMobileSidebar">
        {{ showMobileSidebar ? '✕' : '☰' }}
      </button>
      <button v-if="currentUser && cartCount>0" class="btn-action cart-btn" @click="showCart=true">
        🛒 <span class="cart-badge">{{ cartCount }}</span>
      </button>

      <!-- ① UTILISATEUR CONNECTÉ -->
      <div v-if="currentUser" class="topbar-user" @click="showUserProfile=!showUserProfile">
        <div class="topbar-user-avatar" title="Mon profil">
          <img v-if="currentUser.photoURL" :src="currentUser.photoURL" class="topbar-avatar-img" alt="avatar"/>
          <span v-else class="topbar-avatar-initials">
            {{ (currentUser.displayName || currentUser.email || "?")[0].toUpperCase() }}
          </span>
        </div>
        <div class="topbar-user-info">
          <span class="topbar-user-name">{{ currentUser.displayName || currentUser.email?.split("@")[0] }}</span>
          <span class="topbar-user-email">{{ currentUser.email }}</span>
        </div>
      </div>

      <!-- ② BOUTON CONNEXION si non connecté (minimal) -->
      <button v-if="!currentUser" class="btn-action topbar-login-btn" @click="signedOut=true; soMode='login'">
        🔑 Se connecter
      </button>

      <!-- ③ Le reste — visible SEULEMENT si connecté -->
      <template v-if="currentUser">
        <select class="lang-select" v-model="currentLang">
          <option v-for="l in langs" :key="l.code" :value="l.code">{{ l.label }}</option>
        </select>
        <template v-if="isOwner">
          <button class="btn-action icon-btn" @click="openConfigEditor('stripe')" :title="t.configureStripe">💳</button>
          <button class="btn-action icon-btn" @click="openConfigEditor('paypal')" :title="t.configurePaypal">🅿</button>
          <button class="btn-action icon-btn" @click="showExportModal=true" :title="t.export">⬇</button>
          <button class="btn-action icon-btn tb-btn-theme" @click="showThemeImport=true" title="Importer un thème">🎨</button>
          <button class="btn-action icon-btn tb-btn-export" @click="exportTheme" title="Exporter le thème">📤</button>
          <div class="pub-btn-group">
            <button class="btn-action publish-btn" @click="showPublishModal=true">🌐 {{ t.publish }}</button>
            <button class="btn-action preview-pub-btn" @click="showPublicPreview=true" title="Aperçu public">👁</button>
          </div>
        </template>
        <span class="save-status" :class="{saved:isSaved}">{{ isSaved ? t.saved : t.unsaved }}</span>
        <button class="btn-action" @click="saveSite" :disabled="isSaving" :class="{saving:isSaving}">
          <span v-if="isSaving" class="spinner"/>
          <span>{{ isSaving ? t.saving : t.save }}</span>
        </button>
        <button class="btn-action primary" @click="mode=mode==='preview'?'edit':'preview'">
          {{ mode==='preview' ? t.edit : t.preview }}
        </button>
      </template>
    </div>
  </header>

  <!-- WORKSPACE -->
  <div class="workspace">

    <!-- SIDEBAR -->
    <aside v-if="mode==='edit'" class="sidebar" :class="{'sidebar-open': showMobileSidebar}" :dir="isRtl?'rtl':'ltr'" @click.self="showMobileSidebar=false">
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
      <div v-if="sidebarTab==='style'" class="sidebar-content">
        <p class="sidebar-label">{{ t.pageStyle }}</p>
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
                  <!-- Image produit : Upload OU Caméra -->
                  <div class="product-img-area">
                    <label class="product-img-upload" title="Choisir une image">
                      <input type="file" accept="image/*" @change="uploadProductImage($event,p)" hidden/>
                      <img v-if="p.image" :src="p.image" class="product-img"/>
                      <div v-else class="product-img-ph">🛍️<span>Photo</span></div>
                    </label>
                    <div class="product-img-actions">
                      <label class="product-img-btn upload-btn" title="Importer fichier">
                        <input type="file" accept="image/*" @change="uploadProductImage($event,p)" hidden/>
                        📁
                      </label>
                      <label class="product-img-btn camera-btn" title="Prendre une photo">
                        <input type="file" accept="image/*" capture="environment" @change="uploadProductImage($event,p)" hidden/>
                        📷
                      </label>
                      <button v-if="p.image" class="product-img-btn remove-btn" @click.stop="p.image=''" title="Supprimer">
                        🗑
                      </button>
                    </div>
                  </div>
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
                <input v-model="contactForm.name"    :placeholder="t.prevNamePh"  class="prev-form-field"/>
                <input v-model="contactForm.email"   :placeholder="t.prevEmailPh" class="prev-form-field" type="email"/>
                <textarea v-model="contactForm.message" :placeholder="t.prevMsgPh" class="prev-form-field prev-form-ta"></textarea>
                <p v-if="contactError" class="prev-form-error">{{ contactError }}</p>
                <div v-if="contactSent" class="prev-form-success">✓ Message envoyé !</div>
                <button class="prev-form-btn" @click="sendContact(s.style)" :disabled="contactSending">
                  <span v-if="contactSending">Envoi...</span>
                  <span v-else>{{ t.prevSendBtn }}</span>
                </button>
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
  <!-- ASSISTANT VOCAL CLIENT (Groq IA) -->
  <!-- storeUid = uid du propriétaire du store (pas forcément le user connecté) -->
  <VoiceAssistantClient
    v-if="currentUser"
    :store-uid="publishInfo?.uid || currentUser?.uid || ''"
    :store-name="siteName"
    :store-email="currentUser?.email || ''"
    :lang="currentLang"
    :backend-url="'https://backend-master-production-cf50.up.railway.app'"
  />

  <!-- ── PROFIL UTILISATEUR (popup) ─────────────────────── -->
  <Transition name="modal">
    <div v-if="showUserProfile && currentUser" class="modal-overlay user-profile-overlay" @click.self="showUserProfile=false">
      <div class="modal-box user-profile-modal">
        <button class="modal-close" @click="showUserProfile=false">✕</button>

        <!-- Avatar + infos -->
        <div class="up-avatar-section">
          <div class="up-avatar-big">
            <img v-if="currentUser.photoURL" :src="currentUser.photoURL" class="up-avatar-img" alt="avatar"/>
            <span v-else class="up-avatar-initials">
              {{ (currentUser.displayName || currentUser.email || "?")[0].toUpperCase() }}
            </span>
          </div>
          <div class="up-user-details">
            <div class="up-user-name">{{ currentUser.displayName || "Utilisateur" }}</div>
            <div class="up-user-email">{{ currentUser.email }}</div>
            <div class="up-user-badge">
              <span v-if="isOwner"  class="up-badge-pro">✦ Propriétaire du store</span>
              <span v-else class="up-badge-customer">🛍 Client du store</span>
            </div>
          </div>
        </div>

        <!-- Infos propriétaire -->
        <div v-if="isOwner" class="up-info-grid">
          <div class="up-info-item">
            <span class="up-info-label">UID Firebase</span>
            <code class="up-info-value">{{ currentUser.uid?.slice(0,16) }}...</code>
          </div>
          <div class="up-info-item">
            <span class="up-info-label">Email vérifié</span>
            <span class="up-info-value" :class="currentUser.emailVerified ? 'up-verified' : 'up-unverified'">
              {{ currentUser.emailVerified ? "✓ Oui" : "✗ Non" }}
            </span>
          </div>
          <div class="up-info-item">
            <span class="up-info-label">Site publié</span>
            <span class="up-info-value">{{ publishAddress || "Non publié" }}</span>
          </div>
          <div class="up-info-item">
            <span class="up-info-label">Plan</span>
            <span class="up-info-value up-badge-pro">Pro</span>
          </div>
        </div>

        <!-- Commandes du client -->
        <div v-if="isClient" class="up-orders-section">
          <div class="up-orders-title">
            📦 Mes commandes
            <span v-if="loadingOrders" class="up-orders-loading">...</span>
            <span v-else class="up-orders-count">{{ userOrders.length }}</span>
          </div>
          <div v-if="!userOrders.length && !loadingOrders" class="up-orders-empty">Aucune commande.</div>
          <div v-else class="up-orders-list">
            <div v-for="order in userOrders.slice(0,5)" :key="order.id" class="up-order-item">
              <div class="up-order-left">
                <span class="up-order-id">#{{ order.id?.slice(0,8).toUpperCase() }}</span>
                <span class="up-order-date">{{ (order.createdAt||'').slice(0,10) }}</span>
              </div>
              <div class="up-order-right">
                <span class="up-order-total">{{ order.total }}{{ order.currency }}</span>
                <span class="up-order-status" :class="'status-'+order.status">
                  {{ {paid:'Payée',pending:'En attente',shipped:'Expédiée',delivered:'Livrée',cancelled:'Annulée'}[order.status]||order.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="up-actions">
          <button class="up-btn-signout" @click="handleSignOut">
            ⏻ Se déconnecter
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ── ÉCRAN DÉCONNEXION + RECONNEXION ─────────────────── -->
  <Transition name="modal">
    <div v-if="signedOut" class="signout-overlay">
      <div class="signout-card">
        <!-- Message déconnexion -->
        <div class="signout-icon">👋</div>
        <h2 class="signout-title">Vous êtes déconnecté</h2>
        <p class="signout-sub">Reconnectez-vous pour accéder à votre store.</p>

        <!-- Onglets Connexion / Inscription -->
        <div class="so-tabs">
          <button :class="['so-tab', { active: soMode==='login' }]"    @click="soMode='login';    soError=''; soSuccess=''">Connexion</button>
          <button :class="['so-tab', { active: soMode==='register' }]" @click="soMode='register'; soError=''; soSuccess=''">Inscription</button>
        </div>

        <!-- Messages -->
        <p v-if="soError"   class="so-error">⚠ {{ soError }}</p>
        <p v-if="soSuccess" class="so-success">✓ {{ soSuccess }}</p>

        <!-- ── CONNEXION ──────────────────── -->
        <div v-if="soMode==='login'" class="so-form">
          <div class="so-field">
            <label>Email</label>
            <input v-model="soEmail" type="email" placeholder="votre@email.com"
                   class="so-input" @keydown.enter="soLogin"/>
          </div>
          <div class="so-field">
            <label>Mot de passe</label>
            <input v-model="soPassword" type="password" placeholder="••••••••"
                   class="so-input" @keydown.enter="soLogin"/>
          </div>
          <button class="so-forgot-btn" @click="soMode='forgot'; soError=''; soSuccess=''">
            Mot de passe oublié ?
          </button>
          <button class="so-submit" @click="soLogin" :disabled="soLoading">
            <span v-if="soLoading" class="so-spinner"></span>
            <span v-else>🔑 Se connecter</span>
          </button>
          <div class="so-separator"><span>ou</span></div>
          <button class="so-google" @click="soGoogleLogin" :disabled="soLoading">
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continuer avec Google
          </button>
        </div>

        <!-- ── INSCRIPTION ────────────────── -->
        <div v-else-if="soMode==='register'" class="so-form">
          <div class="so-field">
            <label>Nom complet *</label>
            <input v-model="soDisplayName" type="text" placeholder="Jean Dupont"
                   class="so-input"/>
          </div>
          <div class="so-field">
            <label>Email *</label>
            <input v-model="soEmail" type="email" placeholder="votre@email.com"
                   class="so-input"/>
          </div>
          <div class="so-field">
            <label>Mot de passe * <span class="so-hint">(min. 6 caractères)</span></label>
            <input v-model="soPassword" type="password" placeholder="••••••••"
                   class="so-input"/>
          </div>
          <div class="so-field">
            <label>Confirmer le mot de passe *</label>
            <input v-model="soConfirm" type="password" placeholder="••••••••"
                   class="so-input" @keydown.enter="soRegister"/>
          </div>
          <button class="so-submit" @click="soRegister" :disabled="soLoading">
            <span v-if="soLoading" class="so-spinner"></span>
            <span v-else>✨ Créer mon compte</span>
          </button>
          <div class="so-separator"><span>ou</span></div>
          <button class="so-google" @click="soGoogleLogin" :disabled="soLoading">
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            S'inscrire avec Google
          </button>
        </div>

        <!-- ── MOT DE PASSE OUBLIÉ ─────────── -->
        <div v-else-if="soMode==='forgot'" class="so-form">
          <p class="so-forgot-desc">Entrez votre email pour recevoir un lien de réinitialisation.</p>
          <div class="so-field">
            <label>Email</label>
            <input v-model="soEmail" type="email" placeholder="votre@email.com"
                   class="so-input" @keydown.enter="soForgot"/>
          </div>
          <button class="so-submit" @click="soForgot" :disabled="soLoading">
            <span v-if="soLoading" class="so-spinner"></span>
            <span v-else>📧 Envoyer le lien</span>
          </button>
          <button class="so-back-link" @click="soMode='login'; soError=''; soSuccess=''">
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- ── MODAL IMPORT THÈME ─────────────────────────────────── -->
  <div v-if="showThemeImport" class="modal-overlay" @click.self="showThemeImport=false;themeImportError=''">
    <div class="modal-box theme-import-box">
      <button class="modal-close" @click="showThemeImport=false;themeImportError=''">✕</button>
      <h3 class="theme-import-title">🎨 Importer un thème</h3>
      <p class="theme-import-sub">Importez un fichier JSON exporté depuis SaasBuilder</p>

      <!-- Portée de l'import -->
      <div class="theme-scope-tabs">
        <button
          :class="['theme-scope-btn', themeScope==='site' && 'active']"
          @click="themeScope='site'">
          🌐 Tout le site
        </button>
        <button
          :class="['theme-scope-btn', themeScope==='page' && 'active']"
          @click="themeScope='page'">
          📄 Page courante
        </button>
      </div>

      <div class="theme-scope-info">
        <span v-if="themeScope==='site'">⚠ Remplace toutes les pages et sections du site actuel</span>
        <span v-else>Importe les sections dans la page « {{ currentPage?.name || "courante" }} » uniquement</span>
      </div>

      <!-- Zone drop/select fichier -->
      <label class="theme-drop-zone" for="theme-file-input">
        <span class="theme-drop-icon">📁</span>
        <span>Cliquez ou déposez un fichier <strong>.json</strong></span>
        <input
          id="theme-file-input"
          type="file"
          accept=".json,application/json"
          style="display:none"
          @change="importTheme"
        />
      </label>

      <div v-if="themeImportError" class="theme-import-error">
        ⚠ {{ themeImportError }}
      </div>

      <div class="theme-import-footer">
        <small>Format attendu : fichier JSON exporté via le bouton 📤 de SaasBuilder</small>
      </div>
    </div>
  </div>

</div>
</template>

<style scoped>
/* ── Theme Import ─────────────────────────────── */
.tb-btn-theme { background: linear-gradient(135deg, #a78bfa, #6c63ff); color: #fff; }
.tb-btn-theme:hover { background: linear-gradient(135deg, #6c63ff, #4f46e5); }
.tb-btn-export-theme { background: linear-gradient(135deg, #34d399, #059669); color: #fff; }
.tb-btn-export-theme:hover { background: linear-gradient(135deg, #059669, #047857); }
.theme-import-box { max-width: 460px; width: 90%; padding: 28px 24px; border-radius: 16px; }
.theme-import-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.theme-import-sub { font-size: 13px; opacity: .7; margin-bottom: 16px; }
.theme-scope-tabs { display: flex; gap: 8px; margin-bottom: 10px; }
.theme-scope-btn { flex: 1; padding: 8px 0; border-radius: 8px; border: 2px solid var(--border, #e5e7eb); background: transparent; font-size: 13px; font-weight: 600; cursor: pointer; transition: .2s; }
.theme-scope-btn.active { border-color: #6c63ff; background: #6c63ff; color: #fff; }
.theme-scope-info { font-size: 12px; opacity: .7; margin-bottom: 14px; padding: 8px 12px; background: rgba(108,99,255,.07); border-radius: 8px; border-left: 3px solid #6c63ff; }
.theme-drop-zone { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 20px; border: 2px dashed var(--border, #e5e7eb); border-radius: 12px; cursor: pointer; transition: .2s; text-align: center; margin-bottom: 14px; }
.theme-drop-zone:hover { border-color: #6c63ff; background: rgba(108,99,255,.05); color: #6c63ff; }
.theme-drop-icon { font-size: 32px; }
.theme-import-error { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin-bottom: 12px; }
.theme-import-footer { font-size: 11px; opacity: .6; text-align: center; }
</style>
