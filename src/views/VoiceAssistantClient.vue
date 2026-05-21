<template>
  <div class="vac-root" :dir="isRtl ? 'rtl' : 'ltr'">

    <!-- ── Bouton flottant ────────────────────────────────── -->
    <button
      class="vac-fab"
      @click="toggleChat"
      :class="{ 'vac-fab-open': open }"
      :title="open ? t.close : t.openChat"
    >
      <span v-if="!open" class="vac-fab-icon">🤖</span>
      <span v-else        class="vac-fab-icon">✕</span>
      <span v-if="!open && unread > 0" class="vac-fab-badge">{{ unread }}</span>
    </button>

    <!-- ── Fenêtre chat ───────────────────────────────────── -->
    <Transition name="vac-pop">
      <div v-if="open" class="vac-window">

        <!-- Header -->
        <div class="vac-header">
          <div class="vac-header-info">
            <div class="vac-avatar">🤖</div>
            <div>
              <p class="vac-header-name">{{ storeName || t.assistant }}</p>
              <p class="vac-header-status">
                <span class="vac-dot"></span>{{ t.online }}
              </p>
            </div>
          </div>
          <div class="vac-header-actions">
            <!-- Sélecteur langue visiteur -->
            <div class="vac-langs">
              <button
                v-for="l in availableLangs"
                :key="l.code"
                class="vac-lang-btn"
                :class="{ active: lang === l.code }"
                @click="lang = l.code"
                :title="l.label"
              >{{ l.flag }}</button>
            </div>
            <button class="vac-close-btn" @click="open = false">✕</button>
          </div>
        </div>

        <!-- Messages -->
        <div class="vac-messages" ref="messagesEl">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="vac-msg-row"
            :class="msg.role === 'user' ? 'vac-msg-user' : 'vac-msg-bot'"
          >
            <div v-if="msg.role === 'assistant'" class="vac-msg-avatar">🤖</div>
            <div class="vac-bubble" :class="msg.role === 'user' ? 'vac-bubble-user' : 'vac-bubble-bot'">
              <p class="vac-bubble-text" v-html="formatMsg(msg.content)"></p>
              <span class="vac-bubble-time">{{ msg.time }}</span>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="loading" class="vac-msg-row vac-msg-bot">
            <div class="vac-msg-avatar">🤖</div>
            <div class="vac-bubble vac-bubble-bot vac-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Formulaire requête (action SHOW_REQUEST_FORM) -->
        <Transition name="vac-slide">
          <div v-if="showForm" class="vac-request-form">
            <p class="vac-form-title">📋 {{ t.leaveInfo }}</p>
            <input  v-model="form.nom"       :placeholder="t.name"    class="vac-input"/>
            <input  v-model="form.email"     :placeholder="t.email"   type="email" class="vac-input"/>
            <input  v-model="form.telephone" :placeholder="t.phone"   class="vac-input"/>
            <textarea v-model="form.question" :placeholder="t.question" class="vac-input vac-textarea" rows="3"></textarea>
            <div class="vac-form-btns">
              <button class="vac-btn-cancel" @click="showForm = false">{{ t.cancel }}</button>
              <button class="vac-btn-send"   @click="submitForm" :disabled="formSending">
                {{ formSending ? t.sending : t.send }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Input -->
        <div class="vac-input-row" v-if="!showForm">
          <textarea
            v-model="input"
            :placeholder="t.placeholder"
            class="vac-input-msg"
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @input="autoResize"
            ref="inputEl"
          ></textarea>
          <button
            class="vac-send-btn"
            @click="sendMessage"
            :disabled="loading || !input.trim()"
          >
            <span v-if="loading">⏳</span>
            <span v-else>➤</span>
          </button>
        </div>

      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue"

// ── Props ─────────────────────────────────────────────────────
const props = defineProps({
  storeUid:   { type: String, required: true  },
  storeName:  { type: String, default: ""     },
  storeEmail: { type: String, default: ""     },
  lang:       { type: String, default: "fr"   },
  backendUrl: { type: String, default: ""     },
  // Utilisateur connecté (passé par SiteViewer)
  clientUid:  { type: String, default: ""     },
  clientEmail:{ type: String, default: ""     },
  clientName: { type: String, default: ""     },
})

// ── State ─────────────────────────────────────────────────────
const open        = ref(false)
const lang        = ref(props.lang || "fr")

// Sync lang when SiteViewer changes it (visitor picks a language in the store)
watch(() => props.lang, (newLang) => {
  if (newLang && newLang !== lang.value) {
    lang.value = newLang
  }
})
const messages    = ref([])
const input       = ref("")
const loading     = ref(false)
const unread      = ref(0)
const showForm    = ref(false)
const formSending = ref(false)
const messagesEl  = ref(null)
const inputEl     = ref(null)

const form = ref({ nom: "", email: "", telephone: "", question: "" })

// ── Traductions ───────────────────────────────────────────────
const translations = {
  fr: {
    assistant: "Assistant", online: "En ligne", openChat: "Ouvrir le chat",
    close: "Fermer", placeholder: "Votre message...",
    leaveInfo: "Laissez vos coordonnées", name: "Nom complet",
    email: "Email", phone: "Téléphone", question: "Votre question",
    send: "Envoyer", sending: "Envoi...", cancel: "Annuler",
    formSent: "✅ Votre demande a été enregistrée. Nous vous contacterons bientôt.",
    welcome: (name) => `Bonjour ! Je suis l'assistant de ${name}. Comment puis-je vous aider ? Je peux vous renseigner sur nos produits, prix ou l'état de vos commandes.`,
    error: "Une erreur est survenue. Réessayez.",
  },
  en: {
    assistant: "Assistant", online: "Online", openChat: "Open chat",
    close: "Close", placeholder: "Your message...",
    leaveInfo: "Leave your details", name: "Full name",
    email: "Email", phone: "Phone", question: "Your question",
    send: "Send", sending: "Sending...", cancel: "Cancel",
    formSent: "✅ Your request has been saved. We'll contact you soon.",
    welcome: (name) => `Hello! I'm the assistant for ${name}. How can I help you? I can answer questions about our products, prices or your order status.`,
    error: "An error occurred. Please try again.",
  },
  ar: {
    assistant: "المساعد", online: "متصل", openChat: "فتح المحادثة",
    close: "إغلاق", placeholder: "رسالتك...",
    leaveInfo: "اترك معلوماتك", name: "الاسم الكامل",
    email: "البريد الإلكتروني", phone: "الهاتف", question: "سؤالك",
    send: "إرسال", sending: "جارٍ...", cancel: "إلغاء",
    formSent: "✅ تم حفظ طلبك. سنتواصل معك قريباً.",
    welcome: (name) => `مرحباً! أنا مساعد ${name}. كيف يمكنني مساعدتك؟ يمكنني الإجابة على أسئلة حول منتجاتنا أو حالة طلباتك.`,
    error: "حدث خطأ. حاول مرة أخرى.",
  },
  es: {
    assistant: "Asistente", online: "En línea", openChat: "Abrir chat",
    close: "Cerrar", placeholder: "Tu mensaje...",
    leaveInfo: "Deja tus datos", name: "Nombre completo",
    email: "Email", phone: "Teléfono", question: "Tu pregunta",
    send: "Enviar", sending: "Enviando...", cancel: "Cancelar",
    formSent: "✅ Tu solicitud ha sido guardada. Te contactaremos pronto.",
    welcome: (name) => `¡Hola! Soy el asistente de ${name}. ¿Cómo puedo ayudarte? Puedo informarte sobre nuestros productos, precios o el estado de tus pedidos.`,
    error: "Ocurrió un error. Inténtalo de nuevo.",
  },
}

const t       = computed(() => translations[lang.value] || translations.fr)
const isRtl   = computed(() => lang.value === "ar")
const backend = computed(() => props.backendUrl || "https://backendfinal-production-afd2.up.railway.app")

// Langues disponibles pour le visiteur
const availableLangs = [
  { code: "fr", flag: "🇫🇷", label: "Français"  },
  { code: "en", flag: "🇬🇧", label: "English"   },
  { code: "ar", flag: "🇲🇦", label: "العربية"   },
  { code: "es", flag: "🇪🇸", label: "Español"   },
]

// ── Historique pour contexte Groq (max 8 échanges) ───────────
const history = computed(() =>
  messages.value
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content }))
)

// ── Helpers ───────────────────────────────────────────────────
const now = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

const addMsg = (role, content) => {
  messages.value.push({ role, content, time: now() })
  if (role === "assistant" && !open.value) unread.value++
  nextTick(scrollBottom)
}

const scrollBottom = () => {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

const autoResize = () => {
  if (inputEl.value) {
    inputEl.value.style.height = "auto"
    inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 120) + "px"
  }
}

// Formatage basique : sauts de ligne, gras
const formatMsg = (txt) =>
  (txt || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>")

// ── Init ──────────────────────────────────────────────────────
onMounted(() => {
  addMsg("assistant", t.value.welcome(props.storeName || t.value.assistant))
})

watch(lang, () => {
  // Mettre à jour le message de bienvenue dans la nouvelle langue
  const firstBot = messages.value.find(m => m.role === "assistant")
  if (firstBot) {
    firstBot.content = t.value.welcome(props.storeName || t.value.assistant)
  }
})

const toggleChat = () => {
  open.value = !open.value
  if (open.value) {
    unread.value = 0
    nextTick(() => { scrollBottom(); inputEl.value?.focus() })
  }
}

// ── Envoi message ─────────────────────────────────────────────
const sendMessage = async () => {
  const msg = input.value.trim()
  if (!msg || loading.value) return

  addMsg("user", msg)
  input.value = ""
  if (inputEl.value) inputEl.value.style.height = "auto"
  loading.value = true

  try {
    const res = await fetch(`${backend.value}/api/assistant`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:    msg,
        history:    history.value,
        storeUid:   props.storeUid,      // ownerUid du store → lit prodinfos
        lang:       lang.value,
        // Client connecté → commandes précises par uid + email
        clientUid:  props.clientUid  || "",
        clientInfo: {
          email: props.clientEmail || "",
          nom:   props.clientName  || "",
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)

    // Gérer les actions JSON retournées par Groq
    if (data.action === "SHOW_REQUEST_FORM") {
      addMsg("assistant", data.reply)
      showForm.value = true
      // Pré-remplir si client connecté
      if (props.clientEmail) form.value.email = props.clientEmail
      if (props.clientName)  form.value.nom   = props.clientName
    } else {
      addMsg("assistant", data.reply)
    }

  } catch(e) {
    console.error("assistant:", e.message)
    addMsg("assistant", t.value.error)
  } finally {
    loading.value = false
    nextTick(() => inputEl.value?.focus())
  }
}

// ── Soumettre formulaire requête ──────────────────────────────
const submitForm = async () => {
  if (!form.value.nom || !form.value.email) return
  formSending.value = true
  try {
    await fetch(`${backend.value}/api/save-request`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeUid:  props.storeUid,
        nom:       form.value.nom,
        email:     form.value.email,
        telephone: form.value.telephone,
        question:  form.value.question,
      }),
    })
    showForm.value = false
    form.value     = { nom: "", email: "", telephone: "", question: "" }
    addMsg("assistant", t.value.formSent)
  } catch(e) {
    console.error("save-request:", e.message)
  } finally {
    formSending.value = false
  }
}
</script>

<style scoped>
/* ── Bouton flottant ─────────────────────────────────────── */
.vac-root { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: 'DM Sans', Arial, sans-serif; }
[dir="rtl"] .vac-root { right: auto; left: 24px; }

.vac-fab {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  border: none; cursor: pointer; position: relative;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(108,99,255,.45);
  transition: transform .2s, box-shadow .2s;
}
.vac-fab:hover          { transform: scale(1.08); box-shadow: 0 6px 28px rgba(108,99,255,.55); }
.vac-fab-open           { background: linear-gradient(135deg, #ef4444, #dc2626); }
.vac-fab-icon           { font-size: 22px; line-height: 1; }
.vac-fab-badge {
  position: absolute; top: -4px; right: -4px;
  background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 700;
  min-width: 18px; height: 18px;
  border-radius: 9px; padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
}

/* ── Fenêtre ─────────────────────────────────────────────── */
.vac-window {
  position: absolute; bottom: 70px; right: 0;
  width: 360px; max-height: 540px;
  background: #fff; border-radius: 18px;
  box-shadow: 0 12px 48px rgba(0,0,0,.18);
  display: flex; flex-direction: column;
  overflow: hidden;
}
[dir="rtl"] .vac-window { right: auto; left: 0; }
@media (max-width: 420px) {
  .vac-window { width: calc(100vw - 24px); right: -8px; }
}

/* ── Header ──────────────────────────────────────────────── */
.vac-header {
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  padding: 14px 16px;
  display: flex; align-items: center; justify-content: space-between;
}
.vac-header-info        { display: flex; align-items: center; gap: 10px; }
.vac-avatar             { font-size: 28px; }
.vac-header-name        { color: #fff; font-size: 14px; font-weight: 700; margin: 0; }
.vac-header-status      { color: rgba(255,255,255,.8); font-size: 11px; margin: 2px 0 0; display: flex; align-items: center; gap: 5px; }
.vac-dot                { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; display: inline-block; }
.vac-header-actions     { display: flex; align-items: center; gap: 8px; }
.vac-langs         { display: flex; gap: 4px; align-items: center; }
.vac-lang-btn {
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
  color: #fff; border-radius: 6px; padding: 3px 6px; font-size: 14px;
  cursor: pointer; transition: .15s; line-height: 1;
}
.vac-lang-btn:hover  { background: rgba(255,255,255,.25); }
.vac-lang-btn.active { background: rgba(255,255,255,.35); border-color: rgba(255,255,255,.6); }
.vac-close-btn {
  background: rgba(255,255,255,.15); border: none; color: #fff;
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  font-size: 13px; display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.vac-close-btn:hover { background: rgba(255,255,255,.3); }

/* ── Messages ────────────────────────────────────────────── */
.vac-messages {
  flex: 1; overflow-y: auto; padding: 14px 12px;
  display: flex; flex-direction: column; gap: 10px;
  background: #f9fafb;
}
.vac-messages::-webkit-scrollbar       { width: 4px; }
.vac-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

.vac-msg-row        { display: flex; align-items: flex-end; gap: 8px; }
.vac-msg-user       { flex-direction: row-reverse; }
.vac-msg-avatar     { font-size: 20px; flex-shrink: 0; margin-bottom: 2px; }

.vac-bubble {
  max-width: 78%; padding: 9px 13px; border-radius: 14px;
  font-size: 13px; line-height: 1.55; position: relative;
}
.vac-bubble-bot  { background: #fff; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; color: #1f2937; }
.vac-bubble-user { background: linear-gradient(135deg, #6c63ff, #4f46e5); color: #fff; border-bottom-right-radius: 4px; }
.vac-bubble-text { margin: 0 0 4px; }
.vac-bubble-time { font-size: 10px; opacity: .55; display: block; text-align: right; }

/* Typing indicator */
.vac-typing { display: flex; align-items: center; gap: 5px; padding: 12px 16px; }
.vac-typing span {
  width: 7px; height: 7px; border-radius: 50%; background: #9ca3af;
  animation: vac-bounce .9s infinite;
}
.vac-typing span:nth-child(2) { animation-delay: .15s; }
.vac-typing span:nth-child(3) { animation-delay: .30s; }
@keyframes vac-bounce { 0%,60%,100% { transform: translateY(0) } 30% { transform: translateY(-6px) } }

/* ── Formulaire requête ──────────────────────────────────── */
.vac-request-form {
  padding: 14px 14px 10px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  display: flex; flex-direction: column; gap: 8px;
}
.vac-form-title  { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 4px; }
.vac-form-btns   { display: flex; gap: 8px; margin-top: 4px; }
.vac-btn-cancel  {
  flex: 1; padding: 8px; border: 1px solid #e5e7eb; background: #fff;
  border-radius: 8px; font-size: 13px; cursor: pointer; color: #6b7280;
  font-family: inherit; transition: .15s;
}
.vac-btn-cancel:hover { background: #f3f4f6; }
.vac-btn-send    {
  flex: 2; padding: 8px; background: linear-gradient(135deg, #6c63ff, #4f46e5);
  border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
  color: #fff; cursor: pointer; font-family: inherit; transition: .15s;
}
.vac-btn-send:hover:not(:disabled) { opacity: .88; }
.vac-btn-send:disabled { opacity: .55; cursor: not-allowed; }

/* ── Input ───────────────────────────────────────────────── */
.vac-input-row {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 10px 12px; border-top: 1px solid #e5e7eb; background: #fff;
}
.vac-input-msg {
  flex: 1; resize: none; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 9px 12px; font-size: 13px; font-family: inherit;
  line-height: 1.4; max-height: 120px; overflow-y: auto;
  outline: none; transition: border-color .15s;
}
.vac-input-msg:focus { border-color: #6c63ff; }
.vac-input-msg::placeholder { color: #9ca3af; }
.vac-send-btn {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  border: none; color: #fff; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: .15s;
}
.vac-send-btn:hover:not(:disabled)  { opacity: .85; }
.vac-send-btn:disabled { opacity: .45; cursor: not-allowed; }

/* Inputs formulaire */
.vac-input {
  width: 100%; padding: 8px 11px; border: 1px solid #e5e7eb;
  border-radius: 8px; font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .15s;
}
.vac-input:focus   { border-color: #6c63ff; }
.vac-textarea      { resize: vertical; min-height: 60px; }

/* ── Transitions ─────────────────────────────────────────── */
.vac-pop-enter-active, .vac-pop-leave-active { transition: all .25s cubic-bezier(.34,1.56,.64,1); }
.vac-pop-enter-from, .vac-pop-leave-to       { opacity: 0; transform: scale(.85) translateY(12px); }
.vac-slide-enter-active, .vac-slide-leave-active { transition: all .2s ease; }
.vac-slide-enter-from, .vac-slide-leave-to       { opacity: 0; transform: translateY(8px); }
</style>
