<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Bonjour {{ userData.username }}</h1>
    <p>Plan : {{ userData.plan }}</p>

    <h2 class="mt-6 text-xl font-bold">Sections du site</h2>
    <ul>
      <li v-for="section in userData.sections" :key="section.id">
        {{ section.title }}
      </li>
    </ul>

    <button @click="logout" class="mt-4 bg-red-500 text-white px-4 py-2 rounded">Se déconnecter</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { auth, db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "vue-router"

const router = useRouter()
const userData = ref({ username: "", plan: "", sections: [] })

onMounted(async () => {
  if (!auth.currentUser) {
    router.push({ name: "Login" })
    return
  }

  const uid = auth.currentUser.uid
  const docSnap = await getDoc(doc(db, "users", uid))
  if (docSnap.exists()) {
    userData.value = docSnap.data()
  }
})

const logout = async () => {
  await auth.signOut()
  router.push({ name: "Login" })
}
</script>
