<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div class="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center">

      <!-- ICON SUCCESS -->
      <div class="text-green-500 text-6xl mb-4">✅</div>

      <h1 class="text-2xl font-bold mb-2">
        Paiement réussi
      </h1>

      <p class="text-gray-500 mb-6">
        Merci pour votre commande 🎉
      </p>

      <!-- LOADING -->
      <div v-if="loading" class="text-gray-500">
        Chargement des détails...
      </div>

      <!-- ORDER INFO -->
      <div v-else-if="order" class="text-left bg-gray-50 p-4 rounded-xl">
        <p><strong>Email :</strong> {{ order.email }}</p>
        <p><strong>Montant :</strong> {{ order.montant }} €</p>
        <p><strong>Statut :</strong> {{ order.status }}</p>
        <p><strong>Plan :</strong> {{ order.plan || 'Basic' }}</p>
      </div>

      <!-- ERROR -->
      <div v-else class="text-red-500">
        Impossible de récupérer la commande
      </div>

      <button
        class="mt-6 bg-black text-white px-6 py-2 rounded-xl hover:bg-gray-800"
        @click="$router.push('/')"
      >
        Retour au site
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const route = useRoute();

const loading = ref(true);
const order = ref(null);

onMounted(async () => {
  try {
    const sessionId = route.query.session_id;

    if (!sessionId) {
      loading.value = false;
      return;
    }

    // 🔥 On cherche dans Firestore (orders SaaS master)
    const snapshot = await getDoc(
      doc(db, "orders", sessionId)
    );

    if (snapshot.exists()) {
      order.value = snapshot.data();
    }

  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>
