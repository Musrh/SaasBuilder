<script setup>
import { ref, onMounted } from "vue"
import { db } from "../firebase"
import { collection, onSnapshot } from "firebase/firestore"

const orders = ref([])
const loading = ref(true)

onMounted(() => {

  const q = collection(db, "orders")

  onSnapshot(
    q,
    (snap) => {

      orders.value = snap.docs.map((doc) => {
        const data = doc.data()

        return {
          id: doc.id,

          // 👤 CLIENT
          customerName: data.customerName ?? "Non défini",
          customerEmail: data.customerEmail ?? "Non défini",
          customerAddress: data.customerAddress ?? "Non défini",

          // 🏪 STORE
          ownerUid: data.ownerUid ?? "Non défini",
          storeUid: data.storeUid ?? "Non défini",
          siteSlug: data.siteSlug ?? "Non défini",

          // 💳 PAYMENT
          provider: data.provider ?? "unknown",
          status: data.status ?? "unknown",

          // 💰 INFOS
          total: data.total ?? 0,
          currency: data.currency ?? "€",
          itemCount: data.itemCount ?? 0,

          // 📅 DATE
          createdAt: data.createdAt ?? null,

          // 🛒 ITEMS SAFE
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
      console.error("❌ Firestore error:", err)
      loading.value = false
    }
  )
})

/* FORMAT DATE */
function formatDate(date) {
  if (!date) return "Non défini"

  try {
    return new Date(date).toLocaleString()
  } catch {
    return date
  }
}
</script>

<template>
  <div style="padding:20px">

    <h2>📦 Commandes</h2>

    <div v-if="loading">Chargement...</div>

    <div v-else-if="orders.length === 0">
      ❌ Aucune commande
    </div>

    <div v-else>

      <div
        v-for="o in orders"
        :key="o.id"
        style="border:1px solid #ddd; padding:15px; margin-bottom:20px; border-radius:10px"
      >

        <!-- HEADER -->
        <h3>🧾 Commande #{{ o.id }}</h3>

        <p><b>Status:</b> {{ o.status }}</p>
        <p><b>Provider:</b> {{ o.provider }}</p>

        <!-- CLIENT -->
        <hr>
        <h4>👤 Client</h4>

        <p><b>Nom:</b> {{ o.customerName }}</p>
        <p><b>Email:</b> {{ o.customerEmail }}</p>
        <p><b>Adresse:</b> {{ o.customerAddress }}</p>

        <!-- STORE -->
        <hr>
        <h4>🏪 Store</h4>

        <p><b>Owner UID:</b> {{ o.ownerUid }}</p>
        <p><b>Store UID:</b> {{ o.storeUid }}</p>
        <p><b>Slug:</b> {{ o.siteSlug }}</p>

        <!-- INFOS -->
        <hr>
        <h4>💰 Paiement</h4>

        <p><b>Total:</b> {{ o.total }} {{ o.currency }}</p>
        <p><b>Items:</b> {{ o.itemCount }}</p>
        <p><b>Date:</b> {{ formatDate(o.createdAt) }}</p>

        <!-- ITEMS -->
        <hr>
        <h4>🛒 Produits</h4>

        <div v-if="o.items.length">

          <div
            v-for="(item, i) in o.items"
            :key="i"
            style="border:1px solid #eee; padding:10px; margin-bottom:10px; border-radius:8px"
          >

            <!-- IMAGE -->
            <img
              v-if="item.image"
              :src="item.image"
              style="width:80px; height:80px; object-fit:cover; border-radius:6px"
            />

            <p><b>Nom:</b> {{ item.name }}</p>
            <p><b>Description:</b> {{ item.description }}</p>
            <p><b>Prix:</b> {{ item.price }} {{ item.currency }}</p>
            <p><b>Quantité:</b> {{ item.qty }}</p>

          </div>

        </div>

        <div v-else>
          ❌ Aucun produit
        </div>

      </div>

    </div>

  </div>
</template>
