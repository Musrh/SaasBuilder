<script setup>
import { ref, computed, onMounted, watch } from "vue"
import VoiceAssistantClient from "../components/VoiceAssistantClient.vue"
import { db, auth } from "../firebase.js"
import { doc, getDoc, setDoc, addDoc, deleteDoc, collection } from "firebase/firestore"
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { stripeConfig, loadStripeSDK } from "./stripe.js"
import { paypalConfig, loadPaypalSDK } from "./paypal.js"

const site = ref({
  pages: [{
    id: 1, name: "Accueil", style: {},
    sections: [
      { id: 1, type: "hero", content: "", subtitle: "", cta: "", style: {} },
      { id: 2, type: "text", content: "Bienvenue sur notre plateforme.", style: {} }
    ]
  }]
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
const showExportModal = ref(false)

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
        successUrl:       `https://musrh.github.io/SaaasGenerator/`,
        cancelUrl:        `https://musrh.github.io/SaaasGenerator/`,
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

  // URL principale : /site/{uid} — route Vue Router dans SaaasGenerator
  // URL slug (alias convivial) : /site/{slug} → résolu via collection slugs
  const urlUid  = `https://musrh.github.io/SaaasGenerator/#/site/${uid}`
  const urlSlug = `https://musrh.github.io/SaaasGenerator/#/site/${slug}`

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
    //    Cela permet à SaaasGenerator de résoudre /#/nomchoisi → uid → siteData
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
    txt += `- SaaasGenerator résout /#/${slug} en chargeant slugs/${slug} → siteData\n`
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
        if (d.siteData)   site.value     = d.siteData
        if (d.siteName)   siteName.value = d.siteName
        if (d.siteLogo)   siteLogo.value = d.siteLogo
        // ── Recharger le slug publié ──────────────────────
        if (d.publishedSlug) {
          publishAddress.value = d.publishedSlug
          publishStatus.value  = "published"
          const base = "https://musrh.github.io/SaaasGenerator"
          publishInfo.value = {
            slug:    d.publishedSlug,
            uid:     user.uid,
            urlSlug: `${base}/#/site/${d.publishedSlug}`,
            urlUid:  `${base}/#/site/${user.uid}`,
            domain:  d.customDomain || null,
          }
        }
        if (!d.siteData) {
          const saved = localStorage.getItem("siteDataPro")
          if (saved) site.value = JSON.parse(saved)
        }
      } else {
        const saved = localStorage.getItem("siteDataPro")
        if (saved) site.value = JSON.parse(saved)
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
  { key: "payment",  label: t.value.publish==="نشر"?"دفع":"Paiement", icon: "💳", desc: t.value.sPayment },
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
// ✅ backendUrl pré-rempli automatiquement — le propriétaire n'a pas à le saisir
const STORE_BACKEND_URL = "https://backendfinal-production-afd2.up.railway.app/create-store-session"

const liveStripeConfig = ref({
  publishableKey: "",
  backendUrl: STORE_BACKEND_URL,   // ← pré-rempli
  currency: "eur",
  storeName: "",
  successUrl: "",
  cancelUrl: "",
  mode: "live",
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
        // ✅ Toujours forcer le bon backendUrl même si l'ancien était vide
        liveStripeConfig.value.backendUrl = STORE_BACKEND_URL
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
        backendUrl:        liveStripeConfig.value.backendUrl        || STORE_BACKEND_URL,  // ← toujours rempli
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
              <span class="pub-url-prefix">SaaasGenerator/#/site/</span>
              <input v-model="publishAddress" class="pub-input" :placeholder="t.siteAddressPlaceholder"/>
            </div>
            <div v-if="publishAddress" class="pub-preview-url">
              🔗 musrh.github.io/SaaasGenerator/#/site/{{ publishAddress.toLowerCase().replace(/[^a-z0-9-]/g,'-') }}
            </div>
            <div v-if="currentUser && publishAddress" class="pub-preview-url" style="color:var(--text3);font-size:11px;margin-top:4px">
              🆔 uid: musrh.github.io/SaaasGenerator/#/site/{{ currentUser.uid }}
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
.topbar{position:fixed;top:0;left:0;right:0;z-index:100;height:var(--topbar-h);background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0;padding:0 16px}
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
.prev-products{padding:40px 32px;background:#fafafa}
.prev-products-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.prev-product-card{background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:transform .2s;display:flex;flex-direction:column}
.prev-product-card:hover{transform:translateY(-4px)}
.prev-product-img-wrap{position:relative}
.prev-product-img{width:100%;height:180px;object-fit:cover;display:block}
.prev-product-img-ph{width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:40px}
.prev-product-badge{position:absolute;top:10px;left:10px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px}
.prev-product-body{padding:16px;display:flex;flex-direction:column;flex:1}
.prev-product-name{font-size:15px;font-weight:700;color:#111;margin-bottom:6px;line-height:1.3}
.prev-product-desc{font-size:13px;color:#6b7280;line-height:1.5;margin-bottom:12px;flex:1}
.prev-product-footer{display:flex;flex-direction:column;gap:10px;margin-top:auto}
.prev-product-price{font-size:20px;font-weight:800;color:#6c63ff}
.prev-product-btn{background:#6c63ff;color:white;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;width:100%;text-align:center;transition:all .15s}
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
.public-preview-overlay{position:fixed;inset:0;z-index:9000;background:#fff;display:flex;flex-direction:column;overflow:hidden;font-family:'DM Sans',sans-serif}
.pv-topband{background:#1a1a2e;color:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:space-between;padding:6px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0}
.pv-topband-label{display:flex;align-items:center;gap:6px}
.pv-topband-close{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:white;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;font-family:'DM Sans',sans-serif;transition:all .15s}
.pv-topband-close:hover{background:rgba(255,255,255,.22)}
.pv-nav{display:flex;align-items:center;padding:0 32px;height:60px;background:#fff;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 8px rgba(0,0,0,.06);flex-shrink:0;position:relative;z-index:10}
.pv-brand{display:flex;align-items:center;gap:10px;flex-shrink:0;margin-right:32px}
.pv-logo{height:36px;width:auto;border-radius:6px;object-fit:contain}
.pv-logo-placeholder{width:36px;height:36px;background:linear-gradient(135deg,#6c63ff,#a78bfa);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px}
.pv-site-name{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:#1a1a2e;white-space:nowrap}
.pv-menu{display:flex;align-items:center;gap:4px;flex:1}
.pv-menu-item{background:none;border:none;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;color:#374151;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
.pv-menu-item:hover{background:#f3f4f6;color:#1a1a2e}
.pv-menu-item.active{background:#ede9fe;color:#6c63ff;font-weight:600}
.pv-nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:auto}
.pv-lang-select{background:#f3f4f6;border:1px solid #e5e7eb;color:#374151;padding:7px 12px;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;outline:none;transition:border-color .15s}
.pv-lang-select:focus{border-color:#6c63ff}
.pv-cart-btn{display:flex;align-items:center;gap:7px;background:#6c63ff;color:white;border:none;padding:9px 18px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;position:relative;white-space:nowrap}
.pv-cart-btn:hover{background:#5b52ee;transform:translateY(-1px);box-shadow:0 4px 14px rgba(108,99,255,.35)}
.pv-cart-icon{font-size:16px;line-height:1}
.pv-cart-badge{position:absolute;top:-7px;right:-7px;background:#ef4444;color:white;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white}
.pv-cart-label{font-size:13px}
.pub-preview-content{flex:1;overflow-y:auto;background:#fff}
@media(max-width:640px){.pv-nav{padding:0 14px}.pv-brand{margin-right:12px}.pv-site-name{font-size:15px}.pv-menu-item{padding:7px 10px;font-size:13px}.pv-cart-label{display:none}.pv-lang-select{padding:7px 8px;font-size:12px}}
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
.cart-overlay{z-index:9500 !important}
.cart-overlay .cart-modal{max-width:560px;padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:90vh}
.cart-modal-header{display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);background:var(--surface2);flex-shrink:0}
.cart-back-btn{background:none;border:1px solid var(--border2);color:var(--text2);padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-family:'DM Sans',sans-serif;white-space:nowrap}
.cart-back-btn:hover{background:var(--border2)}
.cart-header-title{display:flex;align-items:center;gap:8px;flex:1}
.cart-header-title span{font-size:22px}
.cart-header-title h2{font-family:'Playfair Display',serif;font-size:18px;color:var(--text);margin:0}
.cart-header-sub{font-size:11px;color:var(--text3);margin-top:2px}
.cart-modal .cart-empty,.cart-modal .cart-items,.cart-modal .cart-footer{padding:16px 20px}
.cart-modal .cart-items{overflow-y:auto;flex:1}
.cart-modal .cart-footer{border-top:1px solid var(--border);flex-shrink:0}
/* CHECKOUT STEP */
.checkout-summary{padding:12px 20px;background:var(--surface2);border-bottom:1px solid var(--border);max-height:160px;overflow-y:auto}
.checkout-item{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)}
.checkout-item:last-of-type{border-bottom:none}
.checkout-item-img{width:36px;height:36px;border-radius:6px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;flex-shrink:0}
.checkout-item-img img{width:100%;height:100%;object-fit:cover}
.checkout-item-name{flex:1;font-size:13px;color:var(--text2)}
.checkout-item-price{font-size:13px;font-weight:600;color:var(--accent)}
.checkout-total{display:flex;justify-content:space-between;padding-top:8px;margin-top:6px;border-top:1px solid var(--border2)}
.checkout-total span{font-size:13px;color:var(--text2)}
.checkout-total strong{font-size:16px;color:var(--accent)}
.checkout-fields{padding:16px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1}
.checkout-section-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px}
.checkout-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.checkout-field{display:flex;flex-direction:column;gap:4px}
.checkout-field label{font-size:11px;color:var(--text2);font-weight:500}
.checkout-input{background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:9px 12px;border-radius:var(--radius);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .15s;width:100%}
.checkout-input:focus{border-color:var(--accent)}
.checkout-select{cursor:pointer}
.cart-pay-error{margin:8px 20px 0;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--red);padding:8px 12px;border-radius:var(--radius);font-size:12px}
.cart-pay-final{margin:12px 20px;width:calc(100% - 40px);display:flex;align-items:center;justify-content:center;gap:8px}
.cart-secure-note{text-align:center;font-size:11px;color:var(--text3);padding-bottom:14px}

/* CONTACT FORM — état fonctionnel */
.prev-form-error{color:#ef4444;font-size:12px;margin-bottom:8px;width:100%;max-width:500px}
.prev-form-success{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:14px;font-weight:600;padding:10px 16px;border-radius:8px;width:100%;max-width:500px;margin-bottom:8px;text-align:center}
.prev-form-btn:disabled{opacity:.6;cursor:not-allowed}

/* ================================================================
   RESPONSIVE BUILDER — Mobile vs Desktop
   Mobile (<768px) : interface simplifiée, sidebar cachée
   Desktop (>768px) : layout complet avec sidebar
================================================================ */

/* ── Desktop : tout normal ─────────────────────────────────── */
@media (min-width: 769px) {
  .topbar { flex-wrap:nowrap }
  .page-tabs { display:flex }
  .workspace { flex-direction:row }
  .sidebar { display:flex }
}

/* ── Mobile (<768px) ────────────────────────────────────────── */
@media (max-width: 768px) {

  /* TOPBAR mobile : logo + save + toggle */
  :root { --sidebar-w: 0px; --topbar-h: 52px }

  /* PRODUITS : 1 colonne sur petit mobile */
  .prev-products { padding: 20px 12px }
  .prev-products-grid { grid-template-columns: 1fr; gap: 14px }
  .prev-product-img { height: 220px }
  .prev-product-img-ph { height: 220px; font-size: 56px }

  .topbar {
    padding: 0 10px;
    gap: 6px;
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  /* Masquer les éléments secondaires de la topbar */
  .page-tabs          { display:none }
  .brand-badge        { display:none }
  .save-status        { display:none }
  .lang-select        { display:none }
  .pub-btn-group      { flex-shrink:0 }

  /* Brand compact */
  .topbar-brand { gap:6px; min-width:0; flex-shrink:1 }
  .brand-name-input { max-width:80px; font-size:12px }
  .site-logo-img { height:28px }

  /* Boutons topbar : plus petits */
  .btn-action {
    padding: 5px 8px;
    font-size: 12px;
  }
  .btn-action.icon-btn { padding:5px 8px; font-size:14px }

  /* WORKSPACE : sidebar cachée par défaut */
  .workspace { flex-direction: column }
  .sidebar {
    display: none;
    position: fixed;
    top: var(--topbar-h);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 150;
    width: 100%;
    height: calc(100vh - var(--topbar-h));
    overflow-y: auto;
  }
  .sidebar.sidebar-open { display: flex }

  /* CANVAS mobile : pleine largeur */
  .canvas {
    padding: 12px;
    min-height: calc(100vh - var(--topbar-h));
  }
  .canvas-frame {
    width: 100% !important;
    min-width: unset !important;
  }

  /* Bouton toggle sidebar mobile */
  .sidebar-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    flex-shrink: 0;
  }

  /* CART modal : plein écran sur mobile */
  .cart-overlay .cart-modal {
    max-width: 100%;
    max-height: 95vh;
    border-radius: 16px 16px 0 0;
    margin-top: auto;
  }
  .cart-overlay {
    align-items: flex-end !important;
  }

  /* Config modal : plein écran sur mobile */
  .config-modal { max-width:100%; border-radius:16px 16px 0 0; margin:auto 0 0 }

  /* SECTION edit : padding réduit */
  .sec-hero, .sec-text, .sec-image, .sec-features, .sec-payment { padding:16px }
}

/* Bouton sidebar toggle — caché sur desktop */
.sidebar-toggle-btn { display:none }

/* TABLET (480–768px) : 2 colonnes produits */
@media (min-width: 480px) and (max-width: 768px) {
  .prev-products { padding: 24px 16px }
  .prev-products-grid { grid-template-columns: repeat(2,1fr); gap: 14px }
  .prev-product-img { height: 180px }
  .prev-product-img-ph { height: 180px }
}

/* ── Aperçu public : responsive nav ────────────────────────── */
@media(max-width:640px) {
  .pv-nav { padding:0 10px; height:54px }
  .pv-brand { margin-right:8px }
  .pv-site-name { font-size:14px }
  .pv-menu { gap:0 }
  .pv-menu-item { padding:6px 8px; font-size:12px }
  .pv-cart-label { display:none }
  .pv-lang-select { padding:6px 8px; font-size:11px; max-width:90px }
  .pv-cart-btn { padding:7px 12px }
}

/* ── Config Paiement Modal ──────────────────────────────── */
.pay-config-modal{max-width:560px;max-height:88vh;overflow-y:auto}
.pay-form-fields{padding:0 4px;display:flex;flex-direction:column;gap:12px;max-height:440px;overflow-y:auto;padding-right:8px}
.pcf-section-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.pcf-field{display:flex;flex-direction:column;gap:4px}
.pcf-field label{font-size:12px;font-weight:600;color:var(--text2)}
.pcf-required{color:#ef4444}
.pcf-input{background:var(--surface2);border:1px solid var(--border2);color:var(--text);padding:9px 12px;border-radius:var(--radius);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .15s;width:100%}
.pcf-input:focus{border-color:var(--accent)}
.pcf-select{cursor:pointer}
.pcf-url{font-family:monospace;font-size:11px}
.pcf-hint{font-size:11px;color:var(--text3);line-height:1.4}
.pcf-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pcf-info-box{background:rgba(108,99,255,.08);border:1px solid rgba(108,99,255,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--text2);line-height:1.6}
.pcf-link{color:var(--accent);text-decoration:none;font-weight:600}
.pcf-link:hover{text-decoration:underline}
.pcf-checkbox-group{display:flex;flex-wrap:wrap;gap:8px;padding:8px 0}
.pcf-checkbox{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text2);cursor:pointer;background:var(--surface2);border:1px solid var(--border2);padding:4px 10px;border-radius:6px;transition:all .15s}
.pcf-checkbox:hover{border-color:var(--accent)}
.pcf-checkbox input{accent-color:var(--accent)}

/* ── Topbar User Info ───────────────────────────────────── */
.topbar-user{display:flex;align-items:center;gap:8px;padding:4px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:10px;flex-shrink:0}
.topbar-user-avatar{width:30px;height:30px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#6c63ff,#a78bfa);display:flex;align-items:center;justify-content:center}
.topbar-avatar-img{width:100%;height:100%;object-fit:cover}
.topbar-avatar-initials{color:white;font-size:13px;font-weight:700}
.topbar-user-info{display:flex;flex-direction:column;min-width:0}
.topbar-user-name{font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px}
.topbar-user-email{font-size:10px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px}
.topbar-signout-btn{background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:4px;border-radius:6px;transition:all .15s;flex-shrink:0}
.topbar-signout-btn:hover{background:rgba(239,68,68,.15);color:#ef4444}

/* Mobile : masquer les détails user, garder juste l'avatar + logout */
@media(max-width:768px){
  .topbar-user-info{display:none}
  .topbar-user{padding:4px 6px;gap:4px}
  .topbar-user-name,.topbar-user-email{display:none}
}

/* ── Product image area + camera ────────────────────────── */
.product-img-area{display:flex;flex-direction:column;gap:4px}
.product-img-actions{display:flex;gap:4px;justify-content:center;padding:4px 0}
.product-img-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:7px;border:none;cursor:pointer;font-size:14px;transition:all .15s}
.upload-btn{background:#ede9fe;color:#6c63ff}
.upload-btn:hover{background:#ddd6fe}
.camera-btn{background:#ecfdf5;color:#059669}
.camera-btn:hover{background:#d1fae5}
.remove-btn{background:#fef2f2;color:#ef4444}
.remove-btn:hover{background:#fee2e2}

/* ── Profil utilisateur popup ───────────────────────────── */
.user-profile-overlay .modal-box{max-width:420px}
.user-profile-modal{padding:28px}
.up-avatar-section{display:flex;align-items:center;gap:16px;margin-bottom:24px}
.up-avatar-big{width:64px;height:64px;border-radius:50%;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,#6c63ff,#a78bfa);display:flex;align-items:center;justify-content:center}
.up-avatar-img{width:100%;height:100%;object-fit:cover}
.up-avatar-initials{color:white;font-size:26px;font-weight:700}
.up-user-details{flex:1;min-width:0}
.up-user-name{font-size:17px;font-weight:700;color:var(--text);margin-bottom:3px}
.up-user-email{font-size:13px;color:var(--text3);word-break:break-all}
.up-user-badge{margin-top:6px}
.up-badge-pro{background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;display:inline-block}
.up-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.up-info-item{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px}
.up-info-label{display:block;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.up-info-value{font-size:12px;font-weight:600;color:var(--text)}
.up-info-value code{font-family:monospace;font-size:11px;color:var(--accent)}
.up-verified{color:#10b981}
.up-unverified{color:#ef4444}
.up-actions{display:flex;flex-direction:column;gap:8px}
.up-btn-orders{width:100%;padding:11px;background:var(--surface2);border:1px solid var(--border2);color:var(--text);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;text-align:center}
.up-btn-orders:hover{border-color:var(--accent);color:var(--accent)}
.up-btn-signout{width:100%;padding:11px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#ef4444;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.up-btn-signout:hover{background:rgba(239,68,68,.2)}

/* Curseur pointer sur l'avatar topbar */
.topbar-user{cursor:pointer;user-select:none}
.topbar-user:hover .topbar-user-avatar{box-shadow:0 0 0 2px var(--accent)}

/* ── Écran déconnexion ───────────────────────────────────── */
.signout-overlay{position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#0f0f11,#1a1a2e);display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif}
.signout-card{text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;padding:48px 36px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;max-width:360px;width:90%}
.signout-icon{font-size:56px;animation:wave 1.2s ease-in-out}
@keyframes wave{0%,100%{transform:rotate(0deg)}25%{transform:rotate(20deg)}75%{transform:rotate(-10deg)}}
.signout-title{font-family:'Playfair Display',serif;font-size:28px;color:white}
.signout-sub{font-size:15px;color:rgba(255,255,255,.5)}
.signout-reload{background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;border:none;border-radius:12px;padding:14px 32px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;margin-top:8px}
.signout-reload:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(108,99,255,.4)}

/* ── Aperçu : bouton connexion/déconnexion ──────────────── */
.pv-user-btn{display:flex;align-items:center;gap:7px;padding:6px 12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
.pv-user-btn:hover{background:#ede9fe;border-color:#6c63ff}
.pv-user-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#a78bfa);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;overflow:hidden;flex-shrink:0}
.pv-user-avatar-img{width:100%;height:100%;object-fit:cover}
.pv-user-name{font-size:12px;font-weight:600;color:#374151;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pv-login-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#6c63ff;color:white;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
.pv-login-btn:hover{background:#5b52ee;transform:translateY(-1px)}

/* ── Écran déconnexion + formulaire auth complet ────────── */
.signout-card{max-height:90vh;overflow-y:auto;scrollbar-width:none}
.signout-card::-webkit-scrollbar{display:none}
/* Onglets */
.so-tabs{display:flex;background:rgba(255,255,255,.06);border-radius:10px;padding:3px;gap:3px;width:100%}
.so-tab{flex:1;padding:8px;background:none;border:none;border-radius:8px;font-size:13px;font-weight:500;color:rgba(255,255,255,.45);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.so-tab.active{background:rgba(108,99,255,.4);color:white;font-weight:700}
/* Messages */
.so-error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#fca5a5;padding:9px 12px;border-radius:8px;font-size:13px;text-align:center;width:100%}
.so-success{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#6ee7b7;padding:9px 12px;border-radius:8px;font-size:13px;text-align:center;width:100%}
/* Form */
.so-form{display:flex;flex-direction:column;gap:10px;width:100%}
.so-field{display:flex;flex-direction:column;gap:4px;text-align:left}
.so-field label{font-size:12px;font-weight:600;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:4px}
.so-hint{font-size:10px;color:rgba(255,255,255,.3);font-weight:400}
.so-input{padding:11px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:white;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .15s;width:100%}
.so-input:focus{border-color:#6c63ff;background:rgba(108,99,255,.08)}
.so-input::placeholder{color:rgba(255,255,255,.25)}
/* Bouton principal */
.so-submit{width:100%;padding:13px;background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.so-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(108,99,255,.4)}
.so-submit:disabled{opacity:.6;cursor:not-allowed}
/* Spinner */
.so-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:so-spin .6s linear infinite}
@keyframes so-spin{to{transform:rotate(360deg)}}
/* Séparateur */
.so-separator{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.3);font-size:11px;width:100%}
.so-separator::before,.so-separator::after{content:'';flex:1;border-top:1px solid rgba(255,255,255,.1)}
/* Google */
.so-google{width:100%;padding:11px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.8);border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s}
.so-google:hover:not(:disabled){background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.2)}
.so-google:disabled{opacity:.5;cursor:not-allowed}
/* Mot de passe oublié */
.so-forgot-btn{background:none;border:none;color:rgba(108,99,255,.8);font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:right;padding:2px 0;transition:color .15s;align-self:flex-end}
.so-forgot-btn:hover{color:#a78bfa}
.so-forgot-desc{font-size:13px;color:rgba(255,255,255,.5);line-height:1.6;text-align:center}
.so-back-link{background:none;border:none;color:rgba(255,255,255,.4);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:center;padding:4px;transition:color .15s}
.so-back-link:hover{color:rgba(255,255,255,.7)}

/* Responsive aperçu mobile */
@media(max-width:640px){
  .pv-user-name{display:none}
  .pv-login-btn span:last-child{display:none}
}

.topbar-login-btn{background:linear-gradient(135deg,#6c63ff,#a78bfa);color:white;border:none;border-radius:9px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;white-space:nowrap}
.topbar-login-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(108,99,255,.4)}

.up-badge-customer{background:linear-gradient(135deg,#10b981,#059669);color:white;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;display:inline-block}
.up-orders-section{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:4px}
.up-orders-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.up-orders-count{background:var(--accent);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;margin-left:auto}
.up-orders-loading{color:var(--text3);font-size:11px;margin-left:auto}
.up-orders-empty{font-size:13px;color:var(--text3);text-align:center;padding:10px 0}
.up-orders-list{display:flex;flex-direction:column;gap:6px}
.up-order-item{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px}
.up-order-left{display:flex;flex-direction:column;gap:2px}
.up-order-id{font-size:12px;font-weight:700;color:var(--text);font-family:monospace}
.up-order-date{font-size:10px;color:var(--text3)}
.up-order-right{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.up-order-total{font-size:13px;font-weight:700;color:var(--accent)}
.up-order-status{font-size:10px;font-weight:600;padding:2px 8px;border-radius:100px}
.status-paid{background:rgba(16,185,129,.15);color:#10b981}
.status-pending{background:rgba(245,158,11,.15);color:#f59e0b}
.status-shipped{background:rgba(108,99,255,.15);color:#6c63ff}
.status-delivered{background:rgba(16,185,129,.2);color:#059669}
.status-cancelled{background:rgba(239,68,68,.15);color:#ef4444}

</style>
