<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

const router = useRouter()
const route = useRoute()
const auth   = getAuth()

// ── STATE ─────────────────────────────────────────────
const uid     = ref(null)
const cart    = ref([])
const loading = ref(true)
const paying  = ref(false)
const payError = ref("")

// client infos
const name    = ref("")
const email   = ref("")
const address = ref("")
const zip     = ref("")
const city    = ref("")
const country = ref("France")

let userRef   = null
let unsubCart = null

// ── COMPUTED ──────────────────────────────────────────
const total = computed(() =>
  cart.value.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)
)

const cartCount = computed(() =>
  cart.value.reduce((s, i) => s + (i.qty || 1), 0)
)

// ── AUTH + CART LISTENER ──────────────────────────────
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (!user) { loading.value = false; return }

    uid.value = user.uid
    email.value = user.email || ""
    userRef = doc(db, "users", user.uid)

    unsubCart = onSnapshot(userRef, (snap) => {
      cart.value = snap.data()?.cartSession || []
      loading.value = false
    })
  })
})

onUnmounted(() => unsubCart?.())

// ── UPDATE QTY ────────────────────────────────────────
async function updateQty(idx, qty) {
  if (qty < 1) return
  const updated = JSON.parse(JSON.stringify(cart.value))
  updated[idx].qty = qty
  await updateDoc(userRef, { cartSession: updated })
}

// ── REMOVE ITEM ───────────────────────────────────────
async function removeItem(idx) {
  const updated = JSON.parse(JSON.stringify(cart.value))
  updated.splice(idx, 1)
  await updateDoc(userRef, { cartSession: updated })
}

// ── CLEAR CART ────────────────────────────────────────
async function clearCart() {
  if (!confirm("Vider le panier ?")) return
  await updateDoc(userRef, { cartSession: [] })
}

// ── PAY STRIPE CONNECT ────────────────────────────────
async function pay() {
  if (!name.value.trim())    { payError.value = "Nom obligatoire."; return }
  if (!email.value.trim())   { payError.value = "Email obligatoire."; return }
  if (!address.value.trim()) { payError.value = "Adresse requise."; return }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
  if (!emailOk) { payError.value = "Email invalide."; return }

  paying.value = true
  payError.value = ""

  const adresseLivraison = [address.value, zip.value, city.value, country.value]
    .filter(Boolean).join(", ")

  // 🔥 OWNER DU STORE (IMPORTANT STRIPE CONNECT)
  const storeUid =
    route.params.storeUid || uid.value

  // ── pending order (UI success flow) ──
  const pendingOrder = {
    items: cart.value.map(i => ({
      id: i.id || "",
      name: i.name || "",
      price: i.price || 0,
      qty: i.qty || 1,
    })),
    total: total.value.toFixed(2),
    customerName: name.value.trim(),
    customerEmail: email.value.trim().toLowerCase(),
    customerAddress: adresseLivraison,
    ownerUid: storeUid,
    createdAt: new Date().toISOString(),
  }

  localStorage.setItem("pendingStripeOrder", JSON.stringify(pendingOrder))
  localStorage.setItem("stripeOwnerUid", storeUid)

  // ── BACKEND FINAL ──
  const BACKEND = "https://backendfinal-production-afd2.up.railway.app"

  const origin = "https://musrh.github.io/SaaasGenerator"
  const successUrl = `${origin}/`
  const cancelUrl  = `${origin}/`

  try {
    const res = await fetch(`${BACKEND}/create-store-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.value.map(i => ({
          nom: i.name || "Produit",
          prix: Number(i.price) || 0,
          quantity: i.qty || 1,
        })),

        email: email.value.trim().toLowerCase(),
        adresseLivraison,

        clientId: uid.value,

        // 🔥 CRUCIAL STRIPE CONNECT
        storeUid: storeUid,
      }),
    })

    if (!res.ok) throw new Error("Erreur serveur " + res.status)

    const data = await res.json()
    if (!data.url) throw new Error(data.error || "URL Stripe manquante")

    window.location.href = data.url

  } catch (e) {
    payError.value = e.message
    paying.value = false
    localStorage.removeItem("pendingStripeOrder")
  }
}
</script>
