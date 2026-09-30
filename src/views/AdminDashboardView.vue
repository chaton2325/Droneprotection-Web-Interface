<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api, { avatarSrc } from '../services/api'
import StatusBadge from '../components/StatusBadge.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import { timeAgo, formatDateTime } from '../utils/time'

const auth = useAuthStore()
const router = useRouter()

const stats = ref(null)
const alerts = ref([])
const users = ref([])
const loading = ref(true)
const error = ref(null)
const activeTab = ref('alerts')
const lastRefresh = ref(null)

const alertSearch = ref('')
const statusFilter = ref('all')
const userSearch = ref('')
const roleFilter = ref('all')
const enlargedPhoto = ref(null)

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    const [s, a, u] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/alerts'),
      api.get('/admin/users'),
    ])
    stats.value = s.data.stats
    alerts.value = a.data.alerts
    users.value = u.data.users
    lastRefresh.value = new Date()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

let timer = null
onMounted(() => {
  if (!auth.user || auth.user.role !== 'admin') {
    router.push('/')
    return
  }
  loadAll()
  timer = setInterval(loadAll, 30000)
})
onBeforeUnmount(() => clearInterval(timer))

function goToAlert(id) {
  router.push({ name: 'alert-detail', params: { id } })
}

function enlarge(url) {
  if (url) enlargedPhoto.value = avatarSrc(url)
}

function initial(name) {
  return name?.[0]?.toUpperCase() || '?'
}

const statusFilters = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'accepted', label: 'En cours' },
  { key: 'resolved', label: 'Résolues' },
  { key: 'cancelled', label: 'Annulées' },
]

const roleFilters = [
  { key: 'all', label: 'Tous' },
  { key: 'victim', label: 'Victimes' },
  { key: 'responder', label: 'Répondants' },
  { key: 'both', label: 'Les deux' },
  { key: 'admin', label: 'Admins' },
]

function alertCount(key) {
  return key === 'all' ? alerts.value.length : alerts.value.filter((a) => a.status === key).length
}
function userCount(key) {
  return key === 'all' ? users.value.length : users.value.filter((u) => u.role === key).length
}

const filteredAlerts = computed(() => {
  const q = alertSearch.value.trim().toLowerCase()
  return alerts.value.filter((a) => {
    if (statusFilter.value !== 'all' && a.status !== statusFilter.value) return false
    if (!q) return true
    return [a.victim_name, a.victim_phone, a.responder_name, a.location_name, a.message, String(a.id)]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  })
})

const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (roleFilter.value !== 'all' && u.role !== roleFilter.value) return false
    if (!q) return true
    return [u.full_name, u.email, u.phone, u.username]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  })
})

const pendingCount = computed(() => stats.value?.alerts.pending ?? 0)

const statCards = computed(() => {
  if (!stats.value) return []
  const a = stats.value.alerts
  return [
    { label: 'Total alertes', value: a.total, filter: 'all', accent: 'text-white', bar: 'bg-slate-400' },
    { label: 'En attente', value: a.pending, filter: 'pending', accent: 'text-brand-400', bar: 'bg-brand-500' },
    { label: 'En cours', value: a.accepted, filter: 'accepted', accent: 'text-warn-400', bar: 'bg-warn-500' },
    { label: 'Résolues', value: a.resolved, filter: 'resolved', accent: 'text-ok-400', bar: 'bg-ok-500' },
    { label: 'Annulées', value: a.cancelled, filter: 'cancelled', accent: 'text-slate-400', bar: 'bg-slate-500' },
  ]
})

const userStatCards = computed(() => {
  if (!stats.value) return []
  const u = stats.value.users
  return [
    { label: 'Utilisateurs', value: u.total, filter: 'all' },
    { label: 'Victimes', value: u.victims, filter: 'victim' },
    { label: 'Répondants', value: u.responders, filter: 'responder' },
    { label: 'Les deux', value: u.both, filter: 'both' },
    { label: 'Admins', value: u.admins, filter: 'admin' },
  ]
})

function openAlertsFilter(filter) {
  statusFilter.value = filter
  activeTab.value = 'alerts'
}
function openUsersFilter(filter) {
  roleFilter.value = filter
  activeTab.value = 'users'
}

const roleBadge = {
  victim: { label: 'Victime', classes: 'bg-accent-500/15 text-accent-400 border-accent-500/30' },
  responder: { label: 'Répondant', classes: 'bg-warn-500/15 text-warn-400 border-warn-500/30' },
  both: { label: 'Victime + Répondant', classes: 'bg-ok-500/15 text-ok-400 border-ok-500/30' },
  admin: { label: 'Admin', classes: 'bg-brand-500/15 text-brand-400 border-brand-500/30' },
}

const tabs = computed(() => [
  { key: 'stats', label: 'Vue d\'ensemble' },
  { key: 'alerts', label: 'Alertes', badge: pendingCount.value },
  { key: 'users', label: 'Utilisateurs', count: users.value.length },
])

const stripColor = {
  pending: 'bg-brand-500',
  accepted: 'bg-warn-500',
  resolved: 'bg-ok-500',
  cancelled: 'bg-slate-500',
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur sticky top-0 z-10">
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-10 w-10 shrink-0 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
            <svg class="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div class="min-w-0">
            <h1 class="text-lg font-bold text-white leading-tight">Administration Dronaid</h1>
            <p class="text-xs text-slate-400 truncate">
              <template v-if="lastRefresh">Mis à jour à {{ lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</template>
              <template v-else>Chargement…</template>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-3">
          <button
            @click="loadAll"
            :disabled="loading"
            class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-slate-200 hover:border-slate-500 transition disabled:opacity-60"
          >
            <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9L20 9m-16 6l1.6 0" />
            </svg>
            <span class="hidden sm:inline">Actualiser</span>
          </button>
          <span class="hidden md:block text-sm text-slate-400">
            <strong class="text-white">{{ auth.user?.full_name }}</strong>
          </span>
          <button
            @click="auth.logout()"
            class="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <nav class="mx-auto max-w-7xl px-4 flex gap-1 overflow-x-auto" aria-label="Sections admin">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition',
            activeTab === tab.key
              ? 'text-white border-brand-500'
              : 'text-slate-400 border-transparent hover:text-slate-200',
          ]"
        >
          {{ tab.label }}
          <span
            v-if="tab.badge"
            class="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white animate-pulse"
          >{{ tab.badge }}</span>
          <span
            v-else-if="tab.count != null"
            class="rounded-full bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-300"
          >{{ tab.count }}</span>
        </button>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <div v-if="error" class="mb-4 flex items-center justify-between gap-3 rounded-xl bg-brand-900/30 border border-brand-500/30 p-4 text-brand-300">
        <span>{{ error }}</span>
        <button @click="loadAll" class="rounded-lg bg-brand-500/20 px-3 py-1.5 text-sm font-semibold hover:bg-brand-500/30">Réessayer</button>
      </div>

      <!-- Vue d'ensemble -->
      <div v-if="activeTab === 'stats'" class="space-y-8 animate-fade-in">
        <section>
          <h2 class="text-xl font-bold text-white mb-1">Alertes</h2>
          <p class="text-sm text-slate-400 mb-4">Cliquez sur une carte pour voir les alertes correspondantes.</p>
          <div class="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <button
              v-for="stat in statCards"
              :key="stat.label"
              @click="openAlertsFilter(stat.filter)"
              class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition hover:border-slate-500 hover:-translate-y-0.5"
            >
              <span class="absolute inset-x-0 top-0 h-1" :class="stat.bar" />
              <p class="text-sm font-medium text-slate-400">{{ stat.label }}</p>
              <p class="mt-2 text-4xl font-bold" :class="stat.accent">{{ stat.value }}</p>
            </button>
          </div>
        </section>

        <section>
          <h2 class="text-xl font-bold text-white mb-1">Utilisateurs</h2>
          <p class="text-sm text-slate-400 mb-4">Cliquez sur une carte pour voir les comptes correspondants.</p>
          <div class="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <button
              v-for="stat in userStatCards"
              :key="stat.label"
              @click="openUsersFilter(stat.filter)"
              class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition hover:border-slate-500 hover:-translate-y-0.5"
            >
              <p class="text-sm font-medium text-slate-400">{{ stat.label }}</p>
              <p class="mt-2 text-4xl font-bold text-white">{{ stat.value }}</p>
            </button>
          </div>
        </section>
      </div>

      <!-- Alertes -->
      <div v-else-if="activeTab === 'alerts'" class="animate-fade-in">
        <div class="flex flex-col gap-3 mb-5 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in statusFilters"
              :key="f.key"
              @click="statusFilter = f.key"
              :class="[
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                statusFilter === f.key
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 hover:border-slate-500',
              ]"
            >
              {{ f.label }}
              <span class="ml-1 opacity-70">{{ alertCount(f.key) }}</span>
            </button>
          </div>
          <input
            v-model="alertSearch"
            type="search"
            placeholder="Rechercher (nom, téléphone, lieu, n°…)"
            class="w-full md:w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500"
          />
        </div>

        <div v-if="loading && !alerts.length" class="py-16 text-center text-slate-400">Chargement…</div>

        <div v-else-if="!filteredAlerts.length" class="rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center text-slate-500">
          Aucune alerte ne correspond.
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2">
          <article
            v-for="a in filteredAlerts"
            :key="a.id"
            @click="goToAlert(a.id)"
            class="relative overflow-hidden cursor-pointer rounded-2xl border bg-[var(--color-surface)] p-5 pl-6 transition hover:border-slate-500 hover:-translate-y-0.5"
            :class="a.status === 'pending' ? 'border-brand-500/50' : 'border-[var(--color-border)]'"
          >
            <span class="absolute inset-y-0 left-0 w-1.5" :class="stripColor[a.status]" />

            <div class="flex items-start gap-4">
              <button
                type="button"
                class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-accent-500/30 bg-accent-500/15 text-accent-400 text-3xl font-bold flex items-center justify-center"
                :class="a.victim_avatar_url ? 'cursor-zoom-in hover:opacity-90' : 'cursor-default'"
                :title="a.victim_avatar_url ? 'Agrandir la photo' : ''"
                @click.stop="enlarge(a.victim_avatar_url)"
              >
                <img v-if="a.victim_avatar_url" :src="avatarSrc(a.victim_avatar_url)" alt="" class="h-full w-full object-cover" />
                <span v-else>{{ initial(a.victim_name) }}</span>
              </button>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-lg font-bold text-white">{{ a.victim_name }}</p>
                    <p class="text-sm text-slate-400">{{ a.victim_phone || 'Pas de téléphone' }}</p>
                  </div>
                  <StatusBadge :status="a.status" />
                </div>
                <p class="mt-1 text-xs text-slate-500">
                  Alerte #{{ a.id }} · {{ timeAgo(a.created_at) }}
                </p>
              </div>
            </div>

            <p v-if="a.message" class="mt-3 text-sm text-slate-300 line-clamp-2">« {{ a.message }} »</p>

            <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3 text-sm">
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-500">Pris en charge par</dt>
                <dd class="mt-0.5">
                  <span v-if="a.responder_name" class="font-semibold text-warn-400">{{ a.responder_name }}</span>
                  <span v-else class="text-slate-500">Personne pour l'instant</span>
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-slate-500">Lieu</dt>
                <dd class="mt-0.5 text-slate-300 truncate">
                  <template v-if="a.location_name">{{ a.location_name }}</template>
                  <span v-else-if="a.latitude != null" class="font-mono text-xs">{{ a.latitude.toFixed(4) }}, {{ a.longitude.toFixed(4) }}</span>
                  <span v-else class="text-slate-500">—</span>
                </dd>
              </div>
            </dl>

            <div class="mt-4 flex justify-end">
              <span class="text-sm font-semibold text-brand-400">Voir le détail →</span>
            </div>
          </article>
        </div>
      </div>

      <!-- Utilisateurs -->
      <div v-else-if="activeTab === 'users'" class="animate-fade-in">
        <div class="flex flex-col gap-3 mb-5 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in roleFilters"
              :key="f.key"
              @click="roleFilter = f.key"
              :class="[
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                roleFilter === f.key
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 hover:border-slate-500',
              ]"
            >
              {{ f.label }}
              <span class="ml-1 opacity-70">{{ userCount(f.key) }}</span>
            </button>
          </div>
          <input
            v-model="userSearch"
            type="search"
            placeholder="Rechercher (nom, email, téléphone…)"
            class="w-full md:w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500"
          />
        </div>

        <div v-if="loading && !users.length" class="py-16 text-center text-slate-400">Chargement…</div>

        <div v-else-if="!filteredUsers.length" class="rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center text-slate-500">
          Aucun utilisateur ne correspond.
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="u in filteredUsers"
            :key="u.id"
            class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-accent-500/30 bg-accent-500/15 text-accent-400 text-3xl font-bold flex items-center justify-center"
                :class="u.avatar_url ? 'cursor-zoom-in hover:opacity-90' : 'cursor-default'"
                @click="enlarge(u.avatar_url)"
              >
                <img v-if="u.avatar_url" :src="avatarSrc(u.avatar_url)" alt="" class="h-full w-full object-cover" />
                <span v-else>{{ initial(u.full_name) }}</span>
              </button>
              <div class="min-w-0">
                <p class="truncate text-lg font-bold text-white">{{ u.full_name }}</p>
                <span
                  class="mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  :class="(roleBadge[u.role] || roleBadge.admin).classes"
                >{{ (roleBadge[u.role] || { label: u.role }).label }}</span>
              </div>
            </div>

            <dl class="mt-4 space-y-2 border-t border-[var(--color-border)] pt-3 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">Email</dt>
                <dd class="truncate text-slate-200">{{ u.email || '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">Téléphone</dt>
                <dd class="text-slate-200">{{ u.phone || '—' }}</dd>
              </div>
              <div v-if="u.emergency_contact_name" class="flex justify-between gap-3">
                <dt class="text-slate-500">Contact d'urgence</dt>
                <dd class="truncate text-slate-200">{{ u.emergency_contact_name }}<span v-if="u.emergency_contact_phone"> · {{ u.emergency_contact_phone }}</span></dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">Inscrit le</dt>
                <dd class="text-slate-200">{{ formatDateTime(u.created_at) }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </div>
    </main>

    <PhotoLightbox :src="enlargedPhoto" @close="enlargedPhoto = null" />
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
