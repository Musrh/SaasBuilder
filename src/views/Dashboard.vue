<script setup>
import { useRouter, useRoute } from "vue-router"
import { signOut } from "firebase/auth"
import { auth } from "../firebase"

const router = useRouter()
const route = useRoute()

/* 🔥 PLAN ACTUEL */
const plan = route.query.plan || localStorage.getItem("userPlan") || "free"

/* 🚪 LOGOUT */
const logout = async () => {
  try {

    // ================= FIREBASE LOGOUT =================
    await signOut(auth)

    // ================= CLEAN LOCAL STORAGE =================
    localStorage.removeItem("userPlan")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")

    // ================= REDIRECTION CORRECTE =================
    router.replace("/") 
    // ou explicitement :
    // router.replace("/plan")

  } catch (error) {
    console.error("Logout error:", error)
  }
}
</script>
