<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const plansRef = ref(null)

// ======================================================
// 💰 PAIEMENT STRIPE BILLING (TON ARGENT)
// ======================================================
const selectPlan = async (plan) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"))

    if (!user?.email) {
      router.push("/auth")
      return
    }

    const res = await fetch("https://ton-backend.com/create-billing-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: user.email,
        plan: plan,
        ownerUid: user.uid
      })
    })

    const data = await res.json()

    if (data.url) {
      // 🔥 REDIRECTION STRIPE
      window.location.href = data.url
    }

  } catch (err) {
    console.error(err)
  }
}

const scrollToPlans = () => {
  plansRef.value?.scrollIntoView({ behavior: "smooth" })
}
</script>
