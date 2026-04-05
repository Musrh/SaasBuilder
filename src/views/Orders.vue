<script setup>
import { ref, onMounted, computed } from "vue"
import { db, auth } from "../firebase"
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

const orders = ref([])
const loading = ref(true)
const user = ref(null)
const search = ref("")

let unsubscribe = null

// 🔐 AUTH + ORDERS
onMounted(() => {
  onAuthStateChanged(auth, (u) => {

    // 🔥 DEBUG IMPORTANT
    console.log("UID =", u?.uid)

    if (!u || !u.uid) {
      loading.value = false
      return
    }

    user.value = u

    // 🔥 CLEAN PREVIOUS LISTENER
    if (unsubscribe) unsubscribe()

    // 🔥 FIRESTORE QUERY (OWNER ONLY)
    const q = query(
      collection(db, "orders"),
      where("ownerId", "==", u.uid)
    )

    unsubscribe = onSnapshot(q, (snap) => {

      console.log("STORE ORDERS =>", snap.docs.length)

      orders.value = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      loading.value = false
    }, (err) => {
      console.error("Firestore error:", err)
      loading.value = false
    })
  })
})

// 🔍 FILTER CLIENT EMAIL
const filteredOrders = computed(() => {
  if (!search.value) return orders.value

  return orders.value.filter(o =>
    (o.email || "")
      .toLowerCase()
      .includes(search.value.toLowerCase())
  )
})

// 🕒 FORMAT DATE
function formatDate(ts) {
  if (!ts) return "—"
  try {
    return new Date(ts.seconds * 1000).toLocaleString()
  } catch {
    return "—"
  }
}
</script>

<template>
<div class="page">

  <h2>📦 Commandes de mon store</h2>

  <!-- SEARCH -->
  <input
    v-model="search"
    placeholder="🔍 Filtrer par email client"
    class="search"
  />

  <!-- LOADING -->
  <div v-if="loading">Chargement...</div>

  <!-- NOT LOGGED -->
  <div v-else-if="!user">
    Vous devez être connecté
  </div>

  <!-- EMPTY -->
  <div v-else-if="filteredOrders.length === 0">
    Il n'y a pas de commandes
  </div>

  <!-- LIST -->
  <div v-else>
    <div
      v-for="order in filteredOrders"
      :key="order.id"
      class="card"
    >

      <div class="top">
        <div>
          <b>{{ order.email }}</b>
          <p class="small">Client ID: {{ order.userId }}</p>
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

<style scoped>
.page {
  padding: 20px;
  background: #0f172a;
  color: white;
  min-height: 100vh;
}

.search {
  width: 100%;
  padding: 10px;
  margin: 10px 0 20px;
  border-radius: 8px;
  border: none;
}

.card {
  background: #1e293b;
  padding: 15px;
  margin: 15px 0;
  border-radius: 12px;
}

.top {
  display: flex;
  justify-content: space-between;
}

.small {
  font-size: 12px;
  opacity: 0.6;
}

.item {
  display: flex;
  justify-content: space-between;
}

.status {
  padding: 4px 8px;
  border-radius: 6px;
}

.status.pending { background: orange; }
.status.paid { background: green; }
.status.shipped { background: blue; }
.status.cancelled { background: red; }
</style>
