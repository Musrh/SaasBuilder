<script setup>
import { useRouter } from "vue-router"
import { ref } from "vue"

const router = useRouter()
const plansRef = ref(null)

const planPrices = {
  pro: 5,
  premium: 10
}

const selectPlan = (plan) => {
  localStorage.setItem("planChoisi", plan)

  // 🔥 FREE → direct auth
  if (plan === "free") {
    router.push("/auth")
    return
  }

  // 💰 PRO / PREMIUM → panier
  router.push({
    path: "/panier",
    query: {
      plan,
      price: planPrices[plan]
    }
  })
}

const scrollToPlans = () => {
  plansRef.value?.scrollIntoView({ behavior: "smooth" })
}
</script>
