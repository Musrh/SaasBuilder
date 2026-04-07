<script setup>
import { ref, onMounted, computed } from "vue"
import { db } from "../firebase"
import { collection, onSnapshot } from "firebase/firestore"
import { useRouter } from "vue-router"

const orders = ref([])
const loading = ref(true)
const search = ref("")

const router = useRouter()

onMounted(() => {
  const q = collection(db, "orders")

  onSnapshot(q, (snap) => {
    orders.value = snap.docs.map((doc) => {
      const data = doc.data()

      return {
        id: doc.id,

        customerName: data.customerName ?? "Non défini",
        customerEmail: data.customerEmail ?? "Non défini",
        customerAddress: data.customerAddress ?? "Non défini",

        ownerUid: data.ownerUid ?? "Non défini",
        storeUid: data.storeUid ?? "Non défini",
        siteSlug: data.siteSlug ?? "Non défini",

        provider: data.provider ?? "unknown",
        status: data.status ?? "unknown",

        total: data.total ?? 0,
        currency: data.currency ?? "€",
        itemCount: data.itemCount ?? 0,

        createdAt: data.createdAt ?? null,

        items: Array.isArray(data.items)
          ? data.items
          : data.items && typeof data.items === "object"
            ? Object.values(data.items)
            : []
      }
    })

    loading.value = false
  })
})

/* 🔎 FILTRE CLIENT */
const filteredOrders = computed(() => {
  if (!search.value) return orders.value

  return orders.value.filter(o =>
    o.customerName.toLowerCase().includes(search.value.toLowerCase())
  )
})

/* 📅 FORMAT DATE */
function formatDate(date) {
  if (!date) return "Non défini"

  try {
    return new Date(date).toLocaleString()
  } catch {
    return date
  }
}

/* 🔙 NAVIGATION */
function goDashboard() {
  router.push("/dashboard")
}
</script>

<template>
  <div style="padding:20px">

    <!-- 🔙 BOUTON -->
    <button
      @click="goDashboard"
      style="margin-bottom:15px; padding:8px 12px; background:#333; color:white; border-radius:6px"
    >
      ⬅ Retour Dashboard
    </button>

    <h2>📦 Commandes</h2>

    <!-- 🔎 FILTRE -->
    <input
      v-model="search"
      placeholder="🔎 Rechercher par nom client..."
      style="margin:10px 0; padding:8px; width:100%; max-width:300px"
    />

    <div v-if="loading">Chargement...</div>

    <div v-else-if="filteredOrders.length === 0">
      ❌ Aucune commande trouvée
    </div>

    <div v-else>

      <div
        v-for="o in filteredOrders"
        :key="o.id"
        style="border:1px solid #ddd; padding:15px; margin-bottom:20px; border-radius:10px"
      >

        <h3>🧾 Commande #{{ o.id }}</h3>

        <p><b>Status:</b> {{ o.status }}</p>
        <p><b>Provider:</b> {{ o.provider }}</p>

        <hr>
        <h4>👤 Client</h4>

        <p><b>Nom:</b> {{ o.customerName }}</p>
        <p><b>Email:</b> {{ o.customerEmail }}</p>
        <p><b>Adresse:</b> {{ o.customerAddress }}</p>

        <hr>
        <h4>💰 Paiement</h4>

        <p><b>Total:</b> {{ o.total }} {{ o.currency }}</p>
        <p><b>Items:</b> {{ o.itemCount }}</p>
        <p><b>Date:</b> {{ formatDate(o.createdAt) }}</p>

        <hr>
        <h4>🛒 Produits</h4>

        <div v-if="o.items.length">
          <div
            v-for="(item, i) in o.items"
            :key="i"
            style="border:1px solid #eee; padding:10px; margin-bottom:10px; border-radius:8px"
          >
            <img
              v-if="item.image"
              :src="item.image"
              style="width:80px; height:80px; object-fit:cover"
            />

            <p><b>{{ item.name }}</b></p>
            <p>{{ item.description }}</p>
            <p>{{ item.qty }} x {{ item.price }} {{ item.currency }}</p>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>
