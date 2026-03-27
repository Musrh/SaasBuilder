<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { auth, db } from "@/firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

import LogoSection from "../components/sections/LogoSection.vue"
import FooterSection from "../components/sections/FooterSection.vue"

/* ================= FIRESTORE ================= */
let userRef = null

onMounted(async () => {
  const user = auth.currentUser
  if (!user) return

  userRef = doc(db, "users", user.uid)

  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    await setDoc(userRef, {
      pageTitle: "Titre par défaut",
      mainContent: "Mon site créé avec mon builder",
      sections: [],
      template: "blank",
      createdAt: Date.now()
    })
  } else {
    const data = snap.data()
    pageTitle.value = data.pageTitle
    mainContent.value = data.mainContent
    sections.value = data.sections || []
    template.value = data.template || "blank"
  }
})

/* ================= STATE ================= */
const mode = ref("edit")
const sections = ref([])
const selectedSection = ref(null)
const selectedFile = ref(null)

const pageTitle = ref("Titre par défaut")
const mainContent = ref("Mon site créé avec mon builder")

const template = ref("blank")

/* ================= AVAILABLE SECTIONS ================= */
const availableSections = [
  { name: "Texte", type: "Text" },
  { name: "Titre", type: "Heading" },
  { name: "Paragraphe", type: "Paragraph" }
]

/* ================= TEMPLATES ================= */
const applyTemplate = (type) => {
  template.value = type

  if (type === "blank") {
    sections.value = []
  }

  if (type === "landing") {
    sections.value = [
      {
        id: Date.now(),
        type: "Heading",
        props: { title: "🚀 Welcome to my SaaS", color: "#000" }
      },
      {
        id: Date.now() + 1,
        type: "Paragraph",
        props: { title: "Build fast with your builder", color: "#555" }
      }
    ]
  }

  if (type === "portfolio") {
    sections.value = [
      {
        id: Date.now(),
        type: "Heading",
        props: { title: "My Portfolio", color: "#000" }
      }
    ]
  }
}

/* ================= AUTO SAVE FIRESTORE ================= */
watch(
  [sections, pageTitle, mainContent, template],
  async () => {
    if (!userRef) return

    await updateDoc(userRef, {
      sections: sections.value,
      pageTitle: pageTitle.value,
      mainContent: mainContent.value,
      template: template.value,
      updatedAt: Date.now()
    })
  },
  { deep: true }
)

/* ================= METHODS ================= */
const addSection = (sec) => {
  sections.value.push({
    id: Date.now(),
    type: sec.type,
    props: {
      title: "Nouveau contenu",
      color: "#000000"
    }
  })
}

const selectSection = (section) => {
  if (mode.value === "preview") return
  selectedSection.value = section
}

const deleteSection = (id) => {
  sections.value = sections.value.filter(s => s.id !== id)

  if (selectedSection.value?.id === id) {
    selectedSection.value = null
  }
}

/* TOOLS */
const applyBold = (section) => {
  section.props.title = `<b>${section.props.title}</b>`
}

const applyUppercase = (section) => {
  section.props.title = section.props.title.toUpperCase()
}

const applyEmoji = (section) => {
  section.props.title += " 😊"
}

const saveAndPreview = () => {
  selectedSection.value = null
  mode.value = "preview"
}

/* FILES */
const computedFiles = computed(() => {
  const base = [
    {
      name: "index.html",
      content: `<body>\n<h1>${pageTitle.value}</h1>\n${mainContent.value}\n</body>`
    },
    { name: "App.vue", content: "<template>App</template>" },
    { name: "MainSection.vue", content: "<template>Main</template>" }
  ]

  const dynamic = sections.value.map((s, i) => ({
    name: `${s.type}${i + 1}.vue`,
    content: `<template>\n  <div style='color:${s.props.color}'>${s.props.title}</div>\n</template>`,
    deletable: true,
    sectionId: s.id
  }))

  return [...base, ...dynamic]
})

const selectFile = (file) => {
  selectedFile.value = file
}
</script>
