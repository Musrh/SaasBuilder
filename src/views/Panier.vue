<!-- ============================================================
  Panier.vue — Sassbuilder
  Paiement du plan via Stripe Checkout (backend Railway)
  Après paiement → Success.vue qui met à jour Firestore
============================================================ -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex justify-center items-center p-4">

    <div class="w-full max-w-lg">

      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">🛒 Finaliser votre abonnement</h1>
        <p class="text-gray-500 mt-2">Paiement sécurisé via Stripe</p>
      </div>

      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">

        <!-- Plan résumé -->
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-blue-100 text-sm uppercase tracking-wider">Plan sélectionné</p>
              <h2 class="text-2xl font-bold">{{ planLabel }}</h2>
            </div>
            <div class="text-right">
              <p class="text-blue-100 text-sm">Mensuel</p>
              <p class="text-3xl font-black">{{ selectedPrice }}€</p>
            </div>
          </div>

          <!-- Features résumé -->
          <div class="mt-4 pt-4 border-t border-white/20">
            <div class="grid grid-cols-2 gap-2">
              <div v-for="f in planFeatures" :key="f" class="flex items-center gap-2 text-sm text-blue-100">
                <span class="text-yellow-300">✓</span> {{ f }}
              </div>
            </div>
          </div>
        </div>

        <div class="p-6">

          <!-- Non connecté -->
          <div v-if="!user" class="text-center py-8">
            <p class="text-gray-500 mb-4">Vous devez être connecté pour continuer</p>
            <button @click="goAuth" class="bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition">
              Se connecter / S'inscrire
            </button>
          </div>

          <!-- Formulaire -->
          <div v-else>

            <p class="text-sm text-gray-500 mb-4">Connecté en tant que <strong>{{ user.email }}</strong></p>

            <!-- Adresse (optionnel pour facturation) -->
            <div class="space-y-3 mb-6">
              <label class="block text-sm font-semibold text-gray-600 mb-1">Adresse de facturation (optionnel)</label>
              <input v-model="adresse1"   placeholder="Adresse ligne 1"   class="input-field" />
              <input v-model="adresse2"   placeholder="Adresse ligne 2"   class="input-field" />
              <div class="grid grid-cols-2 gap-3">
                <input v-model="codePostal" placeholder="Code postal" class="input-field" />
                <input v-model="ville"      placeholder="Ville"        class="input-field" />
              </div>
              <input v-model="pays" placeholder="Pays (ex: France)" class="input-field" />
            </div>

            <!-- Bouton Stripe -->
            <button
              @click="buyPlan"
              :disabled="loading"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-3"
            >
              <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              <span v-else>💳</span>
              {{ loading ? "Redirection Stripe..." : `Payer ${selectedPrice}€ avec Stripe` }}
            </button>

            <!-- Error -->
            <div v-if="errorMsg" class="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
              {{ errorMsg }}
            </div>

            <div class="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <span>🔒</span>
              <span>Paiement sécurisé — Vos données ne sont jamais stockées</span>
            </div>

          </div>
        </div>

      </div>

      <div class="text-center mt-4">
        <button @click="$router.push('/')" class="text-sm text-gray-400 hover:text-gray-600">
          ← Retour aux offres
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

const route  = useRoute()
const router = useRouter()

const user          = ref(null)
const loading       = ref(false)
const errorMsg      = ref("")
const selectedPlan  = ref("")
const selectedPrice = ref(0)
const adresse1      = ref("")
const adresse2      = ref("")
const codePostal    = ref("")
const ville         = ref("")
const pays          = ref("")

const planLabel = computed(() =>
  selectedPlan.value === "pro" ? "Plan Pro" :
  selectedPlan.value === "premium" ? "Plan Premium" : "Plan"
)

const planFeatures = computed(() =>
  selectedPlan.value === "pro"
    ? ["Pages illimitées", "Paiements intégrés", "Gestion commandes", "Support email"]
    : ["Tout le plan Pro", "Multi-stores", "Analytics", "Support prioritaire"]
)

onMounted(() => {
  onAuthStateChanged(auth, (u) => { user.value = u })

  // Récupérer plan depuis URL
  if (route.query.plan) {
    selectedPlan.value  = route.query.plan
    selectedPrice.value = Number(route.query.price || 0)
    localStorage.setItem("planChoisi", selectedPlan.value)
    localStorage.setItem("planPrice",  String(selectedPrice.value))
  } else {
    // Restore depuis localStorage
    selectedPlan.value  = localStorage.getItem("planChoisi") || "pro"
    selectedPrice.value = Number(localStorage.getItem("planPrice") || 5)
  }
})

const goAuth = () => {
  localStorage.setItem("pendingPlan",  selectedPlan.value)
  localStorage.setItem("pendingPrice", String(selectedPrice.value))
  router.push(`/auth?plan=${selectedPlan.value}`)
}

const buyPlan = async () => {
  if (!selectedPlan.value || !selectedPrice.value) {
    errorMsg.value = "Plan invalide. Retournez choisir un plan."; return
  }
  if (!user.value) { goAuth(); return }

  loading.value  = true
  errorMsg.value = ""

  try {
    const res = await fetch(
      "backendsaas-production.up.railway.app/create-stripe-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            nom:      planLabel.value,
            prix:     selectedPrice.value,
            quantity: 1,
          }],
          email:             user.value.email,
          clientId:          user.value.uid,
          plan:              selectedPlan.value,
          adresseLivraison:  `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`.trim(),
          // URLs de redirection après paiement Stripe
          successUrl: `${window.location.origin}/#/success?plan=${selectedPlan.value}`,
          cancelUrl:  `${window.location.origin}/#/panier?plan=${selectedPlan.value}&price=${selectedPrice.value}`,
        }),
      }
    )

    const data = await res.json()

    if (!data.url) {
      errorMsg.value = "Erreur serveur : pas d'URL de paiement reçue."
      return
    }

    // Redirection vers Stripe Checkout
    window.location.href = data.url

  } catch (err) {
    console.error(err)
    errorMsg.value = "Erreur de connexion au serveur de paiement. Réessayez."
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  font-size: 14px;
  transition: border-color .15s;
}
.input-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,.1);
}
</style>
