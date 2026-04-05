<script setup>
import { ref, onMounted } from "vue"
import { db, auth } from "../firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

const orders = ref([])
const loading = ref(true)

let unsub = null

onMounted(() => {

  console.log("📦 Orders mounted")

  onAuthStateChanged(auth, (user) => {

    console.log("🔐 AUTH USER =", user?.uid)

    if (!user) {
      loading.value = false
      return
    }

    loadOrders(user.uid)
  })
})

function loadOrders(uid) {

  console.log("🚀 QUERY FOR OWNER =", uid)

  if (unsub) unsub()

  const q = query(
    collection(db, "orders"),
    where("ownerId", "==", uid)
  )

  unsub = onSnapshot(q, (snap) => {

    console.log("📦 ORDERS FOUND =", snap.size)

    orders.value = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))

    loading.value = false
  })
}
</script>

<template>
  <div style="padding:20px;background:#0f172a;color:white;min-height:100vh">

    <h2>📦 Paiements store</h2>

    <div v-if="loading">Chargement...</div>

    <div v-else-if="orders.length === 0">
      ❌ Aucune commande trouvée
    </div>

    <div v-for="o in orders" :key="o.id" style="padding:10px;margin:10px;background:#1e293b">

      <div><b>{{ o.email }}</b></div>
      <div>Total: {{ o.total }}</div>
      <div>Status: {{ o.status }}</div>

    </div>

  </div>
</template>
