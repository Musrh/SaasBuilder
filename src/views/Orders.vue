<template>
  <div class="page">
    <h2>📦 SaasBuilder — Commandes clients</h2>

    <div v-if="loading">Chargement...</div>

    <div v-else>
      <div
        v-for="order in orders"
        :key="order.id"
        class="card"
      >
        <div class="top">
          <div>
            <b>{{ order.email }}</b>
            <p class="small">User: {{ order.userId }}</p>
          </div>

          <div class="status" :class="order.status">
            {{ order.status }}
          </div>
        </div>

        <div class="items">
          <div
            v-for="(item, i) in order.items"
            :key="i"
            class="item"
          >
            <span>{{ item.name }}</span>
            <span>x{{ item.qty }}</span>
            <span>{{ item.price }}€</span>
          </div>
        </div>

        <div class="bottom">
          <b>Total: {{ order.total }} {{ order.currency }}</b>
        </div>

        <p class="date">
          {{ formatDate(order.createdAt) }}
        </p>
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

    console.log("SAASBUILDER ORDERS =>", snap.docs.map(d => d.data()))

    orders.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    loading.value = false
  })
})

function formatDate(ts) {
  if (!ts) return "—"
  try {
    return new Date(ts.seconds * 1000).toLocaleString()
  } catch {
    return "—"
  }
}
</script>

<style scoped>
.page {
  padding: 20px;
  background: #0f172a;
  color: white;
  min-height: 100vh;
}

.card {
  background: #1e293b;
  padding: 15px;
  margin: 15px 0;
  border-radius: 12px;
  border: 1px solid #334155;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.small {
  font-size: 12px;
  opacity: 0.6;
}

.items {
  margin-top: 10px;
}

.item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.bottom {
  margin-top: 10px;
}

.date {
  font-size: 11px;
  opacity: 0.5;
  margin-top: 8px;
}

.status {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  text-transform: capitalize;
}

.status.pending {
  background: orange;
}

.status.paid {
  background: green;
}

.status.shipped {
  background: blue;
}

.status.cancelled {
  background: red;
}
</style>
