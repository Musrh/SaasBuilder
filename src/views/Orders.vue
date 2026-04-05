<script setup>
import { ref, onMounted } from "vue"
import { db, auth } from "../firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

const orders = ref([])
const loading = ref(true)

let unsubscribe = null

onMounted(() => {

  console.log("📦 Orders page mounted")

  onAuthStateChanged(auth, (user) => {

    console.log("🔐 AUTH USER =", user?.uid)

    if (!user) {
      loading.value = false
      orders.value = []
      return
    }

    loadOrders(user.uid)
  })
})

// 🔥 LOAD ORDERS (FIX COMPLET + SAFE MAPPING)
function loadOrders(uid) {

  console.log("🚀 LOAD ORDERS FOR UID =", uid)

  if (unsubscribe) unsubscribe()

  const q = query(
    collection(db, "orders"),
    where("ownerId", "==", uid)
  )

  unsubscribe = onSnapshot(q, (snap) => {

    console.log("📦 ORDERS FOUND =", snap.size)

    orders.value = snap.docs.map(doc => {

      const d = doc.data()

      return {
        id: doc.id,

        email: d.email || "",
        userId: d.userId || "",

        items: Array.isArray(d.items) ? d.items : [],

        total: Number(d.total || 0),
        status: d.status || "pending",
        currency: d.currency || "EUR",

        ownerId: d.ownerId || "",

        createdAt: d.createdAt || null
      }
    })

    loading.value = false
  }, (error) => {
    console.error("❌ Firestore error:", error)
    loading.value = false
  })
}

// 🕒 FORMAT DATE SAFE
function formatDate(ts) {
  if (!ts) return "—"

  try {
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleString()
    }
    return new Date(ts).toLocaleString()
  } catch {
    return "—"
  }
}
</script>

<template>
  <div class="page">

    <h2>📦 Paiements store</h2>

    <div v-if="loading">Chargement...</div>

    <div v-else-if="orders.length === 0">
      ❌ Aucune commande trouvée
    </div>

    <div v-else>

      <div
        v-for="order in orders"
        :key="order.id"
        class="card"
      >

        <!-- CLIENT -->
        <div class="top">
          <div>
            <b>{{ order.email }}</b>
            <p class="small">Client: {{ order.userId }}</p>
          </div>

          <div class="status" :class="order.status">
            {{ order.status }}
          </div>
        </div>

        <!-- ITEMS -->
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

        <!-- TOTAL -->
        <div class="bottom">
          <b>Total: {{ order.total }} {{ order.currency }}</b>
        </div>

        <!-- DATE -->
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

.items {
  margin-top: 10px;
}

.item {
  display: flex;
  justify-content: space-between;
}

.bottom {
  margin-top: 10px;
  font-weight: bold;
}

.status {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.status.pending { background: orange; }
.status.paid { background: green; }
.status.shipped { background: blue; }
.status.cancelled { background: red; }

.date {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.6;
}
</style>
