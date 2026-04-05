<script setup>
import { ref, onMounted } from "vue"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

const user = ref(null)
const loading = ref(true)

onMounted(() => {
  console.log("🚀 TEST AUTH")

  onAuthStateChanged(auth, (u) => {
    console.log("🔐 USER =", u)

    user.value = u
    loading.value = false
  })
})
</script>

<template>
  <div style="padding:20px">

    <h2>🧪 TEST USER CONNECTÉ</h2>

    <div v-if="loading">
      Chargement...
    </div>

    <div v-else-if="!user">
      ❌ Aucun utilisateur connecté
    </div>

    <div v-else>
      <p><b>UID:</b> {{ user.uid }}</p>
      <p><b>Email:</b> {{ user.email }}</p>
    </div>

  </div>
</template>
