//AuthForm.vue
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">

    <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

      <!-- PLAN -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
        <p class="text-sm text-gray-500">Vous avez choisi</p>
        <p class="text-2xl font-bold text-blue-600 capitalize">
          {{ selectedPlan }}
        </p>
      </div>

      <!-- TITLE -->
      <h2 class="text-2xl font-bold mb-6 text-center">
        Connexion / Inscription
      </h2>

      <!-- EMAIL -->
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border p-3 rounded-lg mb-4"
      />

      <!-- PASSWORD -->
      <input
        v-model="password"
        type="password"
        placeholder="Mot de passe"
        class="w-full border p-3 rounded-lg mb-6"
      />

      <!-- LOGIN -->
      <button
        @click="login"
        class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg mb-3"
      >
        Se connecter
      </button>

      <!-- REGISTER -->
      <button
        @click="register"
        class="w-full bg-gray-200 hover:bg-gray-300 py-3 rounded-lg"
      >
        S'inscrire
      </button>

    </div>
  </div>
</template>

<script setup>
import { db, auth } from "../firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth"

const route = useRoute()
const router = useRouter()

const email = ref("")
const password = ref("")
const selectedPlan = ref("free")

// 🔥 récupérer plan
onMounted(() => {
  selectedPlan.value =
    route.query.plan ||
    localStorage.getItem("planChoisi") ||
    "free"

  auth.onAuthStateChanged((user) => {
    if (user) {
      router.push("/dashboard")
    }
  })
})

// =======================================================
// LOGIN
// =======================================================
const login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)

    const redirect = route.query.redirect || "/dashboard"
    router.push(redirect)

  } catch (e) {
    console.error(e)
    alert("Erreur connexion")
  }
}

// =======================================================
// REGISTER (SAAS OWNER)
// =======================================================
const register = async () => {
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    const user = cred.user
    const uid = user.uid

    // 🔥 SAAS STRUCTURE OWNER
    const ownerId = uid
    const storeId = uid

    await setDoc(doc(db, "users", uid), {
      uid: uid,
      email: user.email,

      // SaaS roles
      role: "owner",
      ownerId: ownerId,
      storeId: storeId,

      // plan SaaS
      plan: selectedPlan.value || "free",
      paye: false,

      sections: [],
      createdAt: serverTimestamp(),
      expiry: null
    })

    // 🔥 redirection vers panier Stripe
    router.push(
      `/panier?ownerId=${ownerId}&storeId=${storeId}&plan=${selectedPlan.value}`
    )

  } catch (e) {
    console.error(e)
    alert("Erreur inscription")
  }
}
</script>
