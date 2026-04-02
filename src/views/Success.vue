<!-- ============================================================
  Success.vue — Sassbuilder
  Affiché après paiement Stripe réussi.
  - Met à jour Firestore : paye=true, expiry, plan
  - Crée storePaymentConfig vide pour que le propriétaire
    puisse configurer son propre Stripe/PayPal dans SaaasGenerator
  - Redirige vers Dashboard → puis SaaasGenerator
============================================================ -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-6">

    <div class="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md w-full">

      <!-- Spinner pendant mise à jour -->
      <div v-if="updating" class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
        <p class="text-gray-600">Activation de votre plan...</p>
      </div>

      <!-- Succès -->
      <div v-else-if="done">
        <div class="text-6xl mb-4">✅</div>
        <h1 class="text-3xl font-bold text-green-600 mb-2">Paiement réussi !</h1>
        <p class="text-gray-600 mb-2">
          Plan <strong class="text-blue-600 capitalize">{{ plan }}</strong> activé
        </p>
        <p class="text-sm text-gray-400 mb-8">
          Valable jusqu'au {{ expiryFormatted }}
        </p>

        <!-- Info config paiement -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
          <p class="text-sm font-semibold text-blue-700 mb-1">🔧 Prochaine étape</p>
          <p class="text-sm text-blue-600">
            Configurez votre propre Stripe et PayPal dans SaaasGenerator
            pour recevoir les paiements de vos clients.
          </p>
        </div>

        <button @click="goDashboard" class="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition">
          Accéder à mon espace →
        </button>
      </div>

      <!-- Erreur -->
      <div v-else-if="errorMsg">
        <div class="text-5xl mb-4">⚠️</div>
        <h1 class="text-2xl font-bold text-red-600 mb-2">Erreur</h1>
        <p class="text-gray-600 mb-6">{{ errorMsg }}</p>
        <button @click="$router.push('/')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl">
          Retour à l'accueil
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { auth, db } from "../firebase"
import { doc, updateDoc, getDoc } from "firebase/firestore"

const router   = useRouter()
const route    = useRoute()
const updating = ref(true)
const done     = ref(false)
const errorMsg = ref("")
const plan     = ref("")
const expiry   = ref(0)

const expiryFormatted = computed(() =>
  expiry.value
    ? new Date(expiry.value).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : ""
)

onMounted(() => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      errorMsg.value = "Session expirée. Reconnectez-vous."
      updating.value = false
      return
    }

    // Récupérer le plan depuis l'URL ou localStorage
    const planName = route.query.plan || localStorage.getItem("planChoisi") || "pro"
    plan.value = planName

    try {
      const now       = Date.now()
      const newExpiry = now + 30 * 24 * 60 * 60 * 1000 // +30 jours

      expiry.value = newExpiry

      // Mettre à jour Firestore
      await updateDoc(doc(db, "users", user.uid), {
        plan:      planName,
        paye:      true,
        expiry:    newExpiry,
        updatedAt: now,
      })

      // Vérifier si la config paiement store existe déjà
      const snap = await getDoc(doc(db, "users", user.uid))
      const data = snap.data() || {}

      // Si pas encore de config paiement store → créer vide
      if (!data.storePaymentConfig || !data.storePaymentConfig.stripe?.publishableKey) {
        await updateDoc(doc(db, "users", user.uid), {
          storePaymentConfig: {
            stripe: {
              publishableKey: "",
              backendUrl:     "",
              currency:       "eur",
              storeName:      data.email || "",
              successUrl:     "",
              cancelUrl:      "",
              mode:           "test",
            },
            paypal: {
              clientId:       "",
              mode:           "sandbox",
              currency:       "EUR",
              locale:         "fr_FR",
              createOrderUrl:  "",
              captureOrderUrl: "",
              successUrl:      "",
              brandName:       data.email || "",
            }
          }
        })
      }

      localStorage.setItem("planChoisi", planName)
      localStorage.removeItem("pendingPlan")
      localStorage.removeItem("pendingPrice")
      localStorage.removeItem("planPrice")

      updating.value = false
      done.value     = true

    } catch (e) {
      console.error(e)
      errorMsg.value = "Erreur lors de l'activation : " + e.message
      updating.value = false
    }
  })
})

const goDashboard = () => {
  router.push("/dashboard")
}
</script>
