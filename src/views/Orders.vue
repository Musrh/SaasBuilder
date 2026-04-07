<script setup>
import { ref, onMounted, computed } from "vue"
import { db } from "../firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { useRouter } from "vue-router"

const router = useRouter()
const auth = getAuth()

const orders = ref([])
const loading = ref(true)
const search = ref("")

/* =========================================================
   🔐 GET CURRENT USER
========================================================= */
const user = auth.currentUser

/* =========================================================
   🔥 FIRESTORE FILTER ownerUid
========================================================= */
onMounted(() => {

  if (!user) {
    console.error("❌ Pas d'utilisateur connecté")
    return
  }

  // 🔥 filtre direct Firestore
  const q = query(
    collection(db, "orders"),
    where("ownerUid", "==", user.uid)
  )

  onSnapshot(
    q,
    (snap) => {

      orders.value = snap.docs.map((doc) => {
        const data = doc.data()

        return {
          id: doc.id,

          customerName: data.customerName ?? "Non défini",
          customerEmail: data.customerEmail ?? "Non défini",
          customerAddress: data.customerAddress ?? "Non défini",

          total: data.total ?? 0,
          currency: data.currency ?? "€",
          status: data.status ?? "unknown",
          createdAt: data.createdAt ?? null,

          items: Array.isArray(data.items) ? data.items : []
        }
      })

      loading.value = false
    },
    (err) => {
      console.error("❌ Firestore error:", err)
      loading.value = false
    }
  )
})

/* =========================================================
   🔍 FILTER BY NAME (FRONT)
========================================================= */
const filteredOrders = computed(() => {
  if (!search.value) return orders.value

  return orders.value.filter((o) =>
    o.customerName.toLowerCase().includes(search.value.toLowerCase())
  )
})

/* =========================================================
   🔙 NAVIGATION
========================================================= */
function goDashboard() {
  router.push("/dashboard")
}
</script>

<template>
  <div style="padding:20px">

    <!-- HEADER -->
    <div style="display:flex; justify-content:space-between; align-items:center">
      <h2>📦 Mes commandes</h2>
      <button @click="goDashboard">🔙 Dashboard</button>
    </div>

    <!-- SEARCH -->
    <input
      v-model="search"
      placeholder="🔍 Rechercher client"
      style="margin:10px 0; padding:8px; width:100%"
    />

    <!-- LOADING -->
    <div v-if="loading">Chargement...</div>

    <!-- EMPTY -->
    <div v-else-if="filteredOrders.length === 0">
      ❌ Aucune commande
    </div>

    <!-- ORDERS -->
    <div v-else>
      <div
        v-for="o in filteredOrders"
        :key="o.id"
        style="border:1px solid #ddd; padding:15px; margin-bottom:15px; border-radius:10px"
      >

        <p><b>👤 {{ o.customerName }}</b></p>
        <p>📧 {{ o.customerEmail }}</p>
        <p>📍 {{ o.customerAddress }}</p>

        <p>💰 {{ o.total }} {{ o.currency }}</p>
        <p>📦 {{ o.status }}</p>

        <p v-if="o.createdAt">
          🕒 {{
            new Date(
              o.createdAt.seconds
                ? o.createdAt.seconds * 1000
                : o.createdAt
            ).toLocaleString()
          }}
        </p>

        <!-- ITEMS -->
        <ul v-if="o.items.length">
          <li v-for="(item, i) in o.items" :key="i">
            {{ item.name }} — {{ item.qty }} × {{ item.price }}
          </li>
        </ul>

      </div>
    </div>

  </div>
</template>
