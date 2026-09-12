<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import StatusBadge from '../components/StatusBadge.vue'
import { timeAgo } from '../utils/time'

const auth = useAuthStore()
const router = useRouter()

const stats = ref(null)
const alerts = ref([])
const loading = ref(true)
const error = ref(null)
const activeTab = ref('alerts')

async function loadStats() {
  try {
    const { data } = await api.get('/admin/stats')
    stats.value = data.stats
  } catch (err) {
    console.error('Failed to load stats:', err)
  }
}

async function loadAlerts() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/admin/alerts')
    alerts.value = data.alerts
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function goToAlert(id) {
  router.push({ name: 'alert-detail', params: { id } })
}

const statusColors = {
  pending: 'bg-brand-500',
  accepted: 'bg-warn-500',
  resolved: 'bg-ok-500',
  cancelled: 'bg-slate-500',
}

const statCards = computed(() => {
  if (!stats.value) return []
  return [
    { label: 'Total Alertes', value: stats.value.alerts.total, color: 'brand' },
    { label: 'En attente', value: stats.value.alerts.pending, color: 'brand' },
    { label: 'En cours', value: stats.value.alerts.accepted, color: 'warn' },
    { label: 'Résolues', value: stats.value.alerts.resolved, color: 'ok' },
    { label: 'Annulées', value: stats.value.alerts.cancelled, color: 'slate' },
  ]
})

const userStatCards = computed(() => {
  if (!stats.value) return []
  return [
    { label: 'Total Utilisateurs', value: stats.value.users.total, color: 'brand' },
    { label: 'Victimes', value: stats.value.users.victims, color: 'accent' },
    { label: 'Répondants', value: stats.value.users.responders, color: 'warn' },
    { label: 'Les deux', value: stats.value.users.both, color: 'ok' },
    { label: 'Admins', value: stats.value.users.admins, color: 'slate' },
  ]
})

function getRoleBadgeClass(role) {
  const classes = {
    victim: 'bg-accent-500/20 text-accent-400',
    responder: 'bg-warn-500/20 text-warn-400',
    both: 'bg-ok-500/20 text-ok-400',
    admin: 'bg-slate-500/20 text-slate-400',
  }
  return classes[role] || 'bg-slate-500/20 text-slate-400'
}

function getRoleLabel(role) {
  const labels = {
    victim: 'Victime',
    responder: 'Répondant',
    both: 'Les deux',
    admin: 'Admin',
  }
  return labels[role] || role
}

onMounted(() => {
  if (!auth.user || auth.user.role !== 'admin') {
    router.push('/')
    return
  }
  loadStats()
  loadAlerts()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)]">
    <header class="border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg class="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h1 class="text-xl font-bold text-white">Admin Dronaid</h1>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-slate-400">
            Connecté : <strong class="text-white">{{ auth.user?.full_name }}</strong>
          </span>
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-500/20 text-slate-300">Admin</span>
          <button @click="auth.logout()" class="text-sm text-slate-400 hover:text-white transition">Déconnexion</button>
        </div>
      </div>

      <nav class="border-t border-[var(--color-border)] px-4" aria-label="Onglets admin">
        <div class="mx-auto max-w-7xl flex gap-1 overflow-x-auto">
          <button
            @click="activeTab = 'stats'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition',
              activeTab === 'stats'
                ? 'bg-[var(--color-bg)] text-white border-b-2 border-brand-500'
                : 'text-slate-400 hover:text-slate-200',
            ]"
          >
            Statistiques
          </button>
          <button
            @click="activeTab = 'alerts'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition',
              activeTab === 'alerts'
                ? 'bg-[var(--color-bg)] text-white border-b-2 border-brand-500'
                : 'text-slate-400 hover:text-slate-200',
            ]"
          >
            Alertes
          </button>
          <button
            @click="activeTab = 'users'"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition',
              activeTab === 'users'
                ? 'bg-[var(--color-bg)] text-white border-b-2 border-brand-500'
                : 'text-slate-400 hover:text-slate-200',
            ]"
          >
            Utilisateurs
          </button>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <!-- Statistiques -->
      <div v-if="activeTab === 'stats'" class="space-y-6 animate-fade-in">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-white">Vue d'ensemble</h2>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div
            v-for="stat in statCards"
            :key="stat.label"
            class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <p class="text-sm font-medium text-slate-400">{{ stat.label }}</p>
            <p class="mt-1 text-3xl font-bold text-white">{{ stat.value }}</p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mt-4">
          <div
            v-for="stat in userStatCards"
            :key="stat.label"
            class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <p class="text-sm font-medium text-slate-400">{{ stat.label }}</p>
            <p class="mt-1 text-3xl font-bold text-white">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <!-- Alertes -->
      <div v-else-if="activeTab === 'alerts'" class="animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-white">Toutes les alertes</h2>
          <button @click="loadAlerts" :disabled="loading" class="text-sm text-brand-400 hover:text-brand-300 disabled:opacity-50">
            {{ loading ? 'Chargement...' : 'Actualiser' }}
          </button>
        </div>

        <div v-if="error" class="mb-4 rounded-lg bg-brand-900/30 border border-brand-500/30 p-4 text-brand-300">
          {{ error }}
        </div>

        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-900/50">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">ID</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Victime</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Statut</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Pris en charge par</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Position</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Créée le</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr v-for="alert in alerts" :key="alert.id" class="hover:bg-slate-800/50 cursor-pointer" @click="goToAlert(alert.id)">
                  <td class="px-4 py-3 font-mono text-slate-400">#{{ alert.id }}</td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-white">{{ alert.victim_name }}</div>
                    <div class="text-xs text-slate-500">{{ alert.victim_phone || '—' }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <StatusBadge :status="alert.status" />
                  </td>
                  <td class="px-4 py-3">
                    <span v-if="alert.responder_name" class="text-warn-400 font-medium">{{ alert.responder_name }}</span>
                    <span v-else class="text-slate-500">—</span>
                    <div v-if="alert.accepted_at" class="text-xs text-slate-500 mt-0.5">
                      {{ timeAgo(alert.accepted_at) }}
                    </div>
                  </td>
                  <td class="px-4 py-3 text-slate-400">
                    <span v-if="alert.latitude != null" class="font-mono">
                      {{ alert.latitude.toFixed(4) }}, {{ alert.longitude.toFixed(4) }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td class="px-4 py-3 text-slate-400">{{ timeAgo(alert.created_at) }}</td>
                  <td class="px-4 py-3">
                    <button
                      @click.stop="goToAlert(alert.id)"
                      class="text-xs text-brand-400 hover:text-brand-300 underline"
                    >
                      Voir détail
                    </button>
                  </td>
                </tr>
                <tr v-if="alerts.length === 0 && !loading">
                  <td colspan="7" class="px-4 py-12 text-center text-slate-500">Aucune alerte</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Utilisateurs -->
      <div v-else-if="activeTab === 'users'" class="animate-fade-in">
        <h2 class="text-2xl font-bold text-white mb-4">Tous les utilisateurs</h2>
        <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-900/50">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">ID</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Nom</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Email</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Téléphone</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Rôle</th>
                  <th class="px-4 py-3 text-left font-medium text-slate-400">Créé le</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr v-for="user in alerts" :key="user.id">
                  <!-- This would need a separate API call to /admin/users -->
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>