<template>
  <div style="padding:20px;color:white">
    <h2>📦 Orders</h2>

    <div v-if="loading">Loading...</div>

    <div v-else>
      <div
        v-for="order in orders"
        :key="order.id"
        style="border:1px solid #444;padding:10px;margin:10px 0"
      >
        <p><b>{{ order.email }}</b></p>
        <p>Status: {{ order.status }}</p>
        <p>Total: {{ order.total }} {{ order.currency }}</p>

        <div v-for="(item, i) in order.items" :key="i">
          - {{ item.name }} x{{ item.qty }} ({{ item.price }}€)
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { db } from "../firebase"
import { collection, onSnapshot } from "firebase/firestore"

const orders = ref([])
const loading = ref(true)

onMounted(() => {
  onSnapshot(collection(db, "orders"), (snap) => {

    console.log("ORDERS =>", snap.docs.map(d => d.data()))

    orders.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    loading.value = false
  })
})
</script>
