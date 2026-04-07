<script setup>
import { ref, onMounted, computed } from "vue"
import { db } from "../firebase"
import { collection, onSnapshot } from "firebase/firestore"
import { useRouter } from "vue-router"

const router = useRouter()

const orders = ref([])
const loading = ref(true)
const search = ref("")

/* =========================================================
   🔥 READ ONLY FIRESTORE (NO WRITE)
========================================================= */
onMounted(() => {
  const q = collection(db, "orders")

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

          items: Array.isArray(data.items)
            ? data.items
            : []
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
   🔍 FILTER BY CLIENT NAME
========================================================= */
const filteredOrders = computed(() => {
  if (!search.value) return orders.value

  return orders.value.filter((o) =>
    o.customerName.toLowerCase().includes(search.value.toLowerCase())
  )
})

/* =========================================================
   🔙 BACK TO DASHBOARD
========================================================= */
function goDashboard() {
  router.push("/dashboard")
}
</script>

<template>
  <div style="padding:20px">

    <!-- HEADER -->
    <div style="display:flex; justify-content:space-between; align-items:center">
      <h2>📦 Commandes</h2>
      <button @click="goDashboard">🔙 Dashboard</button>
    </div>

    <!-- SEARCH -->
    <input
      v-model="search"
      placeholder="🔍 Rechercher par nom client"
      style="margin:10px 0; padding:8px; width:100%"
    />

    <!-- LOADING -->
    <div v-if="loading">Chargement...</div>

    <!-- EMPTY -->
    <div v-else-if="filteredOrders.length === 0">
      ❌ Aucune commande trouvée
    </div>

    <!-- ORDERS -->
    <div v-else>
      <div
        v-for="o in filteredOrders"
        :key="o.id"
        style="border:1px solid #ddd; padding:15px; margin-bottom:15px; border-radius:10px"
      >

        <p><b>ID:</b> {{ o.id }}</p>

        <p><b>👤 Nom:</b> {{ o.customerName }}</p>
        <p><b>📧 Email:</b> {{ o.customerEmail }}</p>
        <p><b>📍 Adresse:</b> {{ o.customerAddress }}</p>

        <p><b>💰 Total:</b> {{ o.total }} {{ o.currency }}</p>
        <p><b>📦 Statut:</b> {{ o.status }}</p>

        <p v-if="o.createdAt">
          <b>🕒 Date:</b>
          {{
            new Date(
              o.createdAt.seconds
                ? o.createdAt.seconds * 1000
                : o.createdAt
            ).toLocaleString()
          }}
        </p>

        <!-- ITEMS -->
        <div style="margin-top:10px">
          <b>🛒 Produits:</b>

          <ul v-if="o.items.length">
            <li v-for="(item, i) in o.items" :key="i">
              {{ item.name || "Produit" }}
              — {{ item.qty || 0 }} × {{ item.price || 0 }} {{ o.currency }}
            </li>
          </ul>

          <div v-else>
            ❌ Aucun produit
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
