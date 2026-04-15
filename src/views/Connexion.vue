<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { auth } from "../firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

const router = useRouter()

// ✅ STATE
const email = ref("")
const password = ref("")
const loading = ref(false)
const errorMsg = ref("")

// ✅ LOGIN
const login = async () => {
  errorMsg.value = ""
  loading.value = true

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    const user = cred.user

    localStorage.setItem("user", JSON.stringify({
      uid: user.uid,
      email: user.email
    }))

    router.push("/dashboard")

  } catch (err) {
    console.error(err)

    if (err.code === "auth/invalid-credential") {
      errorMsg.value = "Vérifier votre email et mot de passe"
    } else {
      errorMsg.value = "Une erreur est survenue"
    }

  } finally {
    loading.value = false
  }
}
</script>
