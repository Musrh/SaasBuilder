<template>
  <div class="flex flex-col h-screen">

    <!-- Menu horizontal -->
    <div class="bg-gray-800 text-white p-4 flex justify-between">
      <div>
        <span class="font-bold">MrhSaaS</span>
      </div>
      <div class="flex gap-4">
        <button @click="mode='edit'" :class="mode==='edit' ? 'bg-gray-700' : ''" class="px-2 py-1 rounded">Modifier site</button>
        <button @click="mode='preview'" :class="mode==='preview' ? 'bg-gray-700' : ''" class="px-2 py-1 rounded">Voir site</button>
        <button @click="logout" class="bg-red-500 px-2 py-1 rounded">Déconnexion</button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">

      <!-- Onglet gauche : Éditeur / sections disponibles -->
      <div class="w-1/4 border-r p-2 overflow-auto">
        <h2 class="font-bold mb-2">Ajouter une section</h2>
        <ul>
          <li v-for="s in availableSections" :key="s.id" class="mb-2">
            <button @click="addSection(s)" class="w-full bg-blue-500 text-white px-2 py-1 rounded">{{ s.title }}</button>
          </li>
        </ul>
      </div>

      <!-- Partie principale : Arborescence / prévisualisation -->
      <div class="flex-1 flex flex-col">

        <!-- Onglet droit : Arborescence -->
        <div class="h-1/3 border-b p-2 overflow-auto">
          <h2 class="font-bold mb-2">Sections du site</h2>
          <ul>
            <li v-for="(section, index) in userSections" :key="section.id" class="mb-1 flex justify-between items-center">
              <span>{{ section.title }}</span>
              <button @click="removeSection(index)" class="text-red-500">Supprimer</button>
            </li>
          </ul>
        </div>

        <!-- Onglet bas : Prévisualisation -->
        <div class="flex-1 p-2 overflow-auto bg-gray-100">
          <h2 class="font-bold mb-2">Prévisualisation</h2>
          <div v-for="section in userSections" :key="section.id" class="p-2 border mb-2 bg-white">
            <h3 class="font-bold">{{ section.title }}</h3>
            <p>{{ section.content }}</p>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { auth, db } from "../firebase"
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { useRouter } from "vue-router"

const router = useRouter()
const userSections = ref([]) // Sections de l’utilisateur

// Sections disponibles à ajouter
const availableSections = [
  { id: 'hero', title: 'Hero', content: 'Bienvenue sur votre site' },
  { id: 'menu', title: 'Menu', content: 'Menu principal' },
  { id: 'footer', title: 'Pied de page', content: 'Contact, copyright...' },
  { id: 'form', title: 'Formulaire de contact', content: 'Formulaire...' },
]

const mode = ref('edit') // edit ou preview
let uid = null

onMounted(async () => {
  if (!auth.currentUser) {
    router.push({ name: "Login" })
    return
  }
  uid = auth.currentUser.uid
  const docSnap = await getDoc(doc(db, "users", uid))
  if (docSnap.exists()) {
    userSections.value = docSnap.data().sections || []
  }
})

// Ajouter une section
const addSection = async (section) => {
  userSections.value.push({ ...section })
  await updateDoc(doc(db, "users", uid), {
    sections: userSections.value
  })
}

// Supprimer une section
const removeSection = async (index) => {
  userSections.value.splice(index, 1)
  await updateDoc(doc(db, "users", uid), {
    sections: userSections.value
  })
}

// Déconnexion
const logout = async () => {
  await auth.signOut()
  router.push({ name: "Login" })
}
</script>
