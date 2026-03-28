<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

const route = useRoute()
const router = useRouter()

const user = ref(null)

const selectedPlan = ref(null)
const selectedPrice = ref(0)

const adresse1 = ref("")
const adresse2 = ref("")
const codePostal = ref("")
const ville = ref("")
const pays = ref("")

onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u
  })

  if (route.query.plan) {
    selectedPlan.value = route.query.plan
    selectedPrice.value = Number(route.query.price || 0)
  }
})

const getAdresse = () => {
  return `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`
}

const buyPlan = async () => {

  // 🔥 SI PAS CONNECTÉ
  if (!user.value) {
    localStorage.setItem("pendingPlan", selectedPlan.value)
    localStorage.setItem("pendingPrice", selectedPrice.value)

    return router.push("/auth")
  }

  try {
    const response = await fetch(
      "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            nom: "Plan " + selectedPlan.value,
            prix: selectedPrice.value,
            quantity: 1
          }],
          email: user.value.email,
          adresseLivraison: getAdresse(),
          plan: selectedPlan.value,
          clientId: user.value.uid
        })
      }
    )

    const data = await response.json()
    window.location.href = data.url

  } catch (err) {
    console.error(err)
    alert("Erreur paiement")
  }
}
</script>
