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

          <div
            class="db-stat-card"
            :class="userData?.plan !== 'free' ? 'db-stat-card-clickable' : ''"
            @click="userData?.plan !== 'free' ? connectStripe() : upgradeToPro()"
            style="cursor:pointer"
          >
            <div class="db-stat-icon"
              :class="{
                'db-icon-green':  stripeStatus === 'active',
                'db-icon-yellow': stripeStatus === 'pending',
                'db-icon-gray':   stripeStatus === 'none' && userData?.plan === 'free',
                'db-icon-orange': stripeStatus === 'none' && userData?.plan !== 'free',
              }">
              {{ stripeStatus === 'active' ? '💳' : stripeStatus === 'pending' ? '⏳' : (userData?.plan === 'free' ? '🔒' : '⚙️') }}
            </div>
            <div class="db-stat-body">
              <p class="db-stat-label">Store Stripe</p>
              <p class="db-stat-val"
                :class="{
                  'db-val-green':  stripeStatus === 'active',
                  'db-val-yellow': stripeStatus === 'pending',
                  'db-val-gray':   userData?.plan === 'free',
                  'db-val-orange': stripeStatus === 'none' && userData?.plan !== 'free',
                }">
                {{ stripeStatus === 'active'  ? '✓ Actif'
                 : stripeStatus === 'pending' ? '⏳ En vérification'
                 : userData?.plan === 'free'  ? 'Plan Pro requis'
                 : 'À configurer ▶' }}
              </p>
              <p class="db-stat-sub">
                {{ stripeStatus === 'active'  ? 'Paiements activés'
                 : stripeStatus === 'pending' ? 'En attente de validation admin'
                 : userData?.plan === 'free'  ? 'Passez à Pro'
                 : 'Cliquez pour connecter' }}
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
                  <button class="db-source-tab active">
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

            <div v-if="ordersLoading" class="db-orders-loading">
              <div class="db-spinner db-spinner-sm"></div>
              <p>Chargement des commandes...</p>
            </div>

            <div v-if="!ordersLoading && ordersError" class="db-orders-error">
              <span>⚠️</span>
              <p>{{ ordersError }}</p>
            </div>

            <div v-else-if="filteredOrders.length === 0" class="db-orders-empty">
              <span>📭</span>
              <p>{{ orders.length === 0 ? 'Aucune commande reçue pour le moment.' : 'Aucune commande ne correspond à votre recherche.' }}</p>
            </div>

            <div v-else class="db-orders-list">
              <div
                v-for="order in filteredOrders"
                :key="order.id"
                class="db-order-card"
                :class="{ 'db-order-paid': order.status === 'paid' }"
              >
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

                <Transition name="db-slide">
                  <div v-if="openOrderId === order.id" class="db-order-detail">
                    <div class="db-order-items-title">Articles commandés</div>
                    <div v-if="order.items?.length" class="db-order-items">
                      <div v-for="(item, i) in order.items" :key="i" class="db-order-item">
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

            <div class="db-payment-block">
              <p class="db-stat-label" style="font-size:11px;color:#5a5a6a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Paiements clients (Stripe)</p>
              <p class="db-payment-desc" style="margin-bottom:10px">
                <span v-if="userData?.plan === 'free'" style="color:#5a5a6a">
                  🔒 Disponible avec le plan Pro.
                </span>
                <span v-else-if="stripeStatus === 'active'" class="db-stripe-ok">
                  ✅ Stripe actif — vos clients peuvent payer directement sur votre compte.
                </span>
                <span v-else-if="stripeStatus === 'pending'" class="db-stripe-pending">
                  ⏳ Configuration soumise — en attente de vérification par notre équipe.
                </span>
                <span v-else>
                  ⚠ Non configuré — connectez Stripe pour recevoir des paiements clients.
                </span>
              </p>
              <button
                @click="connectStripe"
                :disabled="userData?.plan === 'free'"
                class="db-btn db-btn-stripe"
                :class="{'db-btn-stripe-pending': stripeStatus === 'pending'}"
              >
                {{ stripeStatus === 'active'  ? '💳 Reconfigurer Stripe'
                 : stripeStatus === 'pending' ? '🔄 Reconfigurer la connexion'
                 : '💳 Connecter Stripe' }}
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

          <!-- Bouton raccourci Restore -->
          <button @click="showRestorePanel = !showRestorePanel" class="db-action-card db-action-card-restore">
            <span class="db-action-icon">🗄️</span>
            <div>
              <p class="db-action-title">Restaurer mes données</p>
              <p class="db-action-desc">{{ showRestorePanel ? 'Masquer le panneau ▲' : 'Accéder aux backups ▼' }}</p>
            </div>
          </button>

        </div>

        <!-- ══════════════════════════════════════════════════════
             PANNEAU RESTAURATION — PROPRIÉTAIRE
        ══════════════════════════════════════════════════════ -->
        <Transition name="db-slide">
          <div v-if="showRestorePanel" class="db-restore-panel">

            <!-- En-tête -->
            <div class="db-restore-header">
              <div>
                <h2 class="db-restore-title">🗄️ Restaurer mes données</h2>
                <p class="db-restore-subtitle">
                  Restaurez uniquement vos données (profil, commandes, slugs, produits)
                  à partir d'un backup existant. Vos données sont isolées de celles des autres utilisateurs.
                </p>
              </div>
              <button
                class="db-restore-refresh-btn"
                @click="loadUserBackups"
                :disabled="restoreListLoading"
              >
                <span v-if="restoreListLoading" class="db-spinner-sm"></span>
                <span v-else>↻ Rafraîchir</span>
              </button>
            </div>

            <!-- Chargement -->
            <div v-if="restoreListLoading && userBackups.length === 0" class="db-restore-loading">
              <div class="db-spinner"></div>
              <p>Chargement des backups disponibles...</p>
            </div>

            <!-- Erreur -->
            <div v-else-if="restoreListError" class="db-restore-error">
              <span>⚠️</span>
              <p>{{ restoreListError }}</p>
              <button class="db-btn db-btn-outline" @click="loadUserBackups" style="font-size:12px;padding:6px 12px">Réessayer</button>
            </div>

            <!-- Aucun backup -->
            <div v-else-if="!restoreListLoading && userBackups.length === 0" class="db-restore-empty">
              <span class="db-restore-empty-icon">📭</span>
              <p>Aucun backup disponible pour le moment.</p>
              <p class="db-restore-empty-hint">Les backups sont créés automatiquement chaque nuit à 2h00.</p>
            </div>

            <!-- Liste backups -->
            <div v-else class="db-restore-list">
              <div
                v-for="backup in userBackups"
                :key="backup.filename"
                class="db-restore-item"
                :class="{ 'db-restore-item-latest': backup === userBackups[0] }"
              >
                <div class="db-restore-info">
                  <div class="db-restore-filename-row">
                    <span class="db-restore-file-icon">📦</span>
                    <span class="db-restore-filename">{{ backup.filename }}</span>
                    <span v-if="backup === userBackups[0]" class="db-restore-badge-latest">Dernier</span>
                  </div>
                  <div class="db-restore-meta">
                    <span>📅 {{ formatBackupDate(backup.createdAt) }}</span>
                    <span>💾 {{ formatSize(backup.size) }}</span>
                  </div>
                </div>

                <div class="db-restore-btns">
                  <!-- Simulation -->
                  <button
                    class="db-btn-restore-dry"
                    @click="runUserRestore(backup.filename, true)"
                    :disabled="userRestoreLoading === backup.filename"
                    title="Vérifier ce qui sera restauré, sans modifier vos données"
                  >
                    <span v-if="userRestoreLoading === backup.filename" class="db-spinner-sm"></span>
                    <span v-else>🔍 Simuler</span>
                  </button>

                  <!-- Restore réel -->
                  <button
                    class="db-btn-restore-real"
                    @click="askUserRestoreConfirm(backup.filename)"
                    :disabled="userRestoreLoading === backup.filename"
                    title="Restaurer vos données depuis ce backup"
                  >
                    🔄 Restaurer
                  </button>
                </div>
              </div>
            </div>

            <!-- Résultat simulation -->
            <Transition name="db-slide">
              <div v-if="userDryRunResult" class="db-restore-dryrun">
                <div class="db-restore-dryrun-header">
                  <span>🔍</span>
                  <strong>Simulation — {{ userDryRunResult.filename }}</strong>
                  <button class="db-restore-dryrun-close" @click="userDryRunResult = null">✕</button>
                </div>
                <div class="db-restore-dryrun-detail">
                  <div class="db-restore-dryrun-row">
                    <span class="db-restore-dryrun-label">Profil (users)</span>
                    <span class="db-restore-dryrun-val">{{ userDryRunResult.detail?.userData || 0 }} doc</span>
                  </div>
                  <div class="db-restore-dryrun-row">
                    <span class="db-restore-dryrun-label">Commandes Pro (orders)</span>
                    <span class="db-restore-dryrun-val">{{ userDryRunResult.detail?.orders || 0 }} docs</span>
                  </div>
                  <div class="db-restore-dryrun-row">
                    <span class="db-restore-dryrun-label">Commandes Free (forders)</span>
                    <span class="db-restore-dryrun-val">{{ userDryRunResult.detail?.forders || 0 }} docs</span>
                  </div>
                  <div class="db-restore-dryrun-row">
                    <span class="db-restore-dryrun-label">Slugs publiés</span>
                    <span class="db-restore-dryrun-val">{{ userDryRunResult.detail?.slugs || 0 }} docs</span>
                  </div>
                  <div class="db-restore-dryrun-row">
                    <span class="db-restore-dryrun-label">Infos produits</span>
                    <span class="db-restore-dryrun-val">{{ userDryRunResult.detail?.prodinfos || 0 }} docs</span>
                  </div>
                  <div class="db-restore-dryrun-row db-restore-dryrun-total">
                    <span class="db-restore-dryrun-label">Total à restaurer</span>
                    <span class="db-restore-dryrun-val db-restore-val-accent">{{ userDryRunResult.restored }} éléments</span>
                  </div>
                </div>
                <p class="db-restore-dryrun-note">
                  ✅ Simulation uniquement — aucune donnée modifiée. Cliquez sur "Restaurer" pour appliquer.
                </p>
              </div>
            </Transition>

          </div>
        </Transition>
        <!-- FIN PANNEAU RESTAURATION -->

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

        <div class="db-plan-grid">

          <div
            class="db-plan-card"
            :class="{ 'db-plan-selected': planChoix === 'free', 'db-plan-current': userData?.plan === 'free' && !isProActive }"
            @click="planChoix = 'free'"
          >
            <div class="db-plan-badge" v-if="userData?.plan === 'free' && !isProActive">Actuel</div>
            <div class="db-plan-name">🆓 Gratuit</div>
            <div class="db-plan-price">0€<span>/mois</span></div>
            <ul class="db-plan-features">
              <li>✓ Builder visuel</li>
              <li>✓ Multi-pages</li>
              <li>✓ Catalogue produits</li>
              <li>✓ Formulaires</li>
              <li>✓ Insertion Videos</li>
              <li>✓ Gestion commandes</li>
              <li>✗ Paiements clients (en mode test)</li>
            </ul>
          </div>

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
              <li>✓ Builder complet</li>
              <li>✓ Multi-pages illimité</li>
              <li>✓ Catalogue produits</li>
              <li>✓ Formulaires</li>
              <li>✓ Insertion Videos</li>
              <li>✓ Gestion commandes</li>
              <li>✓ Paiements Stripe (production)</li>
              <li>✓ Support prioritaire</li>
            </ul>
          </div>

        </div>

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

  <!-- ══ MODAL CONFIRMATION RESTORE UTILISATEUR ══ -->
  <Transition name="db-fade">
    <div v-if="userRestoreConfirm" class="db-modal-overlay" @click.self="userRestoreConfirm = null">
      <div class="db-modal-box" style="max-width:440px">
        <button class="db-modal-close" @click="userRestoreConfirm = null">✕</button>
        <div class="db-modal-header">
          <span class="db-modal-icon">⚠️</span>
          <h2 class="db-modal-title">Confirmer la restauration</h2>
          <p class="db-modal-sub">Vos données seront remplacées par celles du backup.</p>
        </div>
        <div class="db-restore-confirm-info">
          <p class="db-restore-confirm-file">📦 {{ userRestoreConfirm }}</p>
          <p class="db-restore-confirm-warn">
            Cette opération remplacera vos données actuelles (profil, commandes, slugs, produits)
            par celles du backup sélectionné. Elle est irréversible.
          </p>
          <p class="db-restore-confirm-safe">
            🔒 Seules <strong>vos</strong> données sont concernées. Les autres utilisateurs ne sont pas affectés.
          </p>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="db-restore-modal-cancel" @click="userRestoreConfirm = null">Annuler</button>
          <button
            class="db-restore-modal-confirm"
            @click="runUserRestore(userRestoreConfirm, false)"
            :disabled="userRestoreLoading === userRestoreConfirm"
          >
            <span v-if="userRestoreLoading === userRestoreConfirm" class="db-spinner-sm"></span>
            <span v-else>🔄 Confirmer la restauration</span>
          </button>
        </div>
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

const BACKEND = "https://backendfinal-production-afd2.up.railway.app"

const router   = useRouter()
const user     = ref(null)
const userData = ref(null)
const loading  = ref(true)

// ── Modal choix de plan ───────────────────────────────────────
const showPlanModal = ref(false)
const planChoix     = ref("pro")
const planLoading   = ref(false)

// ── Commandes ──────────────────────────────────────────────────
const orders        = ref([])
const ordersLoading = ref(false)
const ordersError   = ref("")
const showOrders    = ref(false)
const openOrderId   = ref(null)
const orderSearch   = ref("")
const orderFilter   = ref("")
const ordersStats   = ref({ total: 0, free: 0, pro: 0, revenue: 0 })

// ── Restore panel refs ────────────────────────────────────────
const showRestorePanel    = ref(false)
const userBackups         = ref([])
const restoreListLoading  = ref(false)
const restoreListError    = ref("")
const userRestoreLoading  = ref("")      // filename en cours
const userRestoreConfirm  = ref(null)    // filename à confirmer
const userDryRunResult    = ref(null)    // résultat simulation

// ── Compte suspendu ───────────────────────────────────────────
const accountSuspended = computed(() =>
  userData.value !== null && userData.value?.active === false
)

// ── Plan computed ─────────────────────────────────────────────
const planExpired = computed(() => {
  if (!userData.value) return false
  if (userData.value.plan === "free") return false
  const exp = userData.value.expiry
  if (!exp || exp === 0 || exp === null) return false
  return exp < Date.now()
})

const canAccessBuilder = computed(() => {
  if (!userData.value) return false
  if (userData.value.plan === "free") return true
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

const planBgColor = computed(() => ({
  "db-icon-gray":   userData.value?.plan === "free",
  "db-icon-blue":   userData.value?.plan === "pro",
  "db-icon-purple": userData.value?.plan === "premium",
}))

const planTextColor = computed(() => ({
  "db-val-gray":    userData.value?.plan === "free",
  "db-val-blue":    userData.value?.plan === "pro",
  "db-val-purple":  userData.value?.plan === "premium",
}))

const hasPaymentConfig = computed(() => {
  const cfg = userData.value?.storePaymentConfig?.stripe
  return !!(cfg && cfg.publishableKey && cfg.publishableKey.length > 5)
})

const stripeVerified = computed(() => userData.value?.stripeVerified === true)

const stripeStatus = computed(() => {
  if (!hasPaymentConfig.value) return "none"
  if (stripeVerified.value)    return "active"
  return "pending"
})

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
  if (orderFilter.value) list = list.filter(o => o.status === orderFilter.value)
  if (orderSearch.value.trim()) {
    const q = orderSearch.value.toLowerCase()
    list = list.filter(o =>
      (o.customerEmail || o.email      || "").toLowerCase().includes(q) ||
      (o.customerName  || o.clientName || "").toLowerCase().includes(q) ||
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
    loadOrders(u.uid, userData.value?.plan ?? "free")
  })
})

// ── Commandes ─────────────────────────────────────────────────
const toMs = (v) => {
  if (!v) return 0
  if (v?.toDate)  return v.toDate().getTime()
  if (v?.seconds) return v.seconds * 1000
  return new Date(v).getTime()
}

const loadOrders = async (uid, plan) => {
  ordersLoading.value = true
  ordersError.value   = ""
  const log     = { errorForders: null, errorOrders: null }
  const results = []

  try {
    const snap = await getDocs(query(collection(db, "forders"), where("ownerUid", "==", uid)))
    log.forders = snap.size
    snap.docs.forEach(d => results.push({ id: d.id, _source: "forders", ...d.data() }))
  } catch(e) { log.errorForders = `${e.code || e.message}` }

  try {
    const snap = await getDocs(query(collection(db, "orders"), where("ownerUid", "==", uid)))
    log.orders = snap.size
    snap.docs.forEach(d => results.push({ id: d.id, _source: "orders", ...d.data() }))
  } catch(e) { log.errorOrders = `${e.code || e.message}` }

  const seen   = new Set()
  const unique = results.filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true })
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

// ══════════════════════════════════════════════════════════════
//  FONCTIONS RESTORE UTILISATEUR
// ══════════════════════════════════════════════════════════════

// Charger la liste des backups disponibles
const loadUserBackups = async () => {
  restoreListLoading.value = true
  restoreListError.value   = ""
  userDryRunResult.value   = null
  try {
    const idToken = await auth.currentUser?.getIdToken()
    const res     = await fetch(
      `${BACKEND}/api/store/backups`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    userBackups.value = data.backups || []
  } catch(e) {
    restoreListError.value = e.message
  } finally {
    restoreListLoading.value = false
  }
}

// Ouvrir la modal de confirmation
const askUserRestoreConfirm = (filename) => {
  userRestoreConfirm.value = filename
  userDryRunResult.value   = null
}

// Lancer la restauration (simulation ou réelle)
const runUserRestore = async (filename, dryRun) => {
  userRestoreLoading.value = filename
  userDryRunResult.value   = null
  if (!dryRun) userRestoreConfirm.value = null

  try {
    const idToken = await auth.currentUser?.getIdToken()
    const res     = await fetch(`${BACKEND}/api/store/restore`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${idToken}`,
      },
      body:    JSON.stringify({ filename, dryRun }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    if (dryRun) {
      userDryRunResult.value = {
        filename,
        restored: data.restored || 0,
        skipped:  data.skipped  || 0,
        detail:   data.detail   || {},
      }
    } else {
      // Recharger les données utilisateur après restore réel
      const snap = await getDoc(doc(db, "users", user.value.uid))
      if (snap.exists()) userData.value = snap.data()
      await loadOrders(user.value.uid, userData.value?.plan ?? "free")
      alert(`✅ Restauration terminée : ${data.restored} éléments restaurés.`)
    }
  } catch(e) {
    alert("Erreur : " + e.message)
  } finally {
    userRestoreLoading.value = ""
  }
}

// Charger les backups quand le panneau s'ouvre
const toggleRestorePanel = () => {
  showRestorePanel.value = !showRestorePanel.value
  if (showRestorePanel.value && userBackups.value.length === 0) {
    loadUserBackups()
  }
}

// ── Actions ────────────────────────────────────────────────────
const toggleOrders      = () => { showOrders.value = !showOrders.value; window.scrollTo({ top: 200, behavior: "smooth" }) }
const toggleOrderDetail = (id) => { openOrderId.value = openOrderId.value === id ? null : id }
const openStore         = () => { window.open(`https://mronlinestores.com/#/${userData.value.publishedSlug}`, "_blank") }
const goToBuilder       = () => { router.push("/saasgenerator") }
const goToPlans         = () => { showPlanModal.value = true }

const payToReactivate = async () => {
  planLoading.value = true
  try {
    const res  = await fetch(`${BACKEND}/create-billing-session`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.value.email, plan: "pro", ownerUid: user.value.uid }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) { alert(data.error || "Erreur paiement"); return }
    window.location.href = data.url
  } catch(err) { alert("Erreur réseau.") }
  finally { planLoading.value = false }
}

const confirmPlan = async () => {
  if (planChoix.value === 'free') return
  if (isProActive.value && planChoix.value === 'pro') return
  planLoading.value = true
  try {
    const res  = await fetch(`${BACKEND}/create-billing-session`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.value.email, plan: planChoix.value, ownerUid: user.value.uid }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) { alert(data.error || "Erreur paiement"); return }
    window.location.href = data.url
  } catch(err) { alert("Erreur réseau.") }
  finally { planLoading.value = false }
}

const renewPlan = () => {
  const plan  = userData.value?.plan || "pro"
  const price = plan === "pro" ? 10 : 20
  router.push({ path: "/panier", query: { plan, price } })
}

const upgradeToPro = async () => {
  try {
    const res  = await fetch(`${BACKEND}/create-billing-session`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.value.email, plan: "pro", ownerUid: user.value.uid }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) { alert(data.error || "Erreur paiement"); return }
    window.location.href = data.url
  } catch(err) { alert("Erreur upgrade Pro") }
}

const connectStripe = async () => {
  try {
    const res  = await fetch(`${BACKEND}/create-connect-account`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUid: user.value.uid, email: user.value.email }),
    })
    const data = await res.json()
    if (!res.ok || !data.url) { alert(data.error || "Erreur Stripe Connect"); return }
    window.location.href = data.url
  } catch(err) { alert("Erreur connexion Stripe") }
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

const formatBackupDate = (isoStr) => {
  if (!isoStr) return "—"
  return new Date(isoStr).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

const formatSize = (bytes) => {
  if (!bytes) return "—"
  const kb = parseInt(bytes) / 1024
  if (kb < 1024) return kb.toFixed(0) + " KB"
  return (kb / 1024).toFixed(1) + " MB"
}

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

.db-root { min-height: 100vh; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%); font-family: 'DM Sans', sans-serif; color: #f0f0f0; }

/* Header */
.db-header { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 60px; background: rgba(255,255,255,.04); border-bottom: 1px solid rgba(255,255,255,.08); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
.db-brand { display: flex; align-items: center; gap: 10px; }
.db-logo  { font-size: 22px; }
.db-title { font-size: 16px; font-weight: 700; color: #fff; }
.db-header-right { display: flex; align-items: center; gap: 12px; }
.db-user-pill { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 100px; padding: 5px 12px; }
.db-user-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
.db-user-email { font-size: 12px; color: #a0a0b0; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-logout-btn { font-size: 12px; color: #8a8a9a; background: transparent; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 6px 12px; cursor: pointer; transition: .15s; }
.db-logout-btn:hover { color: #fff; border-color: rgba(255,255,255,.3); }

/* Main */
.db-main { max-width: 900px; margin: 0 auto; padding: 28px 20px 60px; display: flex; flex-direction: column; gap: 20px; }

/* Loading */
.db-loading { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 80px 0; color: #8a8a9a; }
.db-spinner { width: 36px; height: 36px; border: 3px solid rgba(108,99,255,.2); border-top-color: #6c63ff; border-radius: 50%; animation: db-spin .7s linear infinite; }
.db-spinner-sm { width: 16px; height: 16px; border-width: 2px; border-color: rgba(255,255,255,.2); border-top-color: #fff; border-radius: 50%; animation: db-spin .7s linear infinite; display: inline-block; }
@keyframes db-spin { to { transform: rotate(360deg); } }

/* Suspended */
.db-suspended-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(10,10,20,.85); display: flex; align-items: center; justify-content: center; padding: 20px; }
.db-suspended-card { background: #1a1a2e; border: 1px solid rgba(239,68,68,.25); border-radius: 20px; padding: 48px 40px; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.db-suspended-icon { font-size: 52px; margin-bottom: 16px; }
.db-suspended-title { font-size: 22px; font-weight: 700; color: #f0f0f0; margin-bottom: 12px; }
.db-suspended-msg { font-size: 14px; color: #8a8a9a; line-height: 1.7; margin-bottom: 28px; }
.db-suspended-pay-btn { width: 100%; padding: 15px; margin-bottom: 10px; background: linear-gradient(135deg, #6c63ff, #a78bfa); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .2s; }
.db-suspended-pay-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(108,99,255,.4); }
.db-suspended-pay-btn:disabled { opacity: .6; cursor: not-allowed; }
.db-suspended-note { font-size: 11px; color: #5a5a6a; margin-bottom: 20px; }
.db-suspended-logout { background: none; border: none; color: #5a5a6a; font-size: 13px; cursor: pointer; font-family: inherit; text-decoration: underline; }
.db-suspended-logout:hover { color: #9ca3af; }
.db-fade-enter-active, .db-fade-leave-active { transition: opacity .25s ease; }
.db-fade-enter-from, .db-fade-leave-to { opacity: 0; }

/* Alert */
.db-alert-expired { display: flex; align-items: center; gap: 14px; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); border-radius: 14px; padding: 16px 20px; }
.db-alert-icon { font-size: 24px; flex-shrink: 0; }
.db-alert-expired > div { flex: 1; }
.db-alert-expired strong { font-size: 15px; color: #ef4444; }
.db-alert-expired p { font-size: 13px; color: #9ca3af; margin-top: 2px; }

/* Stats */
.db-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
.db-stat-card { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 18px 16px; transition: .2s; }
.db-stat-card-orders { cursor: pointer; border-color: rgba(108,99,255,.3); background: rgba(108,99,255,.06); }
.db-stat-card-orders:hover { background: rgba(108,99,255,.12); transform: translateY(-2px); }
.db-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
.db-icon-gray   { background: rgba(156,163,175,.15); color: #9ca3af; }
.db-icon-blue   { background: rgba(59,130,246,.15);  color: #60a5fa; }
.db-icon-purple { background: rgba(108,99,255,.2);   color: #a78bfa; }
.db-icon-green  { background: rgba(34,197,94,.15);   color: #22c55e; }
.db-icon-red    { background: rgba(239,68,68,.15);   color: #ef4444; }
.db-icon-yellow { background: rgba(234,179,8,.15);   color: #fbbf24; }
.db-icon-orange { background: rgba(249,115,22,.15);  color: #fb923c; }
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
.db-val-orange  { color: #fb923c; }

/* Commandes */
.db-orders-panel { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 18px; overflow: hidden; }
.db-orders-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,.06); flex-wrap: wrap; gap: 10px; }
.db-orders-title { font-size: 16px; font-weight: 700; color: #f0f0f0; }
.db-orders-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.db-search-input { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #f0f0f0; font-size: 12px; padding: 7px 12px; border-radius: 8px; outline: none; width: 200px; font-family: 'DM Sans', sans-serif; }
.db-search-input::placeholder { color: #5a5a6a; }
.db-search-input:focus { border-color: rgba(108,99,255,.5); }
.db-filter-select { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #f0f0f0; font-size: 12px; padding: 7px 10px; border-radius: 8px; outline: none; cursor: pointer; font-family: 'DM Sans', sans-serif; }
.db-orders-loading { display: flex; align-items: center; gap: 10px; padding: 30px 20px; color: #5a5a6a; font-size: 13px; }
.db-orders-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 20px; color: #5a5a6a; }
.db-orders-empty span { font-size: 36px; opacity: .5; }
.db-orders-error { display: flex; align-items: flex-start; gap: 10px; padding: 16px 20px; margin: 12px 16px; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); border-radius: 10px; color: #fca5a5; font-size: 13px; }
.db-orders-error span { font-size: 18px; flex-shrink: 0; }
.db-orders-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.db-order-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); border-radius: 12px; overflow: hidden; transition: .2s; }
.db-order-card:hover { border-color: rgba(255,255,255,.12); }
.db-order-paid { border-left: 3px solid #22c55e; }
.db-order-main { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; gap: 12px; }
.db-order-info  { display: flex; align-items: center; justify-content: space-between; flex: 1; flex-wrap: wrap; gap: 8px; min-width: 0; }
.db-order-email { display: flex; align-items: center; gap: 10px; min-width: 0; }
.db-order-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: rgba(108,99,255,.25); color: #a78bfa; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
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
.db-order-toggle { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #8a8a9a; width: 28px; height: 28px; border-radius: 7px; cursor: pointer; font-size: 11px; transition: .15s; display: flex; align-items: center; justify-content: center; }
.db-order-toggle:hover { background: rgba(255,255,255,.12); color: #fff; }
.db-order-detail { border-top: 1px solid rgba(255,255,255,.06); padding: 14px 16px; background: rgba(0,0,0,.15); }
.db-order-items-title { font-size: 10px; font-weight: 700; color: #5a5a6a; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
.db-order-items { display: flex; flex-direction: column; gap: 8px; }
.db-order-item  { display: flex; align-items: center; gap: 10px; }
.db-item-img { width: 38px; height: 38px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,.06); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.db-item-img img { width: 100%; height: 100%; object-fit: cover; }
.db-item-info { flex: 1; min-width: 0; }
.db-item-name  { font-size: 13px; font-weight: 600; color: #f0f0f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.db-item-price { font-size: 11px; color: #5a5a6a; margin-top: 2px; }
.db-item-subtotal { font-size: 13px; font-weight: 700; color: #a78bfa; white-space: nowrap; }
.db-no-items   { font-size: 12px; color: #5a5a6a; text-align: center; padding: 10px; }
.db-order-addr { font-size: 11px; color: #5a5a6a; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.06); }
.db-orders-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid rgba(255,255,255,.06); flex-wrap: wrap; gap: 8px; }
.db-orders-count { font-size: 13px; color: #8a8a9a; }
.db-orders-count strong { color: #a78bfa; }

/* Builder */
.db-builder-card { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, rgba(108,99,255,.2), rgba(167,139,250,.1)); border: 1px solid rgba(108,99,255,.35); border-radius: 18px; padding: 24px 28px; gap: 20px; flex-wrap: wrap; }
.db-builder-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.db-builder-desc  { font-size: 13px; color: #8a8a9a; }
.db-published-info { display: flex; align-items: center; gap: 7px; margin-top: 8px; font-size: 12px; color: #8a8a9a; }
.db-published-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
.db-published-link { color: #a78bfa; text-decoration: none; }
.db-published-link:hover { text-decoration: underline; }

/* Actions */
.db-actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.db-action-card { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 16px; cursor: pointer; transition: .2s; text-align: left; color: #f0f0f0; }
.db-action-card:hover:not(:disabled) { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.15); transform: translateY(-2px); }
.db-action-card:disabled { opacity: .4; cursor: not-allowed; }
.db-action-card-restore { border-color: rgba(108,99,255,.2); }
.db-action-card-restore:hover:not(:disabled) { border-color: rgba(108,99,255,.4) !important; background: rgba(108,99,255,.08) !important; }
.db-action-icon  { font-size: 24px; flex-shrink: 0; }
.db-action-title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 7px; }
.db-action-desc  { font-size: 12px; color: #5a5a6a; margin-top: 2px; }

/* Buttons */
.db-btn { border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: .2s; font-family: 'DM Sans', sans-serif; padding: 10px 18px; font-size: 13px; }
.db-btn:disabled { opacity: .4; cursor: not-allowed; }
.db-btn-primary { background: linear-gradient(135deg, #6c63ff, #4f46e5); color: #fff; }
.db-btn-primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.db-btn-lg { padding: 14px 28px; font-size: 15px; border-radius: 12px; }
.db-btn-danger  { background: rgba(239,68,68,.2); color: #ef4444; border: 1px solid rgba(239,68,68,.3); }
.db-btn-danger:hover { background: rgba(239,68,68,.3); }
.db-btn-outline { background: transparent; color: #a78bfa; border: 1px solid rgba(108,99,255,.4); font-size: 12px; padding: 7px 14px; }
.db-btn-outline:hover { background: rgba(108,99,255,.1); }
.db-badge { background: #6c63ff; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; min-width: 18px; text-align: center; }

/* Animations */
.db-slide-enter-active, .db-slide-leave-active { transition: all .3s ease; }
.db-slide-enter-from, .db-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* Responsive */
@media (max-width: 600px) {
  .db-header { padding: 0 14px; }
  .db-user-email { max-width: 100px; }
  .db-main { padding: 18px 14px 50px; }
  .db-stats { grid-template-columns: repeat(2, 1fr); }
  .db-builder-card { flex-direction: column; align-items: flex-start; }
  .db-btn-lg { width: 100%; text-align: center; }
  .db-orders-header { flex-direction: column; align-items: flex-start; }
  .db-search-input { width: 100%; }
}

/* Paiements */
.db-payments-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 22px 24px; }
.db-payments-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.db-payments-row   { display: flex; gap: 16px; flex-wrap: wrap; }
.db-payment-block  { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 220px; }
.db-payment-desc   { font-size: 13px; color: #8a8a9a; line-height: 1.5; }
.db-stripe-ok      { color: #22c55e; font-weight: 600; }
.db-btn-upgrade { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; align-self: flex-start; }
.db-btn-upgrade:hover { opacity: .9; transform: translateY(-1px); }
.db-btn-stripe { background: linear-gradient(135deg, #635bff, #4f46e5); color: #fff; align-self: flex-start; }
.db-btn-stripe:hover { opacity: .9; transform: translateY(-1px); }
.db-stat-card-clickable:hover { border-color: rgba(108,99,255,.4) !important; background: rgba(108,99,255,.08) !important; transform: translateY(-2px); }

/* Modal plan */
.db-modal-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.db-modal-box { background: #16162a; border: 1px solid rgba(255,255,255,.1); border-radius: 20px; padding: 32px 28px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; position: relative; }
.db-modal-close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); color: #8a8a9a; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 13px; transition: .15s; display: flex; align-items: center; justify-content: center; }
.db-modal-close:hover { background: rgba(255,255,255,.15); color: #fff; }
.db-modal-header { text-align: center; margin-bottom: 24px; }
.db-modal-icon   { font-size: 36px; display: block; margin-bottom: 10px; }
.db-modal-title  { font-size: 20px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
.db-modal-sub    { font-size: 13px; color: #8a8a9a; }
.db-plan-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.db-plan-card    { background: rgba(255,255,255,.04); border: 2px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px 14px; cursor: pointer; transition: .2s; position: relative; }
.db-plan-card:hover { border-color: rgba(108,99,255,.4); background: rgba(108,99,255,.06); }
.db-plan-selected { border-color: #6c63ff !important; background: rgba(108,99,255,.12) !important; }
.db-plan-current  { border-color: #22c55e !important; }
.db-plan-pro      { border-color: rgba(108,99,255,.25); }
.db-plan-badge    { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,.15); color: #8a8a9a; font-size: 10px; font-weight: 700; padding: 2px 10px; border-radius: 100px; white-space: nowrap; }
.db-plan-badge-pro { background: linear-gradient(135deg,#6c63ff,#a78bfa); color: #fff; }
.db-plan-name    { font-size: 16px; font-weight: 700; margin-bottom: 6px; margin-top: 8px; }
.db-plan-price   { font-size: 26px; font-weight: 800; color: #f0f0f0; margin-bottom: 12px; }
.db-plan-price span { font-size: 13px; font-weight: 400; color: #8a8a9a; }
.db-plan-features { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.db-plan-features li { font-size: 12px; color: #8a8a9a; }
.db-plan-summary { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
.db-plan-summary-row { display: flex; justify-content: space-between; font-size: 14px; color: #8a8a9a; }
.db-plan-already-active { font-size: 12px; color: #22c55e; margin-top: 8px; font-weight: 600; }
.db-btn-confirm { width: 100%; padding: 14px; font-size: 15px; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; transition: .2s; background: linear-gradient(135deg, #6c63ff, #4f46e5); color: #fff; font-family: 'DM Sans', sans-serif; }
.db-btn-confirm:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.db-btn-confirm:disabled { opacity: .45; cursor: not-allowed; }
.db-plan-note { text-align: center; font-size: 11px; color: #5a5a6a; margin-top: 10px; }

/* ══════════════════════════════════════════════════════════════
   PANNEAU RESTAURATION UTILISATEUR
══════════════════════════════════════════════════════════════ */
.db-restore-panel {
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(108,99,255,.2);
  border-radius: 18px;
  overflow: hidden;
}

.db-restore-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  background: linear-gradient(135deg, rgba(108,99,255,.07), rgba(167,139,250,.03));
  border-bottom: 1px solid rgba(255,255,255,.06);
  flex-wrap: wrap;
}

.db-restore-title {
  font-size: 15px;
  font-weight: 700;
  color: #a78bfa;
  margin-bottom: 5px;
}

.db-restore-subtitle {
  font-size: 12px;
  color: #5a5a6a;
  line-height: 1.6;
  max-width: 580px;
}

.db-restore-refresh-btn {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: #8a8a9a;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: .15s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  flex-shrink: 0;
}
.db-restore-refresh-btn:hover:not(:disabled) { background: rgba(255,255,255,.1); color: #fff; }
.db-restore-refresh-btn:disabled { opacity: .5; cursor: not-allowed; }

/* Loading / empty / error */
.db-restore-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #5a5a6a; }
.db-restore-error { display: flex; align-items: center; gap: 10px; padding: 18px 22px; color: #f87171; font-size: 13px; }
.db-restore-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px; text-align: center; color: #475569; }
.db-restore-empty-icon { font-size: 36px; margin-bottom: 6px; opacity: .6; }
.db-restore-empty-hint { font-size: 12px; color: #374151; margin-top: 4px; }

/* Liste backups */
.db-restore-list { display: flex; flex-direction: column; }

.db-restore-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  border-bottom: 1px solid rgba(255,255,255,.05);
  gap: 12px;
  flex-wrap: wrap;
  transition: background .15s;
}
.db-restore-item:last-child { border-bottom: none; }
.db-restore-item:hover { background: rgba(255,255,255,.02); }
.db-restore-item-latest { border-left: 3px solid #a78bfa; }

.db-restore-info { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }

.db-restore-filename-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.db-restore-file-icon { font-size: 15px; flex-shrink: 0; }

.db-restore-filename {
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.db-restore-badge-latest {
  background: rgba(167,139,250,.15);
  color: #a78bfa;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 100px;
  border: 1px solid rgba(167,139,250,.25);
  flex-shrink: 0;
}

.db-restore-meta {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: #5a5a6a;
}

/* Boutons restore */
.db-restore-btns { display: flex; gap: 8px; flex-shrink: 0; }

.db-btn-restore-dry {
  background: rgba(56,189,248,.08);
  border: 1px solid rgba(56,189,248,.2);
  color: #38bdf8;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: .15s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'DM Sans', sans-serif;
}
.db-btn-restore-dry:hover:not(:disabled) { background: rgba(56,189,248,.15); }
.db-btn-restore-dry:disabled { opacity: .5; cursor: not-allowed; }

.db-btn-restore-real {
  background: rgba(108,99,255,.1);
  border: 1px solid rgba(108,99,255,.25);
  color: #a78bfa;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: .15s;
  white-space: nowrap;
  font-family: 'DM Sans', sans-serif;
}
.db-btn-restore-real:hover:not(:disabled) { background: rgba(108,99,255,.2); }
.db-btn-restore-real:disabled { opacity: .5; cursor: not-allowed; }

/* Résultat simulation */
.db-restore-dryrun {
  margin: 12px 22px 16px;
  background: rgba(56,189,248,.04);
  border: 1px solid rgba(56,189,248,.15);
  border-radius: 12px;
  overflow: hidden;
}

.db-restore-dryrun-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(56,189,248,.06);
  border-bottom: 1px solid rgba(56,189,248,.1);
  font-size: 13px;
  font-weight: 600;
  color: #38bdf8;
}

.db-restore-dryrun-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #5a5a6a;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: .15s;
  font-family: 'DM Sans', sans-serif;
}
.db-restore-dryrun-close:hover { background: rgba(255,255,255,.08); color: #fff; }

.db-restore-dryrun-detail { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }

.db-restore-dryrun-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,.04);
}
.db-restore-dryrun-row:last-child { border-bottom: none; }
.db-restore-dryrun-total { margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08) !important; }
.db-restore-dryrun-label { color: #5a5a6a; }
.db-restore-dryrun-val   { color: #e2e8f0; font-weight: 600; }
.db-restore-val-accent   { color: #a78bfa; }

.db-restore-dryrun-note {
  font-size: 11px;
  color: #5a5a6a;
  text-align: center;
  padding: 10px 16px 14px;
}

/* Modal confirm restore */
.db-restore-confirm-info { text-align: left; }
.db-restore-confirm-file {
  font-family: monospace;
  font-size: 12px;
  color: #a78bfa;
  background: rgba(108,99,255,.08);
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  word-break: break-all;
}
.db-restore-confirm-warn {
  font-size: 12px;
  color: #f87171;
  background: rgba(239,68,68,.06);
  border: 1px solid rgba(239,68,68,.15);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  line-height: 1.5;
}
.db-restore-confirm-safe {
  font-size: 12px;
  color: #4ade80;
  background: rgba(34,197,94,.06);
  border: 1px solid rgba(34,197,94,.15);
  border-radius: 8px;
  padding: 10px 12px;
  line-height: 1.5;
}
.db-restore-confirm-safe strong { font-weight: 700; }

.db-restore-modal-cancel {
  flex: 1;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: #8a8a9a;
  border-radius: 10px;
  padding: 11px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: .15s;
  font-family: 'DM Sans', sans-serif;
}
.db-restore-modal-cancel:hover { background: rgba(255,255,255,.1); color: #fff; }

.db-restore-modal-confirm {
  flex: 2;
  background: linear-gradient(135deg, #6c63ff, #4f46e5);
  border: none;
  color: #fff;
  border-radius: 10px;
  padding: 11px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
}
.db-restore-modal-confirm:hover:not(:disabled) { opacity: .85; }
.db-restore-modal-confirm:disabled { opacity: .5; cursor: not-allowed; }
</style>
