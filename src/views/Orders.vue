<script setup>
import { ref, onMounted } from "vue"
import { db, auth } from "../firebase"
import { collection, getDocs } from "firebase/firestore"

const orders = ref([])
const log = ref("loading...")
const loading = ref(true)

onMounted(async () => {

  console.log("🔥 ORDERS PAGE IS RUNNING")
  log.value = "page loaded"

  const user = auth.currentUser

  console.log("👤 currentUser =", user)

  if (!user) {
    log.value = "NO USER LOGGED IN"
    loading.value = false
    return
  }

  console.log("UID =", user.uid)

  try {
    const snap = await getDocs(collection(db, "orders"))

    console.log("📦 TOTAL ORDERS IN DB =", snap.size)

    orders.value = snap.docs.map(d => d.data())

    log.value = "orders loaded: " + snap.size
  } catch (e) {
    console.error("❌ ERROR FIRESTORE", e)
    log.value = "error"
  }

  loading.value = false
})
</script>

<template>
  <div style="padding:20px;color:white;background:#0f172a;min-height:100vh">

    <h2>DEBUG ORDERS</h2>

    <p>{{ log }}</p>

    <p v-if="loading">Loading...</p>

    <div v-if="orders.length === 0 && !loading">
      ❌ NO ORDERS FOUND
    </div>

    <div v-for="(o,i) in orders" :key="i">
      <pre>{{ o }}</pre>
    </div>

  </div>
</template>
