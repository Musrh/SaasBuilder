<script setup>
import { ref, onMounted } from "vue"
import { db, auth } from "../firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

const orders = ref([])
const loading = ref(true)

let unsubscribe = null

// 🔥 INIT
onMounted(() => {
  console.log("📦 Orders page mounted")

  onAuthStateChanged(auth, async (user) => {
    console.log("🔐 AUTH USER =", user?.uid)

    if (!user) {
      orders.value = []
      loading.value = false
      return
    }

    try {
      // 🔥 récupérer ownerId depuis Firestore
      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        console.log("❌ User document not found")
        loading.value = false
        return
      }

      const userData = userSnap.data()

      const ownerId = userData.ownerId || user.uid

      console.log("🏪 OWNER ID =", ownerId)

      fetchOrders(ownerId)

    } catch (e) {
      console.error("❌ Error loading user:", e)
      loading.value = false
    }
  })
})

// 🔥 FETCH ORDERS
function fetchOrders(ownerId) {
  console.log("🚀 Fetch orders for ownerId =", ownerId)

  if (unsubscribe) unsubscribe()

  const q = query(
    collection(db, "orders"),
    where("ownerId", "==", ownerId)
  )

  unsubscribe = onSnapshot(q,
    (snap) => {
      console.log("📦 ORDERS FOUND =", snap.size)

      orders.value = snap.docs.map(doc => {
        const d = doc.data()

        console.log("📄 RAW ORDER =", d) // 🔥 DEBUG

        const items = Array.isArray(d.items) ? d.items : []

        // ✅ TOTAL SAFE
        const total =
          typeof d.total === "number"
            ? d.total
            : typeof d.montant === "number"
            ? d.montant
            : items.reduce((sum, i) => {
                return sum + (Number(i.price || 0) * Number(i.qty || 1))
              }, 0)

        return {
          id: doc.id,

          // ✅ EMAIL SAFE
          email:
            d.email ||
            d.customerEmail ||
            d.customer_email ||
            "unknown",

          items,

          total,

          status: d.status || "pending",

          ownerId: d.ownerId || "",

          createdAt: d.createdAt || null
        }
      })

      loading.value = false
    },
    (error) => {
      console.error("❌ Firestore error:", error)
      loading.value = false
    }
  )
}

// 🕒 DATE FORMAT
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

    <!-- LOADING -->
    <div v-if="loading">Chargement...</div>

    <!-- EMPTY -->
    <div v-else-if="orders.length === 0">
      ❌ Aucune commande trouvée
    </div>

    <!-- LIST -->
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
          <b>Total: {{ order.total }} EUR</b>
        </div>

        <!-- DATE -->
        <div class="date">
          {{ formatDate(order.createdAt) }}
        </div>

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
