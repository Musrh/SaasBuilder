<template>
  <div class="min-h-screen bg-gray-100 p-6">

    <!-- HEADER -->
    <div class="max-w-5xl mx-auto flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Dashboard</h1>

      <button
        @click="logout"
        class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
      >
        Déconnexion
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="text-center text-gray-600">
      Chargement...
    </div>

    <!-- ERROR -->
    <div v-else-if="error" class="text-center text-red-500">
      {{ error }}
    </div>

    <!-- CONTENT -->
    <div v-else class="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">

      <!-- INFOS -->
      <div class="bg-white p-6 rounded-xl shadow">

        <h2 class="font-bold text-lg mb-4">Informations</h2>

        <p><b>Email :</b> {{ user.email }}</p>

        <p class="mt-2">
          <b>Plan :</b>
          <span
            class="px-2 py-1 rounded text-white text-sm"
            :class="planColor"
          >
            {{ user.plan }}
          </span>
        </p>

        <p class="mt-2" v-if="expiryDate">
          <b>Expiration :</b> {{ expiryDate }}
        </p>

        <p class="mt-2" v-if="daysLeft !== null">
          <b>Jours restants :</b>
          <span :class="daysLeft < 5 ? 'text-red-500' : 'text-green-600'">
            {{ daysLeft }}
          </span>
        </p>

        <p class="mt-2">
          <b>Paiement :</b>
          <span :class="user.paye ? 'text-green-600' : 'text-red-500'">
            {{ user.paye ? "Payé" : "Non payé" }}
          </span>
        </p>

      </div>

      <!-- ACTIONS -->
      <div class="bg-white p-6 rounded-xl shadow">

        <h2 class="font-bold text-lg mb-4">Actions</h2>

        <!-- BUILDER -->
        <button
          @click="goBuilder"
          class="w-full mb-3 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
        >
          🚀 Accéder au Builder
        </button>

        <!-- UPGRADE -->
        <button
          v-if="user.plan !== 'premium'"
          @click="upgrade"
          class="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600"
        >
          ⭐ Upgrade
        </button>

        <!-- PLAN INFO -->
        <p class="mt-4 text-sm text-gray-500">
          {{ planDescription }}
        </p>

      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"

import { auth, db } from "../firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

/* STATE */
const router = useRouter()

const loading = ref(true)
const error = ref("")
const user = ref(null)
const expiry = ref(null)

/* LOAD USER */
onMounted(() => {
  onAuthStateChanged(auth, async (u) => {

    if (!u) {
      router.push("/auth")
      return
    }

    try {
      const snap = await getDoc(doc(db, "users", u.uid))

      if (!snap.exists()) {
        error.value = "Utilisateur introuvable"
        return
      }

      user.value = {
        ...snap.data(),
        uid: u.uid
      }

      expiry.value = user.value.expiry

    } catch (err) {
      console.error(err)
      error.value = "Erreur chargement"
    } finally {
      loading.value = false
    }
  })
})

/* DATE */
const expiryDate = computed(() => {
  if (!expiry.value) return null
  return new Date(expiry.value).toLocaleDateString()
})

/* DAYS */
const daysLeft = computed(() => {
  if (!expiry.value) return null
  return Math.ceil((expiry.value - Date.now()) / (1000 * 60 * 60 * 24))
})

/* PLAN COLOR */
const planColor = computed(() => {
  if (!user.value) return ""

  return user.value.plan === "free"
    ? "bg-gray-500"
    : user.value.plan === "pro"
    ? "bg-blue-500"
    : "bg-purple-600"
})

/* PLAN DESC */
const planDescription = computed(() => {
  if (!user.value) return ""

  if (user.value.plan === "free")
    return "Plan gratuit : 1 seule page"
  if (user.value.plan === "pro")
    return "Plan Pro : multi pages"
  if (user.value.plan === "premium")
    return "Plan Premium : e-commerce + paiement"

  return ""
})

/* BUILDER */
const goBuilder = () => {

  if (user.value.plan === "free") {
    router.push("/builder1")
  }

  else if (user.value.plan === "pro") {

    if (!user.value.paye) {
      router.push("/panier?plan=pro&price=5")
      return
    }

    router.push("/builder2")
  }

  else if (user.value.plan === "premium") {

    if (!user.value.paye) {
      router.push("/panier?plan=premium&price=10")
      return
    }

    window.location.href =
      `https://musrh.github.io/SaaasGenerator/#/?uid=${user.value.uid}`
  }
}

/* UPGRADE */
const upgrade = () => {
  if (user.value.plan === "free") {
    router.push("/panier?plan=pro&price=5")
  } else if (user.value.plan === "pro") {
    router.push("/panier?plan=premium&price=10")
  }
}

/* LOGOUT */
const logout = async () => {
  await signOut(auth)

  // 🔥 retour page accueil
  window.location.href = "#/"
}
</script>
