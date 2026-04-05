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

        return {
          id: doc.id,

          // sécurité champs (évite undefined)
          email: data.email ?? "❌ non défini",
          ownerId: data.ownerId ?? "❌ non défini",
          total: data.total ?? "❌ non défini",
          status: data.status ?? "unknown",

          items: Array.isArray(data.items) ? data.items : [],

          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt ?? null
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
        style="border:1px solid #ddd; padding:10px; margin-bottom:10px"
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

        <p v-if="o.createdAt">
          <b>Date:</b> {{ o.createdAt }}
        </p>

        <div v-if="o.items.length">
          <b>Items:</b>
          <ul>
            <li v-for="(item, i) in o.items" :key="i">
              {{ item.name }} — {{ item.qty }} x {{ item.price }}
            </li>
          </ul>
        </div>

      </div>
    </div>

  </div>
</template>
