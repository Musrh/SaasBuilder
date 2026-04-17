
<!-- ============================================================
  VoiceAssistantClient.vue
  src/components/VoiceAssistantClient.vue

  Assistant vocal IA pour les CLIENTS du store.
  Utilisé dans SiteViewer.vue (site publié).

  Fonctionnalités :
  - Parole → texte (SpeechRecognition)
  - Envoi au backend /api/assistant (Groq + Firestore)
  - Texte → parole (SpeechSynthesis)
  - Gestion commandes : demande nom/email/date
  - Page Requêtes automatique si réponse inconnue
  - Sauvegarde Firestore via /api/save-request
  - Confirmation vocale oui/non
============================================================ -->

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from "vue"

// ── Props ─────────────────────────────────────────────────────
const props = defineProps({
  storeUid:   { type: String, default: "" },
  storeName:  { type: String, default: "Notre boutique" },
  storeEmail: { type: String, default: "" },
  lang:       { type: String, default: "fr" },
  backendUrl: { type: String, default: "https://backend-master-production-cf50.up.railway.app" },
})

// ── État principal ────────────────────────────────────────────
const isOpen       = ref(false)
const isListening  = ref(false)
const isSpeaking   = ref(false)
const isLoading    = ref(false)
const transcript   = ref("")
const conversation = ref([])   // { role: "user"|"assistant", content }
const convEl       = ref(null)

// ── Infos client (collectées au fil de la conversation) ───────
const clientInfo = ref({ nom: "", email: "", date: "" })

// ── Page Requêtes ─────────────────────────────────────────────
const showRequestForm  = ref(false)
const requestForm      = ref({ nom: "", email: "", telephone: "", adresse: "", question: "" })
const requestSaved     = ref(false)
const requestConfirmed = ref(false)  // en attente de confirmation oui/non
const pendingRequestId = ref(null)

// SpeechRecognition
let recognition = null
// SpeechSynthesis
const synth = window.speechSynthesis

// ── Langue ────────────────────────────────────────────────────
const langCode = computed(() => ({
  fr: "fr-FR", en: "en-US", es: "es-ES", ar: "ar-SA"
})[props.lang] || "fr-FR")

// ── Textes UI multilingue ─────────────────────────────────────
const ui = computed(() => ({
  fr: {
    title:       "Assistant vocal",
    subtitle:    props.storeName,
    placeholder: "Posez votre question...",
    send:        "Envoyer",
    listen:      "Parler",
    stop:        "Arrêter",
    waiting:     "En attente...",
    listening:   "Écoute en cours...",
    speaking:    "Réponse en cours...",
    loading:     "Réflexion...",
    reqTitle:    "Formulaire de requête",
    reqSubtitle: "Je vais noter vos informations",
    reqNom:      "Votre nom",
    reqEmail:    "Votre email",
    reqTel:      "Votre téléphone",
    reqAdr:      "Votre adresse",
    reqQ:        "Votre question",
    reqConfirm:  "Puis-je sauvegarder ces informations ?",
    reqYes:      "Oui, confirmer",
    reqNo:       "Non, annuler",
    reqSaved:    "Requête enregistrée ✓ Nous vous contacterons bientôt.",
    reqEmail2:   `Vous pouvez aussi nous écrire à : ${props.storeEmail}`,
    welcome:     `Bonjour ! Je suis l'assistant de ${props.storeName}. Comment puis-je vous aider ? Je peux vous renseigner sur nos produits, prix ou l'état de vos commandes.`,
    askName:     "Pour accéder à vos commandes, pouvez-vous me donner votre nom, email et date de commande ?",
    noMic:       "Microphone non disponible. Utilisez le clavier.",
  },
  en: {
    title: "Voice Assistant", subtitle: props.storeName,
    placeholder: "Ask your question...", send: "Send", listen: "Speak", stop: "Stop",
    waiting: "Waiting...", listening: "Listening...", speaking: "Speaking...", loading: "Thinking...",
    reqTitle: "Request Form", reqSubtitle: "I'll note your information",
    reqNom: "Your name", reqEmail: "Your email", reqTel: "Your phone", reqAdr: "Your address", reqQ: "Your question",
    reqConfirm: "Shall I save this information?", reqYes: "Yes, confirm", reqNo: "No, cancel",
    reqSaved: "Request saved ✓ We'll contact you soon.",
    reqEmail2: `You can also email us at: ${props.storeEmail}`,
    welcome: `Hello! I'm the assistant for ${props.storeName}. I can help with products, prices or your orders.`,
    askName: "To check your orders, please provide your name, email and order date.",
    noMic: "Microphone not available. Please use keyboard.",
  },
  ar: {
    title: "المساعد الصوتي", subtitle: props.storeName,
    placeholder: "اطرح سؤالك...", send: "إرسال", listen: "تكلم", stop: "إيقاف",
    waiting: "في انتظار...", listening: "جارٍ الاستماع...", speaking: "جارٍ الرد...", loading: "أفكر...",
    reqTitle: "نموذج الطلب", reqSubtitle: "سأسجّل معلوماتك",
    reqNom: "اسمك", reqEmail: "بريدك الإلكتروني", reqTel: "هاتفك", reqAdr: "عنوانك", reqQ: "سؤالك",
    reqConfirm: "هل أحفظ هذه المعلومات؟", reqYes: "نعم، تأكيد", reqNo: "لا، إلغاء",
    reqSaved: "تم حفظ الطلب ✓ سنتواصل معك قريباً.",
    reqEmail2: `يمكنك أيضاً مراسلتنا على: ${props.storeEmail}`,
    welcome: `مرحباً! أنا مساعد ${props.storeName}. كيف يمكنني مساعدتك في المنتجات والأسعار والطلبات؟`,
    askName: "لتتبع طلبك، أرجو إعطائي اسمك وبريدك الإلكتروني وتاريخ الطلب.",
    noMic: "الميكروفون غير متوفر. استخدم لوحة المفاتيح.",
  },
})[props.lang] || ({
  fr: { title: "Assistant", subtitle: props.storeName, placeholder: "Votre question...", send: "Envoyer", listen: "Parler", stop: "Arrêter", waiting: "...", listening: "Écoute...", speaking: "Parle...", loading: "...", reqTitle: "Requête", reqSubtitle: "", reqNom: "Nom", reqEmail: "Email", reqTel: "Tél", reqAdr: "Adresse", reqQ: "Question", reqConfirm: "Confirmer ?", reqYes: "Oui", reqNo: "Non", reqSaved: "Sauvegardé ✓", reqEmail2: props.storeEmail, welcome: "Bonjour !", askName: "Nom et email ?", noMic: "Pas de micro." }
}).fr)

// ── Saisie clavier ────────────────────────────────────────────
const textInput = ref("")

// ── Scroll conversation ───────────────────────────────────────
const scrollConv = () => {
  nextTick(() => {
    if (convEl.value) convEl.value.scrollTop = convEl.value.scrollHeight
  })
}

// ── Synthèse vocale ───────────────────────────────────────────
const speak = (text, onEnd = null) => {
  if (!synth || !text) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang  = langCode.value
  u.rate  = 1.05
  u.pitch = 1
  u.onstart = () => { isSpeaking.value = true }
  u.onend   = () => {
    isSpeaking.value = false
    onEnd?.()
  }
  synth.speak(u)
}

// ── Ajouter message conversation ─────────────────────────────
const addMsg = (role, content) => {
  conversation.value.push({ role, content, time: new Date().toLocaleTimeString() })
  scrollConv()
}

// ── Extraire infos client du message ─────────────────────────
const extractClientInfo = (text) => {
  // Email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  if (emailMatch) clientInfo.value.email = emailMatch[0]
  // Date format simple
  const dateMatch = text.match(/\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}/)
  if (dateMatch) clientInfo.value.date = dateMatch[0]
}

// ── Envoyer message au backend Groq ──────────────────────────
const sendMessage = async (userMsg) => {
  if (!userMsg.trim()) return
  addMsg("user", userMsg)
  extractClientInfo(userMsg)
  isLoading.value = true

  // Gérer confirmation oui/non de requête
  if (requestConfirmed.value) {
    const lower = userMsg.toLowerCase().trim()
    const isOui = ["oui", "yes", "نعم", "sí", "o", "ok", "confirme", "confirm"].some(k => lower.includes(k))
    const isNon = ["non", "no", "لا", "annule", "cancel", "n"].some(k => lower.includes(k))

    if (isOui) {
      isLoading.value = false
      await saveRequest()
      return
    } else if (isNon) {
      requestConfirmed.value = false
      isLoading.value = false
      const msg = props.lang === "fr"
        ? `D'accord, requête annulée. Vous pouvez nous contacter à : ${props.storeEmail || "notre email"}`
        : `Request cancelled. You can contact us at: ${props.storeEmail}`
      addMsg("assistant", msg)
      speak(msg)
      return
    }
  }

  try {
    const res = await fetch(`${props.backendUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:    userMsg,
        history:    conversation.value.slice(-8).map(m => ({ role: m.role, content: m.content })),
        storeUid:   props.storeUid,
        storeEmail: props.storeEmail,
        storeName:  props.storeName,
        lang:       props.lang,
        clientInfo: clientInfo.value,
      }),
    })

    const data = await res.json()
    isLoading.value = false

    // ── Action spéciale : afficher le formulaire de requête ───
    if (data.action === "SHOW_REQUEST_FORM") {
      const msg = data.reply || ui.value.reqSubtitle
      addMsg("assistant", msg)
      speak(msg, () => {
        showRequestForm.value = true
        // Pré-remplir si infos déjà connues
        if (clientInfo.value.nom)   requestForm.value.nom   = clientInfo.value.nom
        if (clientInfo.value.email) requestForm.value.email = clientInfo.value.email
        // Lire le formulaire à voix haute
        setTimeout(() => {
          speak(ui.value.reqSubtitle + ". " + ui.value.reqNom + ", " + ui.value.reqEmail + ", " + ui.value.reqTel + ", " + ui.value.reqQ)
        }, 500)
      })
      return
    }

    // ── Réponse normale ───────────────────────────────────────
    if (data.reply) {
      addMsg("assistant", data.reply)
      speak(data.reply)
    }

  } catch (e) {
    isLoading.value = false
    const errMsg = props.lang === "fr"
      ? "Désolé, je rencontre un problème technique. Veuillez réessayer."
      : "Sorry, I'm having a technical issue. Please try again."
    addMsg("assistant", errMsg)
    speak(errMsg)
  }
}

// ── Relire le formulaire et demander confirmation ─────────────
const confirmRequest = () => {
  const f = requestForm.value
  if (!f.question) return

  const recap = props.lang === "fr"
    ? `Voici ce que je vais enregistrer : Nom : ${f.nom || "non renseigné"}. Email : ${f.email || "non renseigné"}. Téléphone : ${f.telephone || "non renseigné"}. Question : ${f.question}. ${ui.value.reqConfirm}`
    : `Here is what I will save: Name: ${f.nom || "N/A"}. Email: ${f.email || "N/A"}. Phone: ${f.telephone || "N/A"}. Question: ${f.question}. ${ui.value.reqConfirm}`

  addMsg("assistant", recap)
  speak(recap)
  requestConfirmed.value = true
  showRequestForm.value  = false
}

// ── Sauvegarder la requête ────────────────────────────────────
const saveRequest = async () => {
  try {
    const res = await fetch(`${props.backendUrl}/api/save-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeUid:  props.storeUid,
        ...requestForm.value,
      }),
    })
    const data = await res.json()
    requestSaved.value     = true
    requestConfirmed.value = false

    const msg = ui.value.reqSaved + " " + ui.value.reqEmail2
    addMsg("assistant", msg)
    speak(msg)

    // Reset form après 3s
    setTimeout(() => {
      requestForm.value  = { nom: "", email: "", telephone: "", adresse: "", question: "" }
      requestSaved.value = false
    }, 4000)

  } catch(e) {
    const errMsg = props.lang === "fr"
      ? `Erreur sauvegarde. Contactez-nous à : ${props.storeEmail}`
      : `Save error. Contact us at: ${props.storeEmail}`
    addMsg("assistant", errMsg)
    speak(errMsg)
  }
}

// ── Reconnaissance vocale ─────────────────────────────────────
const startListening = () => {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    addMsg("assistant", ui.value.noMic)
    return
  }
  synth.cancel()  // Arrêter la synthèse en cours
  const SR      = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition   = new SR()
  recognition.lang            = langCode.value
  recognition.continuous      = false
  recognition.interimResults  = true

  recognition.onstart  = () => { isListening.value = true; transcript.value = "" }
  recognition.onresult = (e) => {
    let interim = "", final = ""
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      e.results[i].isFinal ? (final += t) : (interim += t)
    }
    transcript.value = final || interim
    if (final) { recognition.stop(); sendMessage(final) }
  }
  recognition.onerror = () => { isListening.value = false }
  recognition.onend   = () => { isListening.value = false; transcript.value = "" }
  recognition.start()
}

const stopListening = () => { recognition?.stop(); isListening.value = false }

// ── Ouvrir l'assistant ────────────────────────────────────────
const openAssistant = () => {
  isOpen.value = true
  if (conversation.value.length === 0) {
    setTimeout(() => {
      addMsg("assistant", ui.value.welcome)
      speak(ui.value.welcome)
    }, 300)
  }
}

// ── Envoyer via clavier ───────────────────────────────────────
const sendText = () => {
  if (textInput.value.trim()) {
    sendMessage(textInput.value.trim())
    textInput.value = ""
  }
}

const onKeyEnter = (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText() }
}

onUnmounted(() => {
  recognition?.stop()
  synth.cancel()
})
</script>

<template>
<div class="vac-root">

  <!-- BOUTON FLOTTANT -->
  <button class="vac-fab" :class="{ active: isOpen, listening: isListening }" @click="openAssistant" title="Assistant vocal">
    <span v-if="isListening">🎙️</span>
    <span v-else-if="isSpeaking">🔊</span>
    <span v-else>🤖</span>
    <span v-if="isListening" class="vac-fab-ring"></span>
  </button>

  <!-- PANEL -->
  <Transition name="vac-slide">
    <div v-if="isOpen" class="vac-panel">

      <!-- Header -->
      <div class="vac-header">
        <div class="vac-header-left">
          <div class="vac-avatar">🤖</div>
          <div>
            <div class="vac-title">{{ ui.title }}</div>
            <div class="vac-subtitle">{{ storeName }}</div>
          </div>
        </div>
        <div class="vac-header-right">
          <span class="vac-status-dot" :class="{ listening: isListening, speaking: isSpeaking, loading: isLoading }"></span>
          <button class="vac-close" @click="isOpen = false">✕</button>
        </div>
      </div>

      <!-- CONVERSATION -->
      <div class="vac-messages" ref="convEl">

        <div v-for="(msg, i) in conversation" :key="i" class="vac-msg" :class="msg.role">
          <div class="vac-msg-avatar">{{ msg.role === "user" ? "👤" : "🤖" }}</div>
          <div class="vac-msg-content">
            <p>{{ msg.content }}</p>
            <span class="vac-msg-time">{{ msg.time }}</span>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="vac-loading">
          <div class="vac-dots"><span></span><span></span><span></span></div>
          <span>{{ ui.loading }}</span>
        </div>

        <!-- Transcript en cours -->
        <div v-if="transcript" class="vac-interim">
          <span class="vac-interim-icon">🎤</span> {{ transcript }}
        </div>

      </div>

      <!-- FORMULAIRE REQUÊTE -->
      <Transition name="vac-req">
        <div v-if="showRequestForm" class="vac-req-form">
          <div class="vac-req-header">
            <span>📝</span>
            <div>
              <div class="vac-req-title">{{ ui.reqTitle }}</div>
              <div class="vac-req-sub">{{ ui.reqSubtitle }}</div>
            </div>
          </div>
          <div class="vac-req-fields">
            <input v-model="requestForm.nom"       :placeholder="ui.reqNom"   class="vac-input" />
            <input v-model="requestForm.email"      :placeholder="ui.reqEmail" class="vac-input" type="email" />
            <input v-model="requestForm.telephone"  :placeholder="ui.reqTel"   class="vac-input" type="tel" />
            <input v-model="requestForm.adresse"    :placeholder="ui.reqAdr"   class="vac-input" />
            <textarea v-model="requestForm.question" :placeholder="ui.reqQ" class="vac-input vac-textarea" rows="3"></textarea>
          </div>
          <div v-if="storeEmail" class="vac-req-email">
            📧 {{ ui.reqEmail2 }}
          </div>
          <div class="vac-req-actions">
            <button class="vac-btn-cancel" @click="showRequestForm = false">{{ ui.reqNo }}</button>
            <button class="vac-btn-confirm" @click="confirmRequest" :disabled="!requestForm.question">
              {{ ui.reqConfirm }}
            </button>
          </div>
        </div>
      </Transition>

      <!-- CONFIRMATION OUI/NON -->
      <div v-if="requestConfirmed" class="vac-confirm-banner">
        <span>🔁</span>
        <span>{{ ui.reqConfirm }}</span>
        <div class="vac-confirm-btns">
          <button class="vac-btn-yes" @click="saveRequest">{{ ui.reqYes }}</button>
          <button class="vac-btn-no"  @click="requestConfirmed = false; addMsg('assistant', ui.reqEmail2)">{{ ui.reqNo }}</button>
        </div>
      </div>

      <!-- SAUVEGARDE OK -->
      <div v-if="requestSaved" class="vac-saved-banner">
        ✅ {{ ui.reqSaved }}
      </div>

      <!-- INPUT CLAVIER + MIC -->
      <div class="vac-input-row">
        <button
          class="vac-mic"
          :class="{ active: isListening }"
          @click="isListening ? stopListening() : startListening()"
          :title="isListening ? ui.stop : ui.listen"
        >
          <span v-if="isListening">⏹</span>
          <span v-else>🎤</span>
          <span v-if="isListening" class="vac-wave"><span></span><span></span><span></span></span>
        </button>

        <textarea
          v-model="textInput"
          :placeholder="ui.placeholder"
          class="vac-text-input"
          rows="1"
          @keydown="onKeyEnter"
        ></textarea>

        <button class="vac-send" @click="sendText" :disabled="!textInput.trim() || isLoading">
          ➤
        </button>
      </div>

      <div class="vac-status-bar">
        <span :class="{ 'vac-status-active': isListening }">
          {{ isListening ? ui.listening : isSpeaking ? ui.speaking : isLoading ? ui.loading : ui.waiting }}
        </span>
      </div>

    </div>
  </Transition>
</div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

/* ROOT */
.vac-root{position:fixed;bottom:24px;left:24px;z-index:9999;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;align-items:flex-start;gap:10px}

/* FAB */
.vac-fab{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;font-size:24px;background:linear-gradient(135deg,#6c63ff,#a78bfa);box-shadow:0 4px 20px rgba(108,99,255,.45);display:flex;align-items:center;justify-content:center;position:relative;transition:all .25s;outline:none}
.vac-fab:hover{transform:scale(1.1)}
.vac-fab.active{border-radius:16px}
.vac-fab.listening{background:linear-gradient(135deg,#ef4444,#f97316);animation:vac-pulse-fab .7s infinite alternate}
@keyframes vac-pulse-fab{to{transform:scale(1.1)}}
.vac-fab-ring{position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(239,68,68,.4);animation:vac-ring 1s ease-out infinite}
@keyframes vac-ring{to{transform:scale(1.5);opacity:0}}

/* PANEL */
.vac-panel{width:340px;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.18);border:1px solid #e5e7eb;display:flex;flex-direction:column;max-height:580px;overflow:hidden}
.vac-slide-enter-active,.vac-slide-leave-active{transition:all .3s cubic-bezier(.34,1.56,.64,1)}
.vac-slide-enter-from,.vac-slide-leave-to{opacity:0;transform:translateY(20px) scale(.95)}

/* HEADER */
.vac-header{background:linear-gradient(135deg,#6c63ff,#a78bfa);padding:14px 16px;display:flex;align-items:center;justify-content:space-between}
.vac-header-left{display:flex;align-items:center;gap:10px}
.vac-avatar{font-size:28px;line-height:1}
.vac-title{font-size:14px;font-weight:700;color:white}
.vac-subtitle{font-size:11px;color:rgba(255,255,255,.75)}
.vac-header-right{display:flex;align-items:center;gap:8px}
.vac-status-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.4);transition:all .3s}
.vac-status-dot.listening{background:#ef4444;animation:vac-blink .6s infinite}
.vac-status-dot.speaking{background:#10b981}
.vac-status-dot.loading{background:#fbbf24;animation:vac-blink .8s infinite}
@keyframes vac-blink{50%{opacity:.3}}
.vac-close{background:rgba(255,255,255,.2);border:none;color:white;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center}

/* MESSAGES */
.vac-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;max-height:260px;scrollbar-width:thin;scrollbar-color:#e5e7eb transparent}
.vac-msg{display:flex;gap:8px;align-items:flex-end}
.vac-msg.user{flex-direction:row-reverse}
.vac-msg-avatar{font-size:18px;flex-shrink:0;line-height:1}
.vac-msg-content{max-width:230px}
.vac-msg.assistant .vac-msg-content{background:#f3f4f6;border-radius:14px 14px 14px 4px;padding:10px 14px}
.vac-msg.user .vac-msg-content{background:linear-gradient(135deg,#6c63ff,#a78bfa);border-radius:14px 14px 4px 14px;padding:10px 14px}
.vac-msg.user .vac-msg-content p{color:white}
.vac-msg-content p{font-size:13px;line-height:1.55;color:#374151}
.vac-msg-time{font-size:10px;color:#9ca3af;display:block;margin-top:3px}
.vac-msg.user .vac-msg-time{color:rgba(255,255,255,.6)}

/* LOADING DOTS */
.vac-loading{display:flex;align-items:center;gap:8px;padding:6px 0}
.vac-dots{display:flex;gap:4px}
.vac-dots span{width:7px;height:7px;border-radius:50%;background:#6c63ff;animation:vac-dot .9s infinite}
.vac-dots span:nth-child(2){animation-delay:.2s}
.vac-dots span:nth-child(3){animation-delay:.4s}
@keyframes vac-dot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
.vac-loading span{font-size:12px;color:#9ca3af}
.vac-interim{background:rgba(108,99,255,.08);border:1px solid rgba(108,99,255,.2);border-radius:8px;padding:8px 12px;font-size:12px;color:#6c63ff;display:flex;align-items:center;gap:6px;font-style:italic}

/* FORMULAIRE REQUÊTE */
.vac-req-form{background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;display:flex;flex-direction:column;gap:10px}
.vac-req-header{display:flex;align-items:center;gap:8px}
.vac-req-header span{font-size:22px}
.vac-req-title{font-size:13px;font-weight:700;color:#111}
.vac-req-sub{font-size:11px;color:#6b7280}
.vac-req-fields{display:flex;flex-direction:column;gap:6px}
.vac-input{width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;background:white;color:#374151}
.vac-input:focus{border-color:#6c63ff}
.vac-textarea{resize:none;min-height:60px}
.vac-req-email{font-size:11px;color:#6b7280;padding:4px 0}
.vac-req-actions{display:flex;gap:8px}
.vac-btn-cancel{flex:1;padding:9px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif;color:#374151}
.vac-btn-confirm{flex:2;padding:9px;background:#6c63ff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;color:white}
.vac-btn-confirm:disabled{opacity:.4;cursor:not-allowed}

/* CONFIRMATION */
.vac-confirm-banner{background:#fffbeb;border-top:1px solid #fde68a;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.vac-confirm-banner span:first-child{font-size:20px}
.vac-confirm-banner span:nth-child(2){font-size:13px;color:#92400e;font-weight:500}
.vac-confirm-btns{display:flex;gap:8px}
.vac-btn-yes{flex:1;padding:8px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif}
.vac-btn-no{flex:1;padding:8px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif}

/* SAUVEGARDÉ */
.vac-saved-banner{background:#ecfdf5;border-top:1px solid #a7f3d0;padding:10px 14px;font-size:13px;color:#065f46;font-weight:600;text-align:center}

/* INPUT ROW */
.vac-input-row{display:flex;align-items:flex-end;gap:6px;padding:10px 12px;border-top:1px solid #e5e7eb}
.vac-mic{width:38px;height:38px;flex-shrink:0;border-radius:50%;border:2px solid #e5e7eb;background:white;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;position:relative;transition:all .2s}
.vac-mic.active{background:#ef4444;border-color:#ef4444;color:white}
.vac-mic:hover{border-color:#6c63ff}
.vac-wave{position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(239,68,68,.4);animation:vac-ring 1s infinite}
.vac-text-input{flex:1;resize:none;border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;line-height:1.4;max-height:80px;overflow-y:auto}
.vac-text-input:focus{border-color:#6c63ff}
.vac-send{width:36px;height:36px;flex-shrink:0;border-radius:50%;border:none;background:#6c63ff;color:white;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s}
.vac-send:hover{background:#5b52ee}
.vac-send:disabled{opacity:.4;cursor:not-allowed}

/* STATUS BAR */
.vac-status-bar{padding:4px 14px 8px;text-align:center}
.vac-status-bar span{font-size:10px;color:#9ca3af;font-family:'DM Sans',sans-serif}
.vac-status-active{color:#ef4444 !important;font-weight:600}

/* REQ TRANSITION */
.vac-req-enter-active,.vac-req-leave-active{transition:all .3s ease}
.vac-req-enter-from,.vac-req-leave-to{opacity:0;transform:translateY(10px)}
</style>
