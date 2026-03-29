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

  // PLAN URL
  if (route.query.plan) {
    selectedPlan.value = route.query.plan
    selectedPrice.value = Number(route.query.price || 0)

    localStorage.setItem("planChoisi", selectedPlan.value)
  }

  // RESTORE AFTER LOGIN
  const pendingPlan = localStorage.getItem("pendingPlan")
  const pendingPrice = localStorage.getItem("pendingPrice")

  if (pendingPlan && !selectedPlan.value) {
    selectedPlan.value = pendingPlan
    selectedPrice.value = Number(pendingPrice)

    localStorage.removeItem("pendingPlan")
    localStorage.removeItem("pendingPrice")
  }
})

const goAuth = () => {
  localStorage.setItem("pendingPlan", selectedPlan.value)
  localStorage.setItem("pendingPrice", selectedPrice.value)

  router.push(`/auth`)
}

const getAdresse = () => {
  return `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`
}

const buyPlan = async () => {

  if (!selectedPlan.value || !selectedPrice.value) {
    alert("Plan invalide")
    return
  }

  if (!user.value) {
    return goAuth()
  }

  try {
    const res = await fetch(
      "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan: selectedPlan.value,
          prix: selectedPrice.value,
          email: user.value.email,
          clientId: user.value.uid,
          adresse: getAdresse()
        })
      }
    )

    const data = await res.json()

    if (!data.url) {
      alert("Erreur Stripe")
      return
    }

    window.location.href = data.url

  } catch (e) {
    console.error(e)
    alert("Erreur paiement")
  }
}
</script>
