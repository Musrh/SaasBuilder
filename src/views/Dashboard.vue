<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

const router = useRouter()

const loading = ref(true)
const error = ref("")
const user = ref(null)

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      router.push("/auth")
      return
    }

    user.value = u

    try {
      const userRef = doc(db, "users", u.uid)
      const snap = await getDoc(userRef)

      if (!snap.exists()) {
        error.value = "Utilisateur introuvable"
        loading.value = false
        return
      }

      const userData = snap.data()
      const plan = userData.plan || "free"
      const uid = u.uid

      // =========================
      // 🚀 REDIRECTION SAAS LOGIC
      // =========================

      if (plan === "free") {
        router.push("/builder1")
        return
      }

      if (plan === "pro") {
        router.push("/builder2")
        return
      }

      if (plan === "premium") {
        window.location.href =
          `https://musrh.github.io/SaaasGenerator/#/?uid=${uid}`
        return
      }

      // fallback
      router.push("/builder1")

    } catch (err) {
      console.error(err)
      error.value = "Erreur chargement dashboard"
    } finally {
      loading.value = false
    }
  })
})
</script>

<template>
  <div class="flex items-center justify-center h-screen">

    <div v-if="loading" class="text-gray-600 text-lg">
      Chargement du dashboard...
    </div>

    <div v-else-if="error" class="text-red-500">
      {{ error }}
    </div>

    <div v-else class="text-gray-700">
      Redirection en cours...
    </div>

  </div>
</template>
