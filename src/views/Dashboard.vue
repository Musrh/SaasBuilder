<!-- ============================================================
  Dashboard.vue — SaasBuilder
  Espace propriétaire de store après connexion.
============================================================ -->
<template>
  <div class="db-root">

    <!-- ── HEADER ─────────────────────────────────────────────── -->
    <header class="db-header">
      <div class="db-brand">
        <span class="db-logo">🏗️</span>
        <span class="db-title">SaasBuilder</span>
      </div>
      <div class="db-header-right">
        <div class="db-user-pill">
          <span class="db-user-dot"></span>
          <span class="db-user-email">{{ user?.email }}</span>
        </div>
        <button @click="logout" class="db-logout-btn">Déconnexion</button>
      </div>
    </header>

    <!-- ── CONTENU ─────────────────────────────────────────────── -->
    <main class="db-main">

      <!-- Chargement -->
      <div v-if="loading" class="db-loading">
        <div class="db-spinner"></div>
        <p>Chargement de votre espace...</p>
      </div>

      <template v-else>

        <!-- ── COMPTE SUSPENDU (active: false) ───────────────────── -->
        <Transition name="db-fade">
          <div v-if="accountSuspended" class="db-suspended-overlay">
            <div class="db-suspended-card">
              <div class="db-suspended-icon">🔒</div>
              <h2 class="db-suspended-title">Compte suspendu</h2>
              <p class="db-suspended-msg">
                Votre compte a été suspendu car votre abonnement a expiré ou n'a pas été réglé.<br>
                Renouvelez votre abonnement Pro pour réactiver votre store et accéder au builder.
              </p>
              <button
                class="db-suspended-pay-btn"
                @click="payToReactivate"
                :disabled="planLoading"
              >
                <span v-if="planLoading">⏳ Redirection vers le paiement...</span>
                <span v-else>💳 Régler mon abonnement Pro — 10€/mois</span>
              </button>
              <p class="db-suspended-note">Paiement sécurisé via Stripe · Réactivation immédiate</p>
              <button class="db-suspended-logout" @click="logout">Déconnexion</button>
            </div>
          </div>
        </Transition>

        <!-- Plan expiré -->
        <div v-if="planExpired && userData?.plan !== 'free'" class="db-alert-expired">
          <span class="db-alert-icon">⚠️</span>
          <div>
            <strong>Plan {{ userData?.plan }} expiré</strong>
            <p>Renouvelez pour continuer à utiliser le builder.</p>
          </div>
          <button @click="renewPlan" class="db-btn db-btn-danger">Renouveler</button>
        </div>

        <!-- ── STATS ─────────────────────────────────────────── -->
        <div class="db-stats">

          <div class="db-stat-card">
            <div class="db-stat-icon" :class="planBgColor">
              {{ planEmoji }}
            </div>
            <div class="db-stat-body">
              <p class="db-stat-label">Plan actif</p>
              <p class="db-stat-val" :class="planTextColor">
                {{ (userData?.plan || 'free').toUpperCase() }}
              </p>
              <p class="db-stat-sub">
                {{ planExpired ? '❌ Expiré' : userData?.expiry ? `✓ jusqu'au ${expiryFormatted}` : '✓ Actif' }}
              </p>
            </div>
          </div>

          <div class="db-stat-card">
            <div class="db-stat-icon" :class="userData?.paye ? 'db-icon-green' : 'db-icon-red'">
              {{ userData?.paye ? '✓' : '✗' }}
            </div>
            <div class="db-stat-body">
              <p class="db-stat-label">Paiement</p>
              <p class="db-stat-val" :class="userData?.paye ? 'db-val-green' : 'db-val-red'">
                {{ userData?.paye ? 'Actif' : 'Non payé' }}
              </p>
              <p class="db-stat-sub">Abonnement SaasBuilder</p>
            </div>
          </div>

          <!-- Carte Stripe cliquable selon le plan -->
          <div
            class="db-stat-card"
            :class="userData?.plan !== 'free' ? 'db-stat-card-clickable' : ''"
            @click="userData?.plan !== 'free' ? connectStripe() : upgradeToPro()"
            style="cursor:pointer"
            :title="userData?.plan === 'free' ? 'Passer à Pro pour activer Stripe' : (hasPaymentConfig ? 'Reconfigurer Stripe' : 'Cliquez pour connecter Stripe')"
          >
            <div class="db-stat-icon" :class="hasPaymentConfig ? 'db-icon-green' : (userData?.plan === 'free' ? 'db-icon-gray' : 'db-icon-yellow')">
              {{ hasPaymentConfig ? '💳' : (userData?.plan === 'free' ? '🔒' : '⚙️') }}
            </div>
            <div class="db-stat-body">
              <p class="db-stat-label">Store Stripe</p>
              <p class="db-stat-val" :class="hasPaymentConfig ? 'db-val-green' : (userData?.plan === 'free' ? 'db-val-gray' : 'db-val-yellow')">
                {{ hasPaymentConfig ? 'Configuré' : (userData?.plan === 'free' ? 'Plan Pro requis' : 'À configurer ▶') }}
              </p>
              <p class="db-stat-sub">
                {{ userData?.plan === 'free' ? 'Passez à Pro' : (hasPaymentConfig ? 'Cliquer pour reconfigurer' : 'Cliquez pour connecter') }}
              </p>
            </div>
          </div>

          <div class="db-stat-card db-stat-card-orders" @click="toggleOrders">
            <div class="db-stat-icon db-icon-purple">📦</div>
            <div class="db-stat-body">
              <p class="db-stat-label">Commandes</p>
              <p class="db-stat-val db-val-purple">
                {{ ordersLoading ? '...' : ordersStats.total }}
              </p>
              <p class="db-stat-sub" v-if="!ordersLoading && ordersStats.total > 0">
                {{ ordersStats.revenue }} €
                · <span :style="userData?.plan !== 'free' ? 'color:#a78bfa' : 'color:#9ca3af'">
                    {{ (userData?.plan || 'free') !== 'free' ? 'Plan Pro' : 'Plan Free' }}
                  </span>
              </p>
              <p class="db-stat-sub" v-else>{{ showOrders ? 'Masquer ▲' : 'Voir ▼' }}</p>
            </div>
          </div>

        </div>

        <!-- ── LISTE DES COMMANDES ──────────────────────────── -->
        <Transition name="db-slide">
          <div v-if="showOrders" class="db-orders-panel">
            <div class="db-orders-header">
              <div>
                <h2 class="db-orders-title">📦 Commandes clients</h2>
                <div class="db-orders-source-tabs">
                  <button
                    class="db-source-tab active"
                  >
                    {{ (userData?.plan || 'free') !== 'free' ? '⚡ Pro' : '🆓 Free' }}
                    <span class="db-source-count">{{ ordersStats.total }}</span>
                  </button>
                  <span class="db-source-label">
                    {{ (userData?.plan || 'free') !== 'free' ? 'collection orders' : 'collection forders' }}
                  </span>
                </div>
              </div>
              <div class="db-orders-filters">
                <input
                  v-model="orderSearch"
                  placeholder="Email, produit, slug..."
                  class="db-search-input"
                />
                <select v-model="orderFilter" class="db-filter-select">
                  <option value="">Toutes</option>
                  <option value="paid">Payées</option>
                  <option value="pending">En attente</option>
                </select>
                <button
                  class="db-btn db-btn-outline"
                  @click="loadOrders(user.uid, userData?.plan ?? 'free')"
                  title="Actualiser"
                  :disabled="ordersLoading"
                >↻</button>
              </div>
            </div>

            <!-- Chargement commandes -->
            <div v-if="ordersLoading" class="db-orders-loading">
              <div class="db-spinner db-spinner-sm"></div>
              <p>Chargement des commandes...</p>
            </div>

            <!-- Erreur Firestore -->
            <div v-if="!ordersLoading && ordersError" class="db-orders-error">
              <span>⚠️</span>
              <p>{{ ordersError }}</p>
            </div>

            <!-- Aucune commande -->
            <div v-else-if="filteredOrders.length === 0" class="db-orders-empty">
              <span>📭</span>
              <p>{{ orders.length === 0 ? 'Aucune commande reçue pour le moment.' : 'Aucune commande ne correspond à votre recherche.' }}</p>
            </div>

            <!-- Tableau commandes -->
            <div v-else class="db-orders-list">
              <div
                v-for="order in filteredOrders"
                :key="order.id"
                class="db-order-card"
                :class="{ 'db-order-paid': order.status === 'paid' }"
              >
                <!-- Ligne principale -->
                <div class="db-order-main">
                  <div class="db-order-info">
                    <div class="db-order-email">
                      <span class="db-order-avatar">{{ (order.customerEmail || order.clientEmail || '?')[0].toUpperCase() }}</span>
                      <div>
                        <p class="db-order-name">{{ order.customerName || order.clientName || 'Client anonyme' }}</p>
                        <p class="db-order-email-text">{{ order.customerEmail || order.clientEmail || '—' }}</p>
                      </div>
                    </div>
                    <div class="db-order-meta">
                      <span class="db-order-date">{{ formatDate(order.createdAt) }}</span>
                      <span
                        class="db-order-status"
                        :class="order.status === 'paid' ? 'db-status-paid' : 'db-status-pending'"
                      >
                        {{ order.status === 'paid' ? '✓ Payée' : '⏳ En attente' }}
                      </span>
                    </div>
                  </div>
                  <div class="db-order-right">
                    <p class="db-order-total">{{ formatTotal(order) }}</p>
                    <div style="display:flex;align-items:center;gap:6px">
                      <span
                        class="db-order-plan-badge"
                        :class="order._source === 'orders' ? 'db-plan-pro-badge' : 'db-plan-free-badge'"
                      >{{ order._source === 'orders' ? 'PRO' : 'FREE' }}</span>
                      <p class="db-order-provider">{{ order.provider || 'stripe' }}</p>
                    </div>
                    <button
                      class="db-order-toggle"
                      @click="toggleOrderDetail(order.id)"
                    >
                      {{ openOrderId === order.id ? '▲' : '▼' }}
                    </button>
                  </div>
                </div>

                <!-- Détail articles -->
                <Transition name="db-slide">
                  <div v-if="openOrderId === order.id" class="db-order-detail">
                    <div class="db-order-items-title">Articles commandés</div>
                    <div
                      v-if="order.items?.length"
                      class="db-order-items"
                    >
                      <div
                        v-for="(item, i) in order.items"
                        :key="i"
                        class="db-order-item"
                      >
                        <div class="db-item-img">
                          <img v-if="item.image" :src="item.image" :alt="item.name"/>
                          <span v-else>🛍️</span>
                        </div>
                        <div class="db-item-info">
                          <p class="db-item-name">{{ item.name }}</p>
                          <p class="db-item-price">{{ item.price }}{{ item.currency || '€' }} × {{ item.qty }}</p>
                        </div>
                        <p class="db-item-subtotal">
                          {{ (parseFloat(item.price || 0) * (item.qty || 1)).toFixed(2) }}{{ item.currency || '€' }}
                        </p>
                      </div>
                    </div>
                    <p v-else class="db-no-items">Détail des articles non disponible</p>
                    <div v-if="order.siteSlug || order.storeName" class="db-order-addr">
                      🔗 <strong style="color:#a78bfa">{{ order.siteSlug || order.storeName }}</strong>
                    </div>
                    <div v-if="order.customerAddress || order.adresseLivraison" class="db-order-addr">
                      📍 {{ order.customerAddress || order.adresseLivraison }}
                    </div>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Pagination simple -->
            <div v-if="filteredOrders.length > 0" class="db-orders-footer">
              <p class="db-orders-count">
                {{ filteredOrders.length }} commande{{ filteredOrders.length > 1 ? 's' : '' }}
                — Total : <strong>{{ totalRevenue }}</strong>
              </p>
              <button class="db-btn db-btn-outline" @click="exportOrdersCSV">
                📥 Exporter CSV
              </button>
            </div>
          </div>
        </Transition>

        <!-- ── PAIEMENTS ─────────────────────────────────────── -->
        <div class="db-payments-card">
          <h2 class="db-payments-title">💳 Paiements & Abonnement</h2>
          <div class="db-payments-row">

            <!-- Toujours visible : statut plan + upgrade si free -->
            <div class="db-payment-block">
              <p class="db-stat-label" style="font-size:11px;color:#5a5a6a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Abonnement SaasBuilder</p>
              <p class="db-payment-desc" style="margin-bottom:10px">
                <span v-if="userData?.plan === 'free'">Plan <strong style="color:#9ca3af">Gratuit</strong> — fonctionnalités limitées.</span>
                <span v-else>Plan <strong style="color:#60a5fa">{{ userData?.plan?.toUpperCase() }}</strong>
                  — {{ userData?.paye ? '✓ Actif' : '⚠ Non payé' }}
                </span>
              </p>
              <button
                @click="upgradeToPro"
                :disabled="isProActive"
                class="db-btn db-btn-upgrade"
                :title="isProActive ? 'Plan Pro déjà actif' : ''"
              >
                <span v-if="isProActive">✓ Plan Pro actif</span>
                <span v-else-if="userData?.plan === 'free'">🚀 Passer à Pro — 10€/mois</span>
                <span v-else>🔄 Renouveler l'abonnement</span>
              </button>
            </div>

            <!-- Stripe Connect : visible selon plan -->
            <div class="db-payment-block">
              <p class="db-stat-label" style="font-size:11px;color:#5a5a6a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Paiements clients (Stripe)</p>
              <p class="db-payment-desc" style="margin-bottom:10px">
                <span v-if="userData?.plan === 'free'" style="color:#5a5a6a">
                  🔒 Disponible avec le plan Pro.
                </span>
                <span v-else-if="hasPaymentConfig" class="db-stripe-ok">
                  ✓ Stripe connecté — vos clients peuvent payer.
                </span>
                <span v-else>
                  ⚠ Non configuré — connectez Stripe pour recevoir des paiements.
                </span>
              </p>
              <button
                @click="connectStripe"
                :disabled="userData?.plan === 'free'"
                class="db-btn db-btn-stripe"
                :title="userData?.plan === 'free' ? 'Nécessite le plan Pro' : ''"
              >
                💳 {{ hasPaymentConfig ? 'Reconfigurer Stripe' : 'Connecter Stripe' }}
              </button>
            </div>

          </div>
        </div>

        <!-- ── BUILDER ─────────────────────────────────────── -->
        <div class="db-builder-card">
          <div class="db-builder-left">
            <h2 class="db-builder-title">🏗️ Builder de site</h2>
            <p class="db-builder-desc">Créez et gérez votre boutique en ligne</p>
            <div v-if="userData?.publishedSlug" class="db-published-info">
              <span class="db-published-dot"></span>
              <span>Publié sur </span>
              <a
                :href="`https://mronlinestores.com/#/${userData.publishedSlug}`"
                target="_blank"
                class="db-published-link"
              >
                {{ userData.publishedSlug }}
              </a>
            </div>
          </div>
          <button
            @click="goToBuilder"
            :disabled="!canAccessBuilder"
            class="db-btn db-btn-primary db-btn-lg"
          >
            {{ canAccessBuilder ? 'Accéder au Builder →' : '🔒 Plan requis' }}
          </button>
        </div>

        <!-- ── ACTIONS ─────────────────────────────────────── -->
        <div class="db-actions-grid">

          <button @click="goToBuilder" :disabled="!canAccessBuilder" class="db-action-card">
            <span class="db-action-icon">✏️</span>
            <div>
              <p class="db-action-title">Modifier le site</p>
              <p class="db-action-desc">Builder visuel drag & drop</p>
            </div>
          </button>

          <button @click="toggleOrders" class="db-action-card">
            <span class="db-action-icon">📦</span>
            <div>
              <p class="db-action-title">
                Commandes
                <span v-if="orders.length > 0" class="db-badge">{{ orders.length }}</span>
              </p>
              <p class="db-action-desc">Suivez les achats clients</p>
            </div>
          </button>

          <button @click="showPlanModal=true" class="db-action-card">
            <span class="db-action-icon">⭐</span>
            <div>
              <p class="db-action-title">Changer de plan</p>
              <p class="db-action-desc">{{ isProActive ? 'Pro actif ✓' : 'Passez à Pro' }}</p>
            </div>
          </button>

          <button
            v-if="userData?.publishedSlug"
            @click="openStore"
            class="db-action-card"
          >
            <span class="db-action-icon">🌐</span>
            <div>
              <p class="db-action-title">Voir le store</p>
              <p class="db-action-desc">mronlinestores.com/#/{{ userData.publishedSlug }}</p>
            </div>
          </button>

        </div>

      </template>
    </main>
  </div>
  <!-- ── MODAL CHOIX DE PLAN ────────────────────────────────── -->
  <Transition name="db-slide">
    <div v-if="showPlanModal" class="db-modal-overlay" @click.self="showPlanModal=false">
      <div class="db-modal-box">

        <button class="db-modal-close" @click="showPlanModal=false">✕</button>

        <div class="db-modal-header">
          <span class="db-modal-icon">⭐</span>
          <h2 class="db-modal-title">Choisir votre plan</h2>
          <p class="db-modal-sub">Sélectionnez le plan adapté à votre activité</p>
        </div>

        <!-- Cartes plans -->
        <div class="db-plan-grid">

          <!-- Plan FREE -->
          <div
            class="db-plan-card"
            :class="{ 'db-plan-selected': planChoix === 'free', 'db-plan-current': userData?.plan === 'free' && !isProActive }"
            @click="planChoix = 'free'"
          >
            <div class="db-plan-badge" v-if="userData?.plan === 'free' && !isProActive">Actuel</div>
            <div class="db-plan-name">🆓 Gratuit</div>
            <div class="db-plan-price">0€<span>/mois</span></div>
            <ul class="db-plan-features">
              <li>✓ 1 page</li>
              <li>✓ Builder visuel</li>
              <li>✗ Paiements clients</li>
              <li>✗ Multi-pages</li>
            </ul>
          </div>

          <!-- Plan PRO -->
          <div
            class="db-plan-card db-plan-pro"
            :class="{ 'db-plan-selected': planChoix === 'pro', 'db-plan-current': isProActive }"
            @click="planChoix = 'pro'"
          >
            <div class="db-plan-badge db-plan-badge-pro" v-if="isProActive">Actuel ✓</div>
            <div class="db-plan-badge db-plan-badge-pro" v-else>Recommandé</div>
            <div class="db-plan-name">⚡ Pro</div>
            <div class="db-plan-price">10€<span>/mois</span></div>
            <ul class="db-plan-features">
              <li>✓ Multi-pages illimité</li>
              <li>✓ Builder complet</li>
              <li>✓ Paiements Stripe</li>
              <li>✓ Catalogue produits</li>
              <li>✓ Support prioritaire</li>
            </ul>
          </div>

        </div>

        <!-- Résumé du choix -->
        <div class="db-plan-summary">
          <div class="db-plan-summary-row">
            <span>Plan sélectionné</span>
            <strong :class="planChoix === 'pro' ? 'db-val-blue' : 'db-val-gray'">
              {{ planChoix === 'pro' ? 'Pro — 10€/mois' : 'Gratuit — 0€' }}
            </strong>
          </div>
          <div v-if="isProActive && planChoix === 'pro'" class="db-plan-already-active">
            ✓ Ce plan est déjà actif sur votre compte
          </div>
        </div>

        <!-- Bouton confirmation -->
        <button
          @click="confirmPlan"
          :disabled="planLoading || planChoix === 'free' || (isProActive && planChoix === 'pro')"
          class="db-btn db-btn-confirm"
        >
          <span v-if="planLoading">⏳ Redirection vers le paiement...</span>
          <span v-else-if="planChoix === 'free'">Plan gratuit — aucun paiement requis</span>
          <span v-else-if="isProActive && planChoix === 'pro'">✓ Plan Pro déjà actif</span>
          <span v-else>Confirmer et payer 10€/mois →</span>
        </button>

        <p class="db-plan-note">
          Paiement sécurisé via Stripe. Annulable à tout moment.
        </p>

      </div>
    </div>
  </Transition>

  <!-- ── MODAL CHOIX DU PAYS (Stripe Connect) ─────────────────── -->
  <Transition name="db-fade">
    <div v-if="showCountryModal" class="db-modal-overlay" @click.self="showCountryModal=false">
      <div class="db-modal-box db-country-modal-box">

        <button class="db-modal-close" @click="showCountryModal=false">✕</button>

        <div class="db-modal-header">
          <span class="db-modal-icon">🌍</span>
          <h2 class="db-modal-title">Choisir votre pays</h2>
          <p class="db-modal-sub">Sélectionnez le pays dans lequel votre entreprise est légalement active</p>
        </div>

        <input
          v-model="countrySearch"
          class="db-country-search"
          placeholder="🔍 Rechercher un pays..."
        />

        <div class="db-country-list">
          <button
            v-for="c in filteredCountries"
            :key="c.code"
            class="db-country-item"
            :class="{ 'db-country-selected': selectedCountry === c.code }"
            @click="selectedCountry = c.code"
          >
            <span class="db-country-flag">{{ c.flag }}</span>
            <span class="db-country-name">{{ c.name }}</span>
            <span v-if="selectedCountry === c.code" class="db-country-check">✓</span>
          </button>
          <p v-if="filteredCountries.length === 0" class="db-country-empty">Aucun pays trouvé</p>
        </div>

        <button
          class="db-btn db-btn-confirm"
          :disabled="!selectedCountry || stripeConnectLoading"
          @click="confirmCountryAndConnect"
          style="margin-top:16px"
        >
          <span v-if="stripeConnectLoading">⏳ Connexion à Stripe...</span>
          <span v-else-if="!selectedCountry">Sélectionnez un pays pour continuer</span>
          <span v-else>Continuer avec {{ COUNTRIES.find(c => c.code === selectedCountry)?.name }} →</span>
        </button>

        <p class="db-plan-note">Vous serez redirigé vers Stripe pour finaliser la connexion.</p>

      </div>
    </div>
  </Transition>

</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { auth, db } from "../firebase"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { signOut } from "firebase/auth"

const BACKEND     = "https://backendfinal-production-afd2.up.railway.app"

const router      = useRouter()
const user        = ref(null)
const userData    = ref(null)
const loading     = ref(true)

// ── Modal choix de plan ───────────────────────────────────────
const showPlanModal  = ref(false)
const planChoix      = ref("pro")    // plan sélectionné dans le modal
const planLoading    = ref(false)

// ── Modal sélection du pays (Stripe Connect) ──────────────────
const showCountryModal    = ref(false)
const selectedCountry     = ref("")
const countrySearch       = ref("")
const stripeConnectLoading = ref(false)

const COUNTRIES = [
  // Francophones en premier
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "BE", flag: "🇧🇪", name: "Belgique" },
  { code: "CH", flag: "🇨🇭", name: "Suisse" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "MA", flag: "🇲🇦", name: "Maroc" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire" },
  // Europe
  { code: "DE", flag: "🇩🇪", name: "Allemagne" },
  { code: "AT", flag: "🇦🇹", name: "Autriche" },
  { code: "BG", flag: "🇧🇬", name: "Bulgarie" },
  { code: "CY", flag: "🇨🇾", name: "Chypre" },
  { code: "HR", flag: "🇭🇷", name: "Croatie" },
  { code: "DK", flag: "🇩🇰", name: "Danemark" },
  { code: "EE", flag: "🇪🇪", name: "Estonie" },
  { code: "FI", flag: "🇫🇮", name: "Finlande" },
  { code: "GR", flag: "🇬🇷", name: "Grèce" },
  { code: "HU", flag: "🇭🇺", name: "Hongrie" },
  { code: "IE", flag: "🇮🇪", name: "Irlande" },
  { code: "IS", flag: "🇮🇸", name: "Islande" },
  { code: "IT", flag: "🇮🇹", name: "Italie" },
  { code: "LV", flag: "🇱🇻", name: "Lettonie" },
  { code: "LI", flag: "🇱🇮", name: "Liechtenstein" },
  { code: "LT", flag: "🇱🇹", name: "Lituanie" },
  { code: "MT", flag: "🇲🇹", name: "Malte" },
  { code: "NO", flag: "🇳🇴", name: "Norvège" },
  { code: "NL", flag: "🇳🇱", name: "Pays-Bas" },
  { code: "PL", flag: "🇵🇱", name: "Pologne" },
  { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "CZ", flag: "🇨🇿", name: "République tchèque" },
  { code: "RO", flag: "🇷🇴", name: "Roumanie" },
  { code: "GB", flag: "🇬🇧", name: "Royaume-Uni" },
  { code: "SK", flag: "🇸🇰", name: "Slovaquie" },
  { code: "SI", flag: "🇸🇮", name: "Slovénie" },
  { code: "ES", flag: "🇪🇸", name: "Espagne" },
  { code: "SE", flag: "🇸🇪", name: "Suède" },
  // Amériques
  { code: "US", flag: "🇺🇸", name: "États-Unis" },
  { code: "MX", flag: "🇲🇽", name: "Mexique" },
  { code: "BR", flag: "🇧🇷", name: "Brésil" },
  // Asie-Pacifique
  { code: "AU", flag: "🇦🇺", name: "Australie" },
  { code: "NZ", flag: "🇳🇿", name: "Nouvelle-Zélande" },
  { code: "JP", flag: "🇯🇵", name: "Japon" },
  { code: "SG", flag: "🇸🇬", name: "Singapour" },
  { code: "HK", flag: "🇭🇰", name: "Hong Kong" },
  { code: "MY", flag: "🇲🇾", name: "Malaisie" },
  { code: "TH", flag: "🇹🇭", name: "Thaïlande" },
  { code: "IN", flag: "🇮🇳", name: "Inde" },
  // Moyen-Orient & Afrique
  { code: "AE", flag: "🇦🇪", name: "Émirats arabes unis" },
  { code: "IL", flag: "🇮🇱", name: "Israël" },
  { code: "ZA", flag: "🇿🇦", name: "Afrique du Sud" },
  { code: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "GH", flag: "🇬🇭", name: "Ghana" },
  { code: "TN", flag: "🇹🇳", name: "Tunisie" },
]

const filteredCountries = computed(() => {
  const q = countrySearch.value.trim().toLowerCase()
  if (!q) return COUNTRIES
  return COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  )
})

// ── Commandes ──────────────────────────────────────────────────
const orders        = ref([])
const ordersLoading = ref(false)
const ordersError   = ref("")
const showOrders    = ref(false)
const openOrderId   = ref(null)
const orderSearch   = ref("")
const orderFilter   = ref("")
const ordersStats   = ref({ total: 0, free: 0, pro: 0, revenue: 0 })

// ── Compte suspendu (active === false dans Firestore) ──────────
const accountSuspended = computed(() =>
  userData.value !== null && userData.value?.active === false
)

// ── Computed plan ──────────────────────────────────────────────
const planExpired = computed(() => {
  if (!userData.value) return false
  if (userData.value.plan === "free") return false
  // expiry null/0/absent = pas expiré (webhook Stripe peut ne pas l'écrire)
  const exp = userData.value.expiry
  if (!exp || exp === 0 || exp === null) return false
  return exp < Date.now()
})

const canAccessBuilder = computed(() => {
  if (!userData.value) return false
  if (userData.value.plan === "free") return true
  // Pro payé : accès même si expiry absent (passage Free→Pro récent)
  return userData.value.paye === true && !planExpired.value
})

const expiryFormatted = computed(() => {
  if (!userData.value?.expiry) return "—"
  return new Date(userData.value.expiry).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric"
  })
})

const planEmoji = computed(() => {
  const p = userData.value?.plan || "free"
  return p === "free" ? "🆓" : p === "pro" ? "⚡" : "💎"
})

const planBgColor    = computed(() => ({
  "db-icon-gray":   userData.value?.plan === "free",
  "db-icon-blue":   userData.value?.plan === "pro",
  "db-icon-purple": userData.value?.plan === "premium",
}))

const planTextColor  = computed(() => ({
  "db-val-gray":    userData.value?.plan === "free",
  "db-val-blue":    userData.value?.plan === "pro",
  "db-val-purple":  userData.value?.plan === "premium",
}))

const hasPaymentConfig = computed(() => {
  const cfg = userData.value?.storePaymentConfig?.stripe
  return cfg && cfg.publishableKey && cfg.publishableKey.length > 5
})

// Plan Pro actuellement actif (payé + non expiré)
const isProActive = computed(() => {
  const d = userData.value
  if (!d) return false
  if (d.plan === "free") return false
  const notExpired = !d.expiry || d.expiry > Date.now()
  return d.paye === true && notExpired
})

// ── Commandes filtrées ─────────────────────────────────────────
const filteredOrders = computed(() => {
  let list = [...orders.value]
  if (orderFilter.value) {
    list = list.filter(o => o.status === orderFilter.value)
  }
  if (orderSearch.value.trim()) {
    const q = orderSearch.value.toLowerCase()
    list = list.filter(o =>
      (o.customerEmail || o.email       || "").toLowerCase().includes(q) ||
      (o.customerName  || o.clientName  || "").toLowerCase().includes(q) ||
      (o.siteSlug      || "").toLowerCase().includes(q) ||
      (o.items || []).some(i => (i.name || "").toLowerCase().includes(q))
    )
  }
  return list
})

const totalRevenue = computed(() => {
  const sum = filteredOrders.value.reduce((acc, o) => {
    const t = parseFloat(o.total || 0)
    return acc + (isNaN(t) ? 0 : t)
  }, 0)
  return sum.toFixed(2) + " €"
})

// ── Chargement données ─────────────────────────────────────────
onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) { router.push("/auth"); return }
    user.value = u
    try {
      const snap = await getDoc(doc(db, "users", u.uid))
      if (snap.exists()) userData.value = snap.data()
    } catch(e) { console.error(e) }
    loading.value = false
    // Charger les commandes en passant le plan explicitement (évite le problème de timing)
    loadOrders(u.uid, userData.value?.plan ?? "free")
  })
})

// ── Charger les commandes du propriétaire ──────────────────────
// Interroge les DEUX collections en parallèle et affiche tout ce qui est trouvé.
// Le plan détermine la source principale, mais les deux sont essayées.

const toMs = (v) => {
  if (!v) return 0
  if (v?.toDate)  return v.toDate().getTime()
  if (v?.seconds) return v.seconds * 1000
  return new Date(v).getTime()
}

const loadOrders = async (uid, plan) => {
  ordersLoading.value = true
  ordersError.value   = ""

  const currentPlan = plan ?? userData.value?.plan ?? "free"
  const log = { errorForders: null, errorOrders: null }

  const results = []

  // ── forders (plan Free) ─────────────────────────────────────
  try {
    const snap = await getDocs(
      query(collection(db, "forders"), where("ownerUid", "==", uid))
    )
    log.forders = snap.size
    snap.docs.forEach(d =>
      results.push({ id: d.id, _source: "forders", ...d.data() })
    )
  } catch(e) {
    log.errorForders = `${e.code || e.message}`
  }

  // ── orders (plan Pro) ───────────────────────────────────────
  try {
    const snap = await getDocs(
      query(collection(db, "orders"), where("ownerUid", "==", uid))
    )
    log.orders = snap.size
    snap.docs.forEach(d =>
      results.push({ id: d.id, _source: "orders", ...d.data() })
    )
  } catch(e) {
    log.errorOrders = `${e.code || e.message}`
  }

  // Dédupliquer par id Firestore
  const seen   = new Set()
  const unique = results.filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true })

  // Tri par date décroissante
  orders.value = unique.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))

  if (orders.value.length === 0 && (log.errorForders || log.errorOrders)) {
    ordersError.value = [
      log.errorForders ? `forders : ${log.errorForders}` : "",
      log.errorOrders  ? `orders : ${log.errorOrders}`   : "",
    ].filter(Boolean).join(" | ")
  }

  ordersStats.value = {
    total:   orders.value.length,
    pro:     orders.value.filter(o => o._source === "orders").length,
    free:    orders.value.filter(o => o._source === "forders").length,
    revenue: orders.value.reduce((acc, o) => acc + parseFloat(o.total || 0), 0).toFixed(2)
  }

  ordersLoading.value = false
}

// ── Actions ────────────────────────────────────────────────────
const toggleOrders = () => {
  showOrders.value = !showOrders.value
  window.scrollTo({ top: 200, behavior: "smooth" })
}

const toggleOrderDetail = (id) => {
  openOrderId.value = openOrderId.value === id ? null : id
}

const openStore = () => {
  window.open(`https://mronlinestores.com/#/${userData.value.publishedSlug}`, "_blank")
}

const goToBuilder = () => {
  router.push("/saasgenerator")
}
  
  

const goToPlans = () => { showPlanModal.value = true }

// Paiement direct depuis la modale de suspension (toujours plan Pro)
const payToReactivate = async () => {
  planLoading.value = true
  try {
    const res  = await fetch(`${BACKEND}/create-billing-session`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:    user.value.email,
        plan:     "pro",
        ownerUid: user.value.uid,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) {
      alert(data.error || "Erreur lors de la création de la session de paiement")
      return
    }
    window.location.href = data.url
  } catch(err) {
    console.error("payToReactivate:", err)
    alert("Erreur réseau. Vérifiez votre connexion.")
  } finally {
    planLoading.value = false
  }
}

// Confirme et lance le paiement Stripe pour le plan choisi
const confirmPlan = async () => {
  if (planChoix.value === 'free') return
  if (isProActive.value && planChoix.value === 'pro') return
  planLoading.value = true
  try {
    const res  = await fetch(`${BACKEND}/create-billing-session`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:    user.value.email,
        plan:     planChoix.value,
        ownerUid: user.value.uid,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) {
      alert(data.error || "Erreur lors de la création de la session de paiement")
      return
    }
    window.location.href = data.url
  } catch(err) {
    console.error("confirmPlan:", err)
    alert("Erreur réseau. Vérifiez votre connexion.")
  } finally {
    planLoading.value = false
  }
}

const renewPlan = () => {
  const plan  = userData.value?.plan || "pro"
  const price = plan === "pro" ? 10 : 20
  router.push({ path: "/panier", query: { plan, price } })
}

// ── Upgrade vers Pro — logique originale ─────────────────────
const upgradeToPro = async () => {
  try {
    const res  = await fetch(`${BACKEND}/create-billing-session`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:    user.value.email,
        plan:     "pro",
        ownerUid: user.value.uid,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) { alert(data.error || "Erreur paiement"); return }
    window.location.href = data.url
  } catch(err) {
    console.error(err)
    alert("Erreur upgrade Pro")
  }
}

// ── Stripe Connect — ouvre la modale de sélection du pays ────
const connectStripe = () => {
  selectedCountry.value  = ""
  countrySearch.value    = ""
  showCountryModal.value = true
}

// Appelée après la sélection du pays dans la modale
const confirmCountryAndConnect = async () => {
  if (!selectedCountry.value) return
  stripeConnectLoading.value = true
  try {
    const res  = await fetch(`${BACKEND}/create-connect-account`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerUid: user.value.uid,
        email:    user.value.email,
        country:  selectedCountry.value,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) { alert(data.error || "Erreur Stripe Connect"); return }
    window.location.href = data.url
  } catch(err) {
    console.error(err)
    alert("Erreur connexion Stripe")
  } finally {
    stripeConnectLoading.value = false
  }
}

const logout = async () => {
  await signOut(auth)
  localStorage.removeItem("planChoisi")
  router.push("/")
}

// ── Formatage ──────────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return "—"
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return isNaN(d) ? "—" : d.toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

const formatTotal = (order) => {
  const t = parseFloat(order.total || 0)
  if (!isNaN(t) && t > 0) return `${t.toFixed(2)} ${order.currency || "€"}`
  if (order.items?.length) {
    const sum = order.items.reduce((acc, i) => acc + parseFloat(i.price || 0) * (i.qty || 1), 0)
    return `${sum.toFixed(2)} €`
  }
  return "—"
}

// ── Export CSV des commandes ───────────────────────────────────
const exportOrdersCSV = () => {
  const rows = [
    ["Date","Client","Email","Total","Statut","Produits","Adresse"],
    ...filteredOrders.value.map(o => [
      formatDate(o.createdAt),
      o.customerName  || o.clientName  || "",
      o.customerEmail || o.clientEmail || "",
      formatTotal(o),
      o.status || "",
      (o.items || []).map(i => `${i.name}×${i.qty}`).join(" | "),
      o.customerAddress || o.adresseLivraison || "",
    ])
  ]
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `commandes-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.db-root {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%);
  font-family: 'DM Sans', sans-serif;
  color: #f0f0f0;
}

/* ── Header ────────────────────────────────────────────────── */
.db-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 60px;
  background: rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.08);
  position: sticky; top: 0; z-index: 100;
  backdrop-filter: blur(12px);
}
.db-brand { display: flex; align-items: center; gap: 10px; }
.db-logo  { font-size: 22px; }
.db-title { font-size: 16px; font-weight: 700; color: #fff; }
.db-header-right { display: flex; align-items: center; gap: 12px; }
.db-user-pill {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  border-radius: 100px; padding: 5px 12px;
}
.db-user-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #22c55e; flex-shrink: 0;
}
.db-user-email { font-size: 12px; color: #a0a0b0; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-logout-btn {
  font-size: 12px; color: #8a8a9a; background: transparent;
  border: 1px solid rgba(255,255,255,.12); border-radius: 8px;
  padding: 6px 12px; cursor: pointer; transition: .15s;
}
.db-logout-btn:hover { color: #fff; border-color: rgba(255,255,255,.3); }

/* ── Main ──────────────────────────────────────────────────── */
.db-main {
  max-width: 900px; margin: 0 auto;
  padding: 28px 20px 60px;
  display: flex; flex-direction: column; gap: 20px;
}

/* ── Loading ───────────────────────────────────────────────── */
.db-loading {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 80px 0; color: #8a8a9a;
}
.db-spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(108,99,255,.2);
  border-top-color: #6c63ff;
  border-radius: 50%; animation: db-spin .7s linear infinite;
}
.db-spinner-sm { width: 22px; height: 22px; border-width: 2px; }
@keyframes db-spin { to { transform: rotate(360deg); } }

/* ── Alert expiré ──────────────────────────────────────────── */
/* ── Compte suspendu ─────────────────────────────────────────── */
.db-suspended-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(10,10,20,.85);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.db-suspended-card {
  background: #1a1a2e; border: 1px solid rgba(239,68,68,.25);
  border-radius: 20px; padding: 48px 40px; max-width: 460px; width: 100%;
  text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,.5);
}
.db-suspended-icon { font-size: 52px; margin-bottom: 16px; }
.db-suspended-title {
  font-size: 22px; font-weight: 700; color: #f0f0f0; margin-bottom: 12px;
}
.db-suspended-msg {
  font-size: 14px; color: #8a8a9a; line-height: 1.7; margin-bottom: 28px;
}
.db-suspended-pay-btn {
  width: 100%; padding: 15px; margin-bottom: 10px;
  background: linear-gradient(135deg, #6c63ff, #a78bfa);
  color: white; border: none; border-radius: 12px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: all .2s;
}
.db-suspended-pay-btn:hover:not(:disabled) {
  transform: translateY(-1px); box-shadow: 0 6px 20px rgba(108,99,255,.4);
}
.db-suspended-pay-btn:disabled { opacity: .6; cursor: not-allowed; }
.db-suspended-note { font-size: 11px; color: #5a5a6a; margin-bottom: 20px; }
.db-suspended-logout {
  background: none; border: none; color: #5a5a6a;
  font-size: 13px; cursor: pointer; font-family: inherit;
  text-decoration: underline; transition: color .15s;
}
.db-suspended-logout:hover { color: #9ca3af; }
.db-fade-enter-active, .db-fade-leave-active { transition: opacity .25s ease; }
.db-fade-enter-from, .db-fade-leave-to { opacity: 0; }

.db-alert-expired {
  display: flex; align-items: center; gap: 14px;
  background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3);
  border-radius: 14px; padding: 16px 20px;
}
.db-alert-icon { font-size: 24px; flex-shrink: 0; }
.db-alert-expired > div { flex: 1; }
.db-alert-expired strong { font-size: 15px; color: #ef4444; }
.db-alert-expired p { font-size: 13px; color: #9ca3af; margin-top: 2px; }

/* ── Stats ─────────────────────────────────────────────────── */
.db-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}
.db-stat-card {
  display: flex; align-items: center; gap: 14px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px; padding: 18px 16px;
  transition: .2s;
}
.db-stat-card-orders {
  cursor: pointer;
  border-color: rgba(108,99,255,.3);
  background: rgba(108,99,255,.06);
}
.db-stat-card-orders:hover {
  background: rgba(108,99,255,.12);
  transform: translateY(-2px);
}
.db-stat-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; flex-shrink: 0;
}
.db-icon-gray   { background: rgba(156,163,175,.15); color: #9ca3af; }
.db-icon-blue   { background: rgba(59,130,246,.15);  color: #60a5fa; }
.db-icon-purple { background: rgba(108,99,255,.2);   color: #a78bfa; }
.db-icon-green  { background: rgba(34,197,94,.15);   color: #22c55e; }
.db-icon-red    { background: rgba(239,68,68,.15);   color: #ef4444; }
.db-icon-yellow { background: rgba(234,179,8,.15);   color: #fbbf24; }
.db-stat-body   { min-width: 0; }
.db-stat-label  { font-size: 11px; color: #5a5a6a; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
.db-stat-val    { font-size: 20px; font-weight: 700; line-height: 1.2; }
.db-stat-sub    { font-size: 11px; color: #5a5a6a; margin-top: 3px; }
.db-val-gray    { color: #9ca3af; }
.db-val-blue    { color: #60a5fa; }
.db-val-purple  { color: #a78bfa; }
.db-val-green   { color: #22c55e; }
.db-val-red     { color: #ef4444; }
.db-val-yellow  { color: #fbbf24; }

/* ── Panneau commandes ─────────────────────────────────────── */
.db-orders-panel {
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px; overflow: hidden;
}
.db-orders-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,.06);
  flex-wrap: wrap; gap: 10px;
}
.db-orders-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.db-orders-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.db-search-input {
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  color: #f0f0f0; font-size: 12px; padding: 7px 12px;
  border-radius: 8px; outline: none; width: 200px;
  font-family: 'DM Sans', sans-serif;
}
.db-search-input::placeholder { color: #5a5a6a; }
.db-search-input:focus { border-color: rgba(108,99,255,.5); }
.db-filter-select {
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  color: #f0f0f0; font-size: 12px; padding: 7px 10px;
  border-radius: 8px; outline: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}
.db-orders-loading {
  display: flex; align-items: center; gap: 10px;
  padding: 30px 20px; color: #5a5a6a; font-size: 13px;
}
.db-orders-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 40px 20px; color: #5a5a6a;
}
.db-orders-empty span { font-size: 36px; opacity: .5; }
.db-orders-error {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 16px 20px; margin: 12px 16px;
  background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3);
  border-radius: 10px; color: #fca5a5; font-size: 13px;
}
.db-orders-error span { font-size: 18px; flex-shrink: 0; }

/* Cartes commandes */
.db-orders-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.db-order-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px; overflow: hidden; transition: .2s;
}
.db-order-card:hover { border-color: rgba(255,255,255,.12); }
.db-order-paid { border-left: 3px solid #22c55e; }
.db-order-main {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; gap: 12px;
}
.db-order-info  { display: flex; align-items: center; justify-content: space-between; flex: 1; flex-wrap: wrap; gap: 8px; min-width: 0; }
.db-order-email { display: flex; align-items: center; gap: 10px; min-width: 0; }
.db-order-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: rgba(108,99,255,.25); color: #a78bfa;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
}
.db-order-name       { font-size: 13px; font-weight: 600; color: #f0f0f0; }
.db-order-email-text { font-size: 11px; color: #5a5a6a; margin-top: 1px; }
.db-order-meta  { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.db-order-date  { font-size: 11px; color: #5a5a6a; white-space: nowrap; }
.db-order-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 100px; }
.db-status-paid    { background: rgba(34,197,94,.15); color: #22c55e; }
.db-status-pending { background: rgba(234,179,8,.15);  color: #fbbf24; }
.db-order-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.db-order-total    { font-size: 16px; font-weight: 700; color: #a78bfa; white-space: nowrap; }
.db-order-provider { font-size: 10px; color: #5a5a6a; text-transform: uppercase; }
.db-order-toggle {
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  color: #8a8a9a; width: 28px; height: 28px; border-radius: 7px;
  cursor: pointer; font-size: 11px; transition: .15s;
  display: flex; align-items: center; justify-content: center;
}
.db-order-toggle:hover { background: rgba(255,255,255,.12); color: #fff; }

/* Détail commande */
.db-order-detail {
  border-top: 1px solid rgba(255,255,255,.06);
  padding: 14px 16px; background: rgba(0,0,0,.15);
}
.db-order-items-title { font-size: 10px; font-weight: 700; color: #5a5a6a; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
.db-order-items { display: flex; flex-direction: column; gap: 8px; }
.db-order-item  { display: flex; align-items: center; gap: 10px; }
.db-item-img {
  width: 38px; height: 38px; border-radius: 8px; overflow: hidden;
  background: rgba(255,255,255,.06); display: flex; align-items: center;
  justify-content: center; font-size: 16px; flex-shrink: 0;
}
.db-item-img img { width: 100%; height: 100%; object-fit: cover; }
.db-item-info { flex: 1; min-width: 0; }
.db-item-name  { font-size: 13px; font-weight: 600; color: #f0f0f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.db-item-price { font-size: 11px; color: #5a5a6a; margin-top: 2px; }
.db-item-subtotal { font-size: 13px; font-weight: 700; color: #a78bfa; white-space: nowrap; }
.db-no-items   { font-size: 12px; color: #5a5a6a; text-align: center; padding: 10px; }
.db-order-addr { font-size: 11px; color: #5a5a6a; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.06); }

.db-orders-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-top: 1px solid rgba(255,255,255,.06);
  flex-wrap: wrap; gap: 8px;
}
.db-orders-count { font-size: 13px; color: #8a8a9a; }
.db-orders-count strong { color: #a78bfa; }

/* ── Builder card ──────────────────────────────────────────── */
.db-builder-card {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, rgba(108,99,255,.2), rgba(167,139,250,.1));
  border: 1px solid rgba(108,99,255,.35);
  border-radius: 18px; padding: 24px 28px; gap: 20px; flex-wrap: wrap;
}
.db-builder-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.db-builder-desc  { font-size: 13px; color: #8a8a9a; }
.db-published-info {
  display: flex; align-items: center; gap: 7px;
  margin-top: 8px; font-size: 12px; color: #8a8a9a;
}
.db-published-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #22c55e; flex-shrink: 0;
}
.db-published-link { color: #a78bfa; text-decoration: none; }
.db-published-link:hover { text-decoration: underline; }

/* ── Actions grid ──────────────────────────────────────────── */
.db-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.db-action-card {
  display: flex; align-items: center; gap: 14px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px; padding: 16px;
  cursor: pointer; transition: .2s; text-align: left;
  color: #f0f0f0;
}
.db-action-card:hover:not(:disabled) {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.15);
  transform: translateY(-2px);
}
.db-action-card:disabled { opacity: .4; cursor: not-allowed; }
.db-action-icon  { font-size: 24px; flex-shrink: 0; }
.db-action-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 7px; }
.db-action-desc  { font-size: 12px; color: #5a5a6a; margin-top: 2px; }

/* ── Boutons ───────────────────────────────────────────────── */
.db-btn {
  border: none; border-radius: 10px; font-weight: 600;
  cursor: pointer; transition: .2s; font-family: 'DM Sans', sans-serif;
  padding: 10px 18px; font-size: 13px;
}
.db-btn:disabled { opacity: .4; cursor: not-allowed; }
.db-btn-primary { background: linear-gradient(135deg, #6c63ff, #4f46e5); color: #fff; }
.db-btn-primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.db-btn-lg { padding: 14px 28px; font-size: 15px; border-radius: 12px; }
.db-btn-danger  { background: rgba(239,68,68,.2); color: #ef4444; border: 1px solid rgba(239,68,68,.3); }
.db-btn-danger:hover { background: rgba(239,68,68,.3); }
.db-btn-outline {
  background: transparent; color: #a78bfa;
  border: 1px solid rgba(108,99,255,.4); font-size: 12px; padding: 7px 14px;
}
.db-btn-outline:hover { background: rgba(108,99,255,.1); }

/* ── Badge ─────────────────────────────────────────────────── */
.db-badge {
  background: #6c63ff; color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 100px; min-width: 18px; text-align: center;
}

/* ── Animations ────────────────────────────────────────────── */
.db-slide-enter-active, .db-slide-leave-active { transition: all .3s ease; }
.db-slide-enter-from, .db-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 600px) {
  .db-header { padding: 0 14px; }
  .db-user-email { max-width: 100px; }
  .db-main { padding: 18px 14px 50px; }
  .db-stats { grid-template-columns: repeat(2, 1fr); }
  .db-builder-card { flex-direction: column; align-items: flex-start; }
  .db-btn-lg { width: 100%; text-align: center; justify-content: center; }
  .db-orders-header { flex-direction: column; align-items: flex-start; }
  .db-search-input { width: 100%; }
  .db-order-main { flex-wrap: wrap; }
}

/* ── Section paiements ────────────────────────────────────── */
.db-payments-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 18px; padding: 22px 24px;
}
.db-payments-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.db-payments-row   { display: flex; gap: 16px; flex-wrap: wrap; }
.db-payment-block  { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 220px; }
.db-payment-desc   { font-size: 13px; color: #8a8a9a; line-height: 1.5; }
.db-stripe-ok      { color: #22c55e; font-weight: 600; }
.db-btn-upgrade {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff; align-self: flex-start;
}
.db-btn-upgrade:hover { opacity: .9; transform: translateY(-1px); }
.db-btn-stripe {
  background: linear-gradient(135deg, #635bff, #4f46e5);
  color: #fff; align-self: flex-start;
}
.db-btn-stripe:hover { opacity: .9; transform: translateY(-1px); }

.db-stat-card-clickable:hover {
  border-color: rgba(108,99,255,.4) !important;
  background: rgba(108,99,255,.08) !important;
  transform: translateY(-2px);
}

/* ── Modal choix de plan ──────────────────────────────────── */
.db-modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,.7); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.db-modal-box {
  background: #16162a; border: 1px solid rgba(255,255,255,.1);
  border-radius: 20px; padding: 32px 28px;
  width: 100%; max-width: 480px;
  max-height: 90vh; overflow-y: auto;
  position: relative;
}
.db-modal-close {
  position: absolute; top: 16px; right: 16px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1);
  color: #8a8a9a; width: 30px; height: 30px; border-radius: 50%;
  cursor: pointer; font-size: 13px; transition: .15s;
  display: flex; align-items: center; justify-content: center;
}
.db-modal-close:hover { background: rgba(255,255,255,.15); color: #fff; }
.db-modal-header { text-align: center; margin-bottom: 24px; }
.db-modal-icon   { font-size: 36px; display: block; margin-bottom: 10px; }
.db-modal-title  { font-size: 20px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
.db-modal-sub    { font-size: 13px; color: #8a8a9a; }

/* Grille des plans */
.db-plan-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.db-plan-card    {
  background: rgba(255,255,255,.04); border: 2px solid rgba(255,255,255,.08);
  border-radius: 14px; padding: 18px 14px;
  cursor: pointer; transition: .2s; position: relative;
}
.db-plan-card:hover { border-color: rgba(108,99,255,.4); background: rgba(108,99,255,.06); }
.db-plan-selected { border-color: #6c63ff !important; background: rgba(108,99,255,.12) !important; }
.db-plan-current  { border-color: #22c55e !important; }
.db-plan-pro      { border-color: rgba(108,99,255,.25); }
.db-plan-badge    {
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
  background: rgba(255,255,255,.15); color: #8a8a9a;
  font-size: 10px; font-weight: 700; padding: 2px 10px;
  border-radius: 100px; white-space: nowrap;
}
.db-plan-badge-pro { background: linear-gradient(135deg,#6c63ff,#a78bfa); color: #fff; }
.db-plan-name    { font-size: 16px; font-weight: 700; margin-bottom: 6px; margin-top: 8px; }
.db-plan-price   { font-size: 26px; font-weight: 800; color: #f0f0f0; margin-bottom: 12px; }
.db-plan-price span { font-size: 13px; font-weight: 400; color: #8a8a9a; }
.db-plan-features { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.db-plan-features li { font-size: 12px; color: #8a8a9a; }
.db-plan-features li:first-child,
.db-plan-features li:nth-child(2),
.db-plan-features li:nth-child(3) { color: #f0f0f0; }

/* Résumé + confirmation */
.db-plan-summary {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px; padding: 14px 16px; margin-bottom: 14px;
}
.db-plan-summary-row { display: flex; justify-content: space-between; font-size: 14px; color: #8a8a9a; }
.db-plan-already-active { font-size: 12px; color: #22c55e; margin-top: 8px; font-weight: 600; }
.db-btn-confirm {
  width: 100%; padding: 14px; font-size: 15px; font-weight: 700;
  border-radius: 12px; border: none; cursor: pointer; transition: .2s;
  background: linear-gradient(135deg, #6c63ff, #4f46e5); color: #fff;
  font-family: 'DM Sans', sans-serif;
}
.db-btn-confirm:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.db-btn-confirm:disabled { opacity: .45; cursor: not-allowed; }
.db-plan-note { text-align: center; font-size: 11px; color: #5a5a6a; margin-top: 10px; }

/* ── Onglets source commandes ──────────────────────────────── */
.db-orders-source-tabs {
  display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;
}
.db-source-tab {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  color: #8a8a9a; font-size: 12px; font-weight: 600;
  padding: 4px 12px; border-radius: 100px;
  cursor: pointer; transition: .15s;
  font-family: 'DM Sans', sans-serif;
}
.db-source-tab:hover { border-color: rgba(255,255,255,.2); color: #f0f0f0; }
.db-source-tab.active {
  background: rgba(108,99,255,.15);
  border-color: rgba(108,99,255,.5);
  color: #a78bfa;
}
.db-source-count {
  background: rgba(255,255,255,.1);
  font-size: 10px; font-weight: 700;
  padding: 1px 6px; border-radius: 100px; color: #8a8a9a;
}
.db-source-tab.active .db-source-count {
  background: rgba(108,99,255,.3); color: #a78bfa;
}
.db-source-label {
  font-size: 10px; color: #5a5a6a;
  align-self: center; font-style: italic;
  padding-left: 4px;
}
/* ── Badge plan Free/Pro ───────────────────────────────────── */
.db-order-plan-badge {
  font-size: 9px; font-weight: 800;
  padding: 2px 6px; border-radius: 4px;
  letter-spacing: .5px; text-transform: uppercase;
}
.db-plan-pro-badge  { background: rgba(108,99,255,.2); color: #a78bfa; }
.db-plan-free-badge { background: rgba(156,163,175,.15); color: #9ca3af; }

/* ── Modal sélection pays (Stripe Connect) ─────────────────── */
.db-country-modal-box {
  max-height: 88vh; display: flex; flex-direction: column;
}
.db-country-search {
  width: 100%; box-sizing: border-box;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px; padding: 11px 14px;
  color: #f0f0f0; font-size: 14px; font-family: 'DM Sans', sans-serif;
  margin-bottom: 12px; outline: none; transition: border-color .2s;
}
.db-country-search:focus { border-color: rgba(108,99,255,.6); }
.db-country-search::placeholder { color: #5a5a6a; }
.db-country-list {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column;
  gap: 4px; max-height: 340px; padding-right: 4px;
  scrollbar-width: thin; scrollbar-color: rgba(108,99,255,.3) transparent;
}
.db-country-list::-webkit-scrollbar { width: 4px; }
.db-country-list::-webkit-scrollbar-thumb { background: rgba(108,99,255,.3); border-radius: 4px; }
.db-country-item {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 10px 14px; cursor: pointer;
  transition: all .15s; text-align: left; font-family: 'DM Sans', sans-serif;
  color: #c0c0d0;
}
.db-country-item:hover {
  background: rgba(108,99,255,.1); border-color: rgba(108,99,255,.3);
  color: #f0f0f0;
}
.db-country-selected {
  background: rgba(108,99,255,.18) !important;
  border-color: #6c63ff !important; color: #f0f0f0 !important;
}
.db-country-flag { font-size: 22px; flex-shrink: 0; line-height: 1; }
.db-country-name { flex: 1; font-size: 14px; font-weight: 500; }
.db-country-check {
  font-size: 14px; font-weight: 700; color: #a78bfa;
  flex-shrink: 0;
}
.db-country-empty {
  text-align: center; color: #5a5a6a; font-size: 13px; padding: 24px 0;
}
</style>
