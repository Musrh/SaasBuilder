<script setup>
import { ref, onMounted } from "vue"
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

/* ================= STATE ================= */
const user = ref(null)

const adresse1 = ref("")
const adresse2 = ref("")
const codePostal = ref("")
const ville = ref("")
const pays = ref("")

/* ================= AUTH ================= */
onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u
  })
})

/* ================= TEXT ================= */
const titles = {
  cart: "Votre Panier",
  mustLogin: "Vous devez être connecté pour payer.",
  login: "Se connecter",
  address: "Adresse",
  address1: "Adresse 1",
  address2: "Adresse 2",
  postalCode: "Code postal",
  city: "Ville",
  country: "Pays",
}

/* ================= HELP ================= */
const getAdresse = () => {
  return `${adresse1.value} ${adresse2.value}, ${codePostal.value} ${ville.value}, ${pays.value}`
}

/* ================= BUY PLAN ================= */
const buyPlan = async (plan, price) => {
  try {
    const response = await fetch(
      "https://backend-master-production-cf50.up.railway.app/create-stripe-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [
            {
              nom: "Plan " + plan,
              prix: price,
              quantity: 1
            }
          ],
          email: user.value.email,
          adresseLivraison: getAdresse(),
          plan: plan,
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
