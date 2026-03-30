<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { db, auth } from "../firebase.js"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

/* ================= SITE ================= */
const site = ref({
  pages: [
    {
      id: 1,
      name: "Accueil",
      style: {},
      sections: [
        { id: 1, type: "hero", content: "Créez votre site web\nen quelques minutes.", subtitle: "Une plateforme puissante, simple et élégante.", style: {} },
        { id: 2, type: "text", content: "Bienvenue sur notre plateforme. Commencez à construire votre présence en ligne dès aujourd'hui.", style: {} }
      ]
    }
  ]
})

const mode = ref("edit")
const currentPageIndex = ref(0)
const activeSectionIndex = ref(null)
const isSaved = ref(true)
const isSaving = ref(false)
const currentUser = ref(null)
const showPageMenu = ref(false)
const sidebarTab = ref("sections") // 'sections' | 'style' | 'pages'
const showNotif = ref(false)
const notifMsg = ref("")
const renamingPageIndex = ref(null)

/* ================= CURRENT PAGE ================= */
const currentPage = computed(() => site.value.pages[currentPageIndex.value] || site.value.pages[0])
const activeSection = computed(() => currentPage.value?.sections?.[activeSectionIndex.value])

/* ================= LOAD ================= */
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return
    currentUser.value = user

    try {
      const docRef = doc(db, "users", user.uid)
      const snap = await getDoc(docRef)
      if (snap.exists() && snap.data().siteData) {
        site.value = snap.data().siteData
      } else {
        // Fallback localStorage
        const saved = localStorage.getItem("siteDataPro")
        if (saved) site.value = JSON.parse(saved)
      }
    } catch (e) {
      console.error("Erreur chargement Firestore :", e)
      notify("Erreur de chargement. Données locales utilisées.")
      const saved = localStorage.getItem("siteDataPro")
      if (saved) site.value = JSON.parse(saved)
    }
  })
})

watch(site, () => { isSaved.value = false }, { deep: true })
watch(currentPageIndex, () => { activeSectionIndex.value = null })

/* ================= NOTIFICATIONS ================= */
const notify = (msg) => {
  notifMsg.value = msg
  showNotif.value = true
  setTimeout(() => showNotif.value = false, 2500)
}

/* ================= SAVE ================= */
const saveSite = async () => {
  if (!currentUser.value) {
    notify("⚠️ Vous devez être connecté pour sauvegarder.")
    return
  }
  if (isSaving.value) return

  isSaving.value = true
  try {
    const docRef = doc(db, "users", currentUser.value.uid)
    await setDoc(docRef, { siteData: site.value }, { merge: true })
    // Backup local aussi
    localStorage.setItem("siteDataPro", JSON.stringify(site.value))
    isSaved.value = true
    notify("Projet sauvegardé ✓")
  } catch (e) {
    console.error("Erreur sauvegarde Firestore :", e)
    notify("❌ Erreur de sauvegarde. Réessayez.")
  } finally {
    isSaving.value = false
  }
}

/* ================= PAGES ================= */
const goToPage = (i) => {
  currentPageIndex.value = i
  activeSectionIndex.value = null
  showPageMenu.value = false
}

const addPage = () => {
  site.value.pages.push({
    id: Date.now(),
    name: "Nouvelle page",
    style: {},
    sections: []
  })
  currentPageIndex.value = site.value.pages.length - 1
  renamingPageIndex.value = site.value.pages.length - 1
}

const deletePage = (i) => {
  if (site.value.pages.length === 1) {
    notify("Vous devez garder au moins une page.")
    return
  }
  site.value.pages.splice(i, 1)
  currentPageIndex.value = Math.max(0, Math.min(i, site.value.pages.length - 1))
  activeSectionIndex.value = null
}

/* ================= SECTIONS ================= */
const sectionTypes = [
  { key: "hero", label: "Hero", icon: "⚡", desc: "Titre principal + CTA" },
  { key: "text", label: "Texte", icon: "📝", desc: "Paragraphe libre" },
  { key: "image", label: "Image", icon: "🖼️", desc: "Photo ou illustration" },
  { key: "features", label: "Features", icon: "✦", desc: "Grille de fonctionnalités" },
  { key: "form", label: "Contact", icon: "✉️", desc: "Formulaire de contact" },
  { key: "divider", label: "Séparateur", icon: "—", desc: "Ligne décorative" },
]

const sectionDefaults = {
  hero: { type: "hero", content: "Votre titre principal ici.", subtitle: "Sous-titre accrocheur.", cta: "Commencer", style: {} },
  text: { type: "text", content: "Votre texte ici...", style: {} },
  image: { type: "image", url: "", alt: "", style: {} },
  features: { type: "features", items: [
    { icon: "⚡", title: "Rapide", desc: "Performance optimale" },
    { icon: "🔒", title: "Sécurisé", desc: "Données protégées" },
    { icon: "🎨", title: "Élégant", desc: "Design soigné" }
  ], style: {} },
  form: { type: "form", style: {} },
  divider: { type: "divider", style: {} }
}

const addSection = (key) => {
  currentPage.value.sections.push({ id: Date.now(), ...JSON.parse(JSON.stringify(sectionDefaults[key])) })
}

const deleteSection = (i) => {
  currentPage.value.sections.splice(i, 1)
  activeSectionIndex.value = null
}

const moveSection = (i, dir) => {
  const arr = currentPage.value.sections
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

/* ================= IMAGE ================= */
const uploadImage = (e, section) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { section.url = ev.target.result }
  reader.readAsDataURL(file)
}

/* ================= STYLE ================= */
const setStyle = (type, value) => {
  if (!activeSection.value) return
  activeSection.value.style ||= {}
  const s = activeSection.value.style
  if (type === "bold") s.fontWeight = s.fontWeight === "bold" ? "normal" : "bold"
  if (type === "italic") s.fontStyle = s.fontStyle === "italic" ? "normal" : "italic"
  if (type === "color") s.color = value
  if (type === "align") s.textAlign = value
  if (type === "fontSize") s.fontSize = value
  if (type === "bg") s.backgroundColor = value
}

const setPageStyle = (type, value) => {
  currentPage.value.style ||= {}
  if (type === "bg") currentPage.value.style.backgroundColor = value
  if (type === "color") currentPage.value.style.color = value
  if (type === "fontFamily") currentPage.value.style.fontFamily = value
}
</script>

<template>
<div class="saas-root">

  <!-- ======= NOTIFICATION ======= -->
  <Transition name="notif">
    <div v-if="showNotif" class="notif">{{ notifMsg }}</div>
  </Transition>

  <!-- ======= TOP BAR ======= -->
  <header class="topbar">
    <div class="topbar-brand">
      <span class="brand-icon">◈</span>
      <span class="brand-name">Webcraft</span>
      <span class="brand-badge">Pro</span>
    </div>

    <!-- PAGE TABS -->
    <nav class="page-tabs">
      <button
        v-for="(p, i) in site.pages"
        :key="p.id"
        class="page-tab"
        :class="{ active: currentPageIndex === i }"
        @click="goToPage(i)"
        @dblclick="renamingPageIndex = i"
      >
        <span v-if="renamingPageIndex !== i">{{ p.name }}</span>
        <input
          v-else
          v-model="p.name"
          class="page-tab-input"
          @blur="renamingPageIndex = null"
          @keydown.enter="renamingPageIndex = null"
          @click.stop
          autofocus
        />
        <span
          v-if="renamingPageIndex !== i && site.pages.length > 1"
          class="tab-del"
          @click.stop="deletePage(i)"
        >×</span>
      </button>
      <button class="page-tab add-tab" @click="addPage" title="Nouvelle page">+</button>
    </nav>

    <div class="topbar-actions">
      <span class="save-status" :class="{ saved: isSaved }">{{ isSaved ? '✓ Sauvegardé' : '● Non sauvegardé' }}</span>
      <button class="btn-action" @click="saveSite" :disabled="isSaving || !currentUser" :class="{ saving: isSaving }">
        <span v-if="isSaving" class="spinner"/>
        <span>{{ isSaving ? 'Sauvegarde...' : !currentUser ? 'Non connecté' : 'Sauvegarder' }}</span>
      </button>
      <button class="btn-action primary" @click="mode = mode === 'preview' ? 'edit' : 'preview'">
        {{ mode === 'preview' ? '✏ Éditer' : '▶ Aperçu' }}
      </button>
    </div>
  </header>

  <!-- ======= WORKSPACE ======= -->
  <div class="workspace">

    <!-- ---- SIDEBAR ---- -->
    <aside v-if="mode === 'edit'" class="sidebar">
      <div class="sidebar-tabs">
        <button :class="{ active: sidebarTab === 'sections' }" @click="sidebarTab = 'sections'">Sections</button>
        <button :class="{ active: sidebarTab === 'style' }" @click="sidebarTab = 'style'">Style</button>
      </div>

      <!-- SECTIONS TAB -->
      <div v-if="sidebarTab === 'sections'" class="sidebar-content">
        <p class="sidebar-label">Ajouter une section</p>
        <div class="section-grid">
          <button
            v-for="st in sectionTypes"
            :key="st.key"
            class="section-card"
            @click="addSection(st.key)"
          >
            <span class="sc-icon">{{ st.icon }}</span>
            <span class="sc-label">{{ st.label }}</span>
            <span class="sc-desc">{{ st.desc }}</span>
          </button>
        </div>

        <div v-if="activeSection" class="prop-panel">
          <p class="sidebar-label" style="margin-top:20px">Propriétés</p>

          <!-- Text styling -->
          <div v-if="activeSection.type === 'text' || activeSection.type === 'hero'" class="prop-row">
            <label>Typographie</label>
            <div class="style-btns">
              <button
                :class="{ on: activeSection.style?.fontWeight === 'bold' }"
                @click="setStyle('bold')"
              ><b>B</b></button>
              <button
                :class="{ on: activeSection.style?.fontStyle === 'italic' }"
                @click="setStyle('italic')"
              ><i>I</i></button>
              <button @click="setStyle('align', 'left')">⬛</button>
              <button @click="setStyle('align', 'center')">☰</button>
              <button @click="setStyle('align', 'right')">⬛</button>
            </div>
          </div>

          <div class="prop-row">
            <label>Couleur texte</label>
            <input type="color" :value="activeSection.style?.color || '#111111'" @input="setStyle('color', $event.target.value)" class="color-input"/>
          </div>

          <div class="prop-row">
            <label>Fond de section</label>
            <input type="color" :value="activeSection.style?.backgroundColor || '#ffffff'" @input="setStyle('bg', $event.target.value)" class="color-input"/>
          </div>

          <div class="prop-row" v-if="activeSection.type === 'text' || activeSection.type === 'hero'">
            <label>Taille de police</label>
            <select @change="setStyle('fontSize', $event.target.value)" class="prop-select">
              <option value="">Auto</option>
              <option value="14px">Petite</option>
              <option value="18px">Normale</option>
              <option value="24px">Grande</option>
              <option value="36px">Très grande</option>
            </select>
          </div>
        </div>
      </div>

      <!-- STYLE TAB -->
      <div v-if="sidebarTab === 'style'" class="sidebar-content">
        <p class="sidebar-label">Style de la page</p>

        <div class="prop-row">
          <label>Couleur de fond</label>
          <input type="color" :value="currentPage.style?.backgroundColor || '#ffffff'" @input="setPageStyle('bg', $event.target.value)" class="color-input"/>
        </div>

        <div class="prop-row">
          <label>Couleur du texte</label>
          <input type="color" :value="currentPage.style?.color || '#111111'" @input="setPageStyle('color', $event.target.value)" class="color-input"/>
        </div>

        <div class="prop-row">
          <label>Police</label>
          <select @change="setPageStyle('fontFamily', $event.target.value)" class="prop-select">
            <option value="">Par défaut</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
            <option value="Verdana, sans-serif">Verdana</option>
          </select>
        </div>
      </div>
    </aside>

    <!-- ---- CANVAS ---- -->
    <main class="canvas" :class="{ preview: mode === 'preview' }">
      <div class="canvas-inner" :style="currentPage?.style">

        <!-- EDIT MODE -->
        <template v-if="mode === 'edit'">
          <div v-if="!currentPage.sections.length" class="empty-page">
            <span>✦</span>
            <p>Cette page est vide.</p>
            <p>Ajoutez une section depuis le panneau gauche.</p>
          </div>

          <div
            v-for="(s, i) in currentPage.sections"
            :key="s.id"
            class="section-block"
            :class="{ 'is-active': activeSectionIndex === i }"
            @click="activeSectionIndex = i"
          >
            <!-- SECTION ACTIONS -->
            <div class="section-actions">
              <button @click.stop="moveSection(i, -1)" :disabled="i === 0" title="Monter">↑</button>
              <button @click.stop="moveSection(i, 1)" :disabled="i === currentPage.sections.length - 1" title="Descendre">↓</button>
              <button @click.stop="deleteSection(i)" class="del-btn" title="Supprimer">✕</button>
            </div>

            <!-- HERO -->
            <div v-if="s.type === 'hero'" class="sec-hero" :style="s.style">
              <textarea v-model="s.content" class="hero-title-input" placeholder="Titre principal..."/>
              <input v-model="s.subtitle" class="hero-sub-input" placeholder="Sous-titre..."/>
              <input v-model="s.cta" class="hero-cta-input" placeholder="Bouton CTA..."/>
            </div>

            <!-- TEXT -->
            <div v-else-if="s.type === 'text'" class="sec-text" :style="s.style">
              <textarea v-model="s.content" class="text-input" placeholder="Votre texte ici..."/>
            </div>

            <!-- IMAGE -->
            <div v-else-if="s.type === 'image'" class="sec-image" :style="s.style">
              <label class="img-drop" v-if="!s.url">
                <input type="file" accept="image/*" @change="uploadImage($event, s)" hidden/>
                <span>🖼</span>
                <span>Cliquez pour charger une image</span>
              </label>
              <div v-else class="img-preview-wrap">
                <img :src="s.url" class="img-preview" :alt="s.alt"/>
                <div class="img-overlay">
                  <label class="btn-action" style="cursor:pointer">
                    <input type="file" accept="image/*" @change="uploadImage($event, s)" hidden/>
                    Changer l'image
                  </label>
                  <input v-model="s.alt" placeholder="Texte alternatif..." class="alt-input"/>
                </div>
              </div>
            </div>

            <!-- FEATURES -->
            <div v-else-if="s.type === 'features'" class="sec-features" :style="s.style">
              <div class="features-grid">
                <div v-for="(item, fi) in s.items" :key="fi" class="feature-item">
                  <input v-model="item.icon" class="feat-icon-input"/>
                  <input v-model="item.title" class="feat-title-input" placeholder="Titre..."/>
                  <input v-model="item.desc" class="feat-desc-input" placeholder="Description..."/>
                </div>
              </div>
            </div>

            <!-- FORM -->
            <div v-else-if="s.type === 'form'" class="sec-form" :style="s.style">
              <p class="form-label-heading">Formulaire de contact</p>
              <div class="form-fields">
                <input placeholder="Nom complet" disabled class="form-field"/>
                <input placeholder="Adresse email" disabled class="form-field"/>
                <textarea placeholder="Votre message..." disabled class="form-field form-textarea"/>
                <button disabled class="form-submit">Envoyer →</button>
              </div>
            </div>

            <!-- DIVIDER -->
            <div v-else-if="s.type === 'divider'" class="sec-divider" :style="s.style">
              <div class="divider-line"/>
            </div>

          </div>
        </template>

        <!-- PREVIEW MODE -->
        <template v-else>
          <div class="preview-mode">
            <div
              v-for="s in currentPage.sections"
              :key="s.id"
              class="preview-section"
            >
              <!-- HERO -->
              <div v-if="s.type === 'hero'" class="prev-hero" :style="s.style">
                <h1 class="prev-hero-title">{{ s.content }}</h1>
                <p class="prev-hero-sub">{{ s.subtitle }}</p>
                <button v-if="s.cta" class="prev-hero-cta">{{ s.cta }}</button>
              </div>

              <!-- TEXT -->
              <div v-else-if="s.type === 'text'" class="prev-text" :style="s.style">
                <p>{{ s.content }}</p>
              </div>

              <!-- IMAGE -->
              <div v-else-if="s.type === 'image'" class="prev-image" :style="s.style">
                <img v-if="s.url" :src="s.url" :alt="s.alt" class="prev-img"/>
                <div v-else class="prev-img-placeholder">Image non définie</div>
              </div>

              <!-- FEATURES -->
              <div v-else-if="s.type === 'features'" class="prev-features" :style="s.style">
                <div class="prev-features-grid">
                  <div v-for="(item, fi) in s.items" :key="fi" class="prev-feature-card">
                    <span class="prev-feat-icon">{{ item.icon }}</span>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.desc }}</p>
                  </div>
                </div>
              </div>

              <!-- FORM -->
              <div v-else-if="s.type === 'form'" class="prev-form" :style="s.style">
                <h3>Contactez-nous</h3>
                <input placeholder="Nom complet" class="prev-form-field"/>
                <input placeholder="Email" class="prev-form-field"/>
                <textarea placeholder="Message..." class="prev-form-field prev-form-ta"></textarea>
                <button class="prev-form-btn">Envoyer →</button>
              </div>

              <!-- DIVIDER -->
              <div v-else-if="s.type === 'divider'" class="prev-divider" :style="s.style">
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

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f0f11;
  --surface: #17171a;
  --surface2: #1f1f23;
  --border: #2a2a2f;
  --border2: #35353c;
  --accent: #6c63ff;
  --accent2: #a78bfa;
  --text: #f0f0f0;
  --text2: #8a8a9a;
  --text3: #5a5a6a;
  --green: #22c55e;
  --red: #ef4444;
  --radius: 8px;
  --sidebar-w: 260px;
  --topbar-h: 56px;
}

body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

.saas-root { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }

/* ===== NOTIFICATION ===== */
.notif {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: #22c55e; color: white; padding: 10px 24px;
  border-radius: 100px; font-size: 14px; font-weight: 500;
  z-index: 9999; box-shadow: 0 8px 24px rgba(34,197,94,.35);
}
.notif-enter-active, .notif-leave-active { transition: all .3s ease; }
.notif-enter-from, .notif-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }

/* ===== TOPBAR ===== */
.topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 0; padding: 0 16px;
}

.topbar-brand {
  display: flex; align-items: center; gap: 8px;
  min-width: var(--sidebar-w); padding-right: 16px;
  border-right: 1px solid var(--border);
}
.brand-icon { font-size: 20px; color: var(--accent); }
.brand-name { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 600; letter-spacing: -.3px; }
.brand-badge { background: var(--accent); color: white; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 100px; text-transform: uppercase; letter-spacing: .5px; }

.page-tabs {
  flex: 1; display: flex; align-items: center; gap: 2px;
  padding: 0 16px; overflow-x: auto; scrollbar-width: none;
}
.page-tabs::-webkit-scrollbar { display: none; }

.page-tab {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid transparent;
  color: var(--text2); font-size: 13px; padding: 5px 12px;
  border-radius: var(--radius); cursor: pointer; white-space: nowrap;
  transition: all .15s;
  font-family: 'DM Sans', sans-serif;
}
.page-tab:hover { background: var(--surface2); color: var(--text); }
.page-tab.active { background: var(--surface2); color: var(--text); border-color: var(--border2); }
.page-tab.add-tab { color: var(--accent); font-size: 16px; padding: 3px 10px; }
.tab-del { opacity: 0; font-size: 12px; color: var(--text3); transition: opacity .15s; margin-left: 4px; }
.page-tab:hover .tab-del { opacity: 1; }
.page-tab-input {
  background: transparent; border: none; color: var(--text);
  font-size: 13px; font-family: 'DM Sans', sans-serif;
  outline: 1px solid var(--accent); border-radius: 4px;
  padding: 1px 4px; min-width: 80px; max-width: 140px;
}

.topbar-actions {
  display: flex; align-items: center; gap: 10px;
  padding-left: 16px; border-left: 1px solid var(--border);
}
.save-status { font-size: 12px; color: var(--text3); white-space: nowrap; }
.save-status.saved { color: var(--green); }

.btn-action {
  background: var(--surface2); border: 1px solid var(--border2);
  color: var(--text); font-size: 13px; font-weight: 500;
  padding: 6px 14px; border-radius: var(--radius); cursor: pointer;
  transition: all .15s; font-family: 'DM Sans', sans-serif;
}
.btn-action:hover { background: var(--border2); }
.btn-action.primary {
  background: var(--accent); border-color: var(--accent);
  color: white;
}
.btn-action.primary:hover { background: #7c73ff; }

.btn-action:disabled {
  opacity: .45; cursor: not-allowed;
}
.btn-action.saving { opacity: .8; }

.spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: white; border-radius: 50%;
  animation: spin .6s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

.btn-action { display: flex; align-items: center; gap: 6px; }

/* ===== WORKSPACE ===== */
.workspace {
  display: flex;
  margin-top: var(--topbar-h);
  min-height: calc(100vh - var(--topbar-h));
}

/* ===== SIDEBAR ===== */
.sidebar {
  width: var(--sidebar-w); flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  position: sticky; top: var(--topbar-h);
  height: calc(100vh - var(--topbar-h));
  overflow-y: auto; scrollbar-width: thin;
  scrollbar-color: var(--border2) transparent;
}

.sidebar-tabs {
  display: flex; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-tabs button {
  flex: 1; padding: 12px; font-size: 13px; font-weight: 500;
  background: transparent; border: none; color: var(--text2);
  cursor: pointer; transition: all .15s;
  font-family: 'DM Sans', sans-serif;
  border-bottom: 2px solid transparent;
}
.sidebar-tabs button.active { color: var(--text); border-bottom-color: var(--accent); }

.sidebar-content { padding: 16px; flex: 1; }
.sidebar-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text3); margin-bottom: 10px; }

.section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.section-card {
  display: flex; flex-direction: column; gap: 2px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px 8px;
  cursor: pointer; transition: all .15s; text-align: left;
}
.section-card:hover { border-color: var(--accent); background: rgba(108,99,255,.08); }
.sc-icon { font-size: 16px; }
.sc-label { font-size: 12px; font-weight: 600; color: var(--text); }
.sc-desc { font-size: 10px; color: var(--text3); line-height: 1.4; }

/* PROPS PANEL */
.prop-panel { border-top: 1px solid var(--border); padding-top: 16px; }
.prop-row { margin-bottom: 14px; }
.prop-row label { display: block; font-size: 11px; color: var(--text2); margin-bottom: 6px; font-weight: 500; }
.style-btns { display: flex; gap: 4px; flex-wrap: wrap; }
.style-btns button {
  background: var(--surface2); border: 1px solid var(--border2);
  color: var(--text2); font-size: 13px; padding: 4px 10px;
  border-radius: 4px; cursor: pointer; transition: all .15s;
  font-family: 'DM Sans', sans-serif;
}
.style-btns button:hover { background: var(--border2); color: var(--text); }
.style-btns button.on { background: var(--accent); border-color: var(--accent); color: white; }
.color-input { width: 40px; height: 30px; border: 1px solid var(--border2); border-radius: 4px; cursor: pointer; background: none; padding: 2px; }
.prop-select {
  width: 100%; background: var(--surface2); border: 1px solid var(--border2);
  color: var(--text); font-size: 13px; padding: 7px 10px;
  border-radius: var(--radius); cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}

/* ===== CANVAS ===== */
.canvas {
  flex: 1; background: #0a0a0c;
  padding: 32px; display: flex; justify-content: center;
  overflow-y: auto;
}
.canvas.preview { padding: 0; background: white; }

.canvas-inner {
  width: 100%; max-width: 900px;
  min-height: 600px; background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,.6);
}
.canvas.preview .canvas-inner {
  max-width: 100%; border-radius: 0;
  min-height: 100vh; box-shadow: none;
}

.empty-page {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 20px; color: #999; text-align: center; gap: 8px;
}
.empty-page span { font-size: 32px; opacity: .4; }
.empty-page p { font-size: 14px; }

/* ===== SECTION BLOCKS ===== */
.section-block {
  position: relative; border: 2px solid transparent;
  cursor: pointer; transition: border-color .15s;
}
.section-block:hover { border-color: rgba(108,99,255,.3); }
.section-block.is-active { border-color: var(--accent) !important; }

.section-actions {
  position: absolute; top: 8px; right: 8px;
  display: flex; gap: 4px; z-index: 10;
  opacity: 0; transition: opacity .15s;
}
.section-block:hover .section-actions,
.section-block.is-active .section-actions { opacity: 1; }

.section-actions button {
  background: #fff; border: 1px solid #ddd;
  border-radius: 4px; width: 28px; height: 28px;
  font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #555; transition: all .15s;
}
.section-actions button:hover { background: #f0f0f0; }
.section-actions button.del-btn:hover { background: #fef2f2; color: var(--red); border-color: #fecaca; }
.section-actions button:disabled { opacity: .3; cursor: default; }

/* ---- SECTION TYPES (EDIT) ---- */
.sec-hero {
  padding: 60px 40px;
  background: linear-gradient(135deg, #f8f7ff 0%, #ede9fe 100%);
  display: flex; flex-direction: column; gap: 12px;
  align-items: flex-start;
}
.hero-title-input {
  width: 100%; font-family: 'Playfair Display', serif;
  font-size: 42px; font-weight: 600; color: #1a1a2e;
  border: none; background: transparent; resize: none;
  line-height: 1.2; outline: none; min-height: 100px;
}
.hero-sub-input {
  width: 100%; font-size: 18px; color: #555; background: transparent;
  border: none; outline: none; border-bottom: 1px dashed rgba(108,99,255,.4);
  padding-bottom: 4px;
}
.hero-cta-input {
  font-size: 14px; background: #6c63ff; color: white;
  border: none; outline: none; border-radius: 8px;
  padding: 10px 24px; font-weight: 600; font-family: 'DM Sans', sans-serif;
  margin-top: 8px; cursor: text;
}

.sec-text { padding: 32px 40px; }
.text-input {
  width: 100%; min-height: 120px; resize: vertical;
  border: 1px dashed #d1d5db; border-radius: 6px;
  padding: 12px; font-size: 16px; line-height: 1.7;
  color: #374151; outline: none; background: #fafafa;
  font-family: 'DM Sans', sans-serif;
  transition: border-color .15s;
}
.text-input:focus { border-color: var(--accent); background: white; }

.sec-image { padding: 20px 40px; }
.img-drop {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; border: 2px dashed #d1d5db; border-radius: 12px;
  padding: 50px 20px; cursor: pointer; color: #9ca3af;
  transition: all .15s;
}
.img-drop:hover { border-color: var(--accent); color: #6c63ff; background: rgba(108,99,255,.04); }
.img-drop span:first-child { font-size: 32px; }
.img-drop span:last-child { font-size: 14px; }
.img-preview-wrap { position: relative; }
.img-preview { width: 100%; border-radius: 8px; display: block; }
.img-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,.5);
  border-radius: 8px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  opacity: 0; transition: opacity .2s;
}
.img-preview-wrap:hover .img-overlay { opacity: 1; }
.alt-input {
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3);
  color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px;
  text-align: center; outline: none; width: 200px;
  font-family: 'DM Sans', sans-serif;
}

.sec-features { padding: 40px 40px; }
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.feature-item {
  background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 10px;
  padding: 16px; display: flex; flex-direction: column; gap: 6px;
}
.feat-icon-input { font-size: 24px; background: transparent; border: none; outline: none; width: 40px; }
.feat-title-input {
  font-weight: 600; font-size: 15px; background: transparent;
  border: none; border-bottom: 1px dashed #d1d5db; outline: none;
  color: #1a1a2e; font-family: 'DM Sans', sans-serif; padding-bottom: 4px;
}
.feat-desc-input {
  font-size: 13px; color: #6b7280; background: transparent;
  border: none; outline: none; font-family: 'DM Sans', sans-serif;
}

.sec-form { padding: 40px 40px; }
.form-label-heading { font-size: 18px; font-weight: 600; color: #1a1a2e; margin-bottom: 16px; font-family: 'Playfair Display', serif; }
.form-fields { display: flex; flex-direction: column; gap: 10px; max-width: 480px; }
.form-field {
  padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 14px; color: #374151; background: #f9fafb;
  font-family: 'DM Sans', sans-serif;
}
.form-textarea { min-height: 100px; resize: none; }
.form-submit {
  background: #6c63ff; color: white; border: none; border-radius: 8px;
  padding: 11px 24px; font-weight: 600; font-size: 14px; cursor: default;
  font-family: 'DM Sans', sans-serif; align-self: flex-start;
}

.sec-divider { padding: 12px 40px; }
.divider-line { border: none; border-top: 1px solid #e5e7eb; }

/* ===== PREVIEW MODE ===== */
.preview-mode { font-family: 'DM Sans', sans-serif; }
.preview-section { }

.prev-hero {
  padding: 100px 60px; background: linear-gradient(135deg, #f8f7ff, #ede9fe);
  text-align: center;
}
.prev-hero-title {
  font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 600;
  color: #1a1a2e; line-height: 1.15; white-space: pre-line; margin-bottom: 16px;
}
.prev-hero-sub { font-size: 20px; color: #6b7280; margin-bottom: 32px; }
.prev-hero-cta {
  background: #6c63ff; color: white; border: none; border-radius: 10px;
  padding: 14px 32px; font-size: 16px; font-weight: 600; cursor: pointer;
  font-family: 'DM Sans', sans-serif; transition: transform .2s;
}
.prev-hero-cta:hover { transform: translateY(-2px); }

.prev-text { padding: 48px 60px; }
.prev-text p { font-size: 17px; line-height: 1.8; color: #374151; max-width: 720px; }

.prev-image { padding: 32px 60px; }
.prev-img { width: 100%; border-radius: 12px; }
.prev-img-placeholder {
  height: 200px; background: #f3f4f6; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #9ca3af; font-size: 14px;
}

.prev-features { padding: 60px; background: #fafafa; }
.prev-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 840px; margin: 0 auto; }
.prev-feature-card {
  background: white; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 28px 24px; text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
}
.prev-feat-icon { font-size: 32px; display: block; margin-bottom: 12px; }
.prev-feature-card strong { font-size: 16px; color: #111; display: block; margin-bottom: 6px; }
.prev-feature-card p { font-size: 14px; color: #6b7280; line-height: 1.5; }

.prev-form { padding: 60px; background: #f8f7ff; display: flex; flex-direction: column; align-items: center; }
.prev-form h3 { font-family: 'Playfair Display', serif; font-size: 30px; color: #1a1a2e; margin-bottom: 24px; }
.prev-form-field {
  width: 100%; max-width: 500px; padding: 12px 16px;
  border: 1px solid #e5e7eb; border-radius: 10px; font-size: 15px;
  margin-bottom: 12px; font-family: 'DM Sans', sans-serif;
  background: white; color: #374151;
}
.prev-form-ta { min-height: 120px; resize: none; }
.prev-form-btn {
  background: #6c63ff; color: white; border: none; border-radius: 10px;
  padding: 13px 28px; font-size: 15px; font-weight: 600; cursor: pointer;
  font-family: 'DM Sans', sans-serif; align-self: flex-start; margin-left: calc(50% - 250px);
}

.prev-divider { padding: 8px 60px; }
.prev-divider-line { border: none; border-top: 1px solid #e5e7eb; }
</style>
