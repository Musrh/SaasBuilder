<script setup>
import { ref, onMounted } from "vue"
import { db } from "../firebase"
import { collection, onSnapshot } from "firebase/firestore"

const orders = ref([])
const loading = ref(true)

onMounted(() => {
  console.log("🔥 FIRESTORE ORDERS START")

  const q = collection(db, "orders")

  onSnapshot(
    q,
    (snap) => {
      console.log("📦 TOTAL ORDERS =", snap.size)

      orders.value = snap.docs.map((doc) => {
        const data = doc.data()

        console.log("📄 RAW ORDER =", doc.id, data)
        console.log("📦 RAW ITEMS =", data.items)

        return {
          id: doc.id,

          // 🔥 champs sécurisés
          email: data.email ?? "❌ non défini",
          ownerId: data.ownerId ?? "❌ non défini",
          total: data.total ?? "❌ non défini",
          status: data.status ?? "unknown",

          // 🔥 FIX ULTRA IMPORTANT ITEMS
          items: Array.isArray(data.items)
            ? data.items
            : data.items && typeof data.items === "object"
              ? Object.values(data.items)
              : []
        }
      })

      loading.value = false
    },
    (err) => {
      console.error("❌ Firestore error:", err.code, err.message)
      loading.value = false
    }
  )
})
</script>

<template>
  <div style="padding:20px">

    <h2>🧪 Orders Firestore Debug</h2>

    <div v-if="loading">Chargement...</div>

    <div v-else-if="orders.length === 0">
      ❌ Aucune commande trouvée
    </div>

    <div v-else>
      <div
        v-for="o in orders"
        :key="o.id"
        style="border:1px solid #ddd; padding:12px; margin-bottom:12px; border-radius:8px"
      >

        <p><b>ID:</b> {{ o.id }}</p>

        <p>
          <b>Email:</b>
          <span :style="{ color: o.email.includes('❌') ? 'red' : 'black' }">
            {{ o.email }}
          </span>
        </p>

        <p><b>OwnerId:</b> {{ o.ownerId }}</p>

        <p>
          <b>Total:</b>
          <span :style="{ color: o.total === '❌ non défini' ? 'red' : 'green' }">
            {{ o.total }}
          </span>
        </p>

        <p><b>Status:</b> {{ o.status }}</p>

        <!-- ITEMS -->
        <div style="margin-top:10px">
          <b>Items:</b>

          <div v-if="o.items && o.items.length">
            <ul>
              <li v-for="(item, i) in o.items" :key="i">
                🛒 {{ item.name || 'Produit sans nom' }}
                — {{ item.qty || 0 }} x {{ item.price || 0 }}
              </li>
            </ul>
          </div>

          <div v-else>
            ❌ Aucun item
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
