<!-- ============================================================
  AddProduct.vue
  src/components/AddProduct.vue
  Modal pour ajouter/modifier un produit.
  Émit @close quand terminé.
============================================================ -->
<script setup>
import { ref } from "vue"
import { auth, db } from "../firebase"
import { collection, addDoc } from "firebase/firestore"

const emit = defineEmits(["close"])

const form   = ref({ name: "", price: "", description: "", badge: "", stock: "", image: "" })
const saving = ref(false)
const error  = ref("")

const onFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { form.value.image = ev.target.result }
  reader.readAsDataURL(file)
  e.target.value = ""
}

const save = async () => {
  error.value = ""
  if (!form.value.name.trim())       { error.value = "Nom obligatoire.";  return }
  if (!form.value.price || Number(form.value.price) <= 0) { error.value = "Prix invalide."; return }
  const user = auth.currentUser
  if (!user) { error.value = "Connectez-vous d'abord."; return }
  saving.value = true
  try {
    // Sauvegarder dans products/ ET prodinfos/ (lu par l'assistant vocal)
    const productData = {
      name:        form.value.name.trim(),
      price:       Number(form.value.price),
      description: form.value.description.trim(),
      badge:       form.value.badge.trim(),
      stock:       form.value.stock !== "" ? Number(form.value.stock) : null,
      image:       form.value.image || "",
      storeUid:    user.uid,    // ← CRUCIAL pour que l'assistant trouve les produits
      createdBy:   user.uid,
      createdAt:   new Date().toISOString(),
    }
    // Collection products (catalogue)
    await addDoc(collection(db, "products"), productData)
    // Collection prodinfos (assistant vocal Groq)
    try {
      await addDoc(collection(db, "prodinfos"), productData)
    } catch(e2) { console.warn("prodinfos write:", e2.message) }
    emit("close")
  } catch(e) {
    error.value = "Erreur : " + e.message
  } finally { saving.value = false }
}
</script>

<template>
<div class="ap-overlay" @click.self="emit('close')">
  <div class="ap-box">
    <button class="ap-close" @click="emit('close')">✕</button>
    <h2 class="ap-title">➕ Nouveau produit</h2>

    <!-- Image -->
    <div class="ap-img-row">
      <div class="ap-img-wrap">
        <img v-if="form.image" :src="form.image" class="ap-img"/>
        <span v-else>📷</span>
      </div>
      <div class="ap-img-btns">
        <label class="ap-btn ap-upload">
          <input type="file" accept="image/*" @change="onFile" hidden/> 📁 Upload
        </label>
        <label class="ap-btn ap-camera">
          <input type="file" accept="image/*" capture="environment" @change="onFile" hidden/> 📷 Caméra
        </label>
        <button v-if="form.image" class="ap-btn ap-remove" @click="form.image=''">🗑</button>
      </div>
    </div>

    <!-- Champs -->
    <div class="ap-fields">
      <input v-model="form.name"        placeholder="Nom du produit *"  class="ap-input"/>
      <input v-model="form.price"       placeholder="Prix (€) *" type="number" min="0" step="0.01" class="ap-input"/>
      <textarea v-model="form.description" placeholder="Description..."  class="ap-input ap-ta" rows="2"></textarea>
      <div class="ap-row">
        <input v-model="form.badge" placeholder="Badge (Nouveau...)" class="ap-input"/>
        <input v-model="form.stock" placeholder="Stock" type="number" min="0" class="ap-input"/>
      </div>
    </div>

    <p v-if="error" class="ap-error">{{ error }}</p>

    <div class="ap-actions">
      <button class="ap-cancel" @click="emit('close')">Annuler</button>
      <button class="ap-save" @click="save" :disabled="saving">
        {{ saving ? "Sauvegarde..." : "Ajouter" }}
      </button>
    </div>
  </div>
</div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.ap-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:flex-end;justify-content:center}
@media(min-width:600px){.ap-overlay{align-items:center}}
.ap-box{background:white;border-radius:20px 20px 0 0;padding:24px 20px;width:100%;max-width:440px;max-height:92vh;overflow-y:auto;position:relative;font-family:'DM Sans',sans-serif}
@media(min-width:600px){.ap-box{border-radius:20px;max-height:88vh}}
.ap-close{position:absolute;top:14px;right:14px;background:#f3f4f6;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center}
.ap-title{font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:16px}
.ap-img-row{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.ap-img-wrap{width:72px;height:72px;border-radius:10px;border:2px solid #e5e7eb;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;flex-shrink:0}
.ap-img{width:100%;height:100%;object-fit:cover}
.ap-img-btns{display:flex;flex-wrap:wrap;gap:6px}
.ap-btn{padding:6px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;border:none;transition:all .15s}
.ap-upload{background:#ede9fe;color:#6c63ff}
.ap-camera{background:#ecfdf5;color:#059669}
.ap-remove{background:#fef2f2;color:#ef4444}
.ap-fields{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.ap-input{padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;width:100%;transition:border-color .15s;color:#374151}
.ap-input:focus{border-color:#6c63ff}
.ap-ta{resize:none}
.ap-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ap-error{color:#ef4444;font-size:12px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:7px;margin-bottom:10px}
.ap-actions{display:flex;gap:8px}
.ap-cancel{flex:1;padding:11px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:9px;cursor:pointer;font-size:14px;font-family:'DM Sans',sans-serif;color:#374151}
.ap-save{flex:2;padding:11px;background:#6c63ff;color:white;border:none;border-radius:9px;cursor:pointer;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif}
.ap-save:disabled{opacity:.6;cursor:not-allowed}
</style>
