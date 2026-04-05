<script setup>
import { ref, onMounted } from "vue"
import { db } from "../firebase"
import { collection, onSnapshot } from "firebase/firestore"

const orders = ref([])
const loading = ref(true)

onMounted(() => {
  console.log("🔥 TEST FIRESTORE")

  const q = collection(db, "orders")

  onSnapshot(q, (snap) => {
    console.log("📦 TOTAL ORDERS =", snap.size)

    orders.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log("📄 DATA =", orders.value)

    loading.value = false
  }, (err) => {
    console.error("❌ Firestore error:", err)
    loading.value = false
  })
})
</script>

<template>
  <div style="padding:20px">

    <h2>🧪 TEST FIRESTORE ORDERS</h2>

    <div v-if="loading">Chargement...</div>

    <div v-else-if="orders.length === 0">
      ❌ Aucune commande en base
    </div>

    <div v-else>
      <div v-for="o in orders" :key="o.id">
        <p><b>ID:</b> {{ o.id }}</p>
        <p><b>Email:</b> {{ o.email }}</p>
        <p><b>OwnerId:</b> {{ o.ownerId }}</p>
        <p><b>Total:</b> {{ o.total }}</p>
        <hr>
      </div>
    </div>

  </div>
</template>
