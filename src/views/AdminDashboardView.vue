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
const activeTab = ref('stats')
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
  { key: 'stats', label: "Vue d'ensemble", icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  {
    key: 'alerts',
    label: 'Alertes',
    badge: pendingCount.value,
    icon: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  },
  {
    key: 'users',
    label: 'Utilisateurs',
    count: users.value.length,
    icon: 'M17 20h5v-2a4 4 0 00-3-3.9M9 20H2v-2a4 4 0 014-4h3a4 4 0 014 4v2zM12 7a3 3 0 11-6 0 3 3 0 016 0zm7 2a2 2 0 11-4 0 2 2 0 014 0z',
  },
])

// --- Données du tableau de bord ---
const recentAlerts = computed(() => alerts.value.slice(0, 6))

const DAYS = 14
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const daily = computed(() => {
  const out = []
  const today = new Date()
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    out.push({
      key: dayKey(d),
      label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      count: 0,
    })
  }
  const byKey = Object.fromEntries(out.map((d) => [d.key, d]))
  for (const a of alerts.value) {
    const d = new Date(a.created_at)
    if (byKey[dayKey(d)]) byKey[dayKey(d)].count++
  }
  return out
})
const dailyMax = computed(() => Math.max(1, ...daily.value.map((d) => d.count)))
const dailyTotal = computed(() => daily.value.reduce((n, d) => n + d.count, 0))

const CIRC = 2 * Math.PI * 40
const donut = computed(() => {
  const a = stats.value?.alerts
  if (!a) return []
  const items = [
    { key: 'pending', label: 'En attente', value: a.pending, color: '#ef4444' },
    { key: 'accepted', label: 'En cours', value: a.accepted, color: '#f59e0b' },
    { key: 'resolved', label: 'Résolues', value: a.resolved, color: '#22c55e' },
    { key: 'cancelled', label: 'Annulées', value: a.cancelled, color: '#64748b' },
  ]
  const total = items.reduce((n, i) => n + i.value, 0)
  let offset = 0
  return items.map((i) => {
    const len = total ? (i.value / total) * CIRC : 0
    const seg = { ...i, len, offset }
    offset += len
    return seg
  })
})

const avgResponse = computed(() => {
  const times = alerts.value
    .filter((a) => a.accepted_at && a.created_at)
    .map((a) => new Date(a.accepted_at) - new Date(a.created_at))
    .filter((t) => t >= 0)
  if (!times.length) return null
  const min = Math.round(times.reduce((n, t) => n + t, 0) / times.length / 60000)
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
})

const kpis = computed(() => {
  const a = stats.value?.alerts
  if (!a) return []
  const rate = a.total ? Math.round((a.resolved / a.total) * 100) : 0
  return [
    { label: 'Alertes en attente', value: a.pending, hint: 'À prendre en charge', accent: a.pending ? 'text-brand-400' : 'text-white', bar: 'bg-brand-500', action: () => openAlertsFilter('pending') },
    { label: 'Interventions en cours', value: a.accepted, hint: 'Un répondant est en route', accent: 'text-warn-400', bar: 'bg-warn-500', action: () => openAlertsFilter('accepted') },
    { label: 'Taux de résolution', value: rate + ' %', hint: `${a.resolved} résolues sur ${a.total}`, accent: 'text-ok-400', bar: 'bg-ok-500', action: () => openAlertsFilter('resolved') },
    { label: 'Temps de réaction moyen', value: avgResponse.value ?? '—', hint: 'Création → prise en charge', accent: 'text-accent-400', bar: 'bg-accent-500', action: null },
  ]
})

const userBars = computed(() => {
  const u = stats.value?.users
  if (!u) return []
  const pct = (n) => (u.total ? Math.round((n / u.total) * 100) : 0)
  return [
    { label: 'Victimes', value: u.victims, filter: 'victim', bar: 'bg-accent-500', pct: pct(u.victims) },
    { label: 'Répondants', value: u.responders, filter: 'responder', bar: 'bg-warn-500', pct: pct(u.responders) },
    { label: 'Les deux', value: u.both, filter: 'both', bar: 'bg-ok-500', pct: pct(u.both) },
    { label: 'Admins', value: u.admins, filter: 'admin', bar: 'bg-brand-500', pct: pct(u.admins) },
  ]
})

const stripColor = {
  pending: 'bg-brand-500',
  accepted: 'bg-warn-500',
  resolved: 'bg-ok-500',
  cancelled: 'bg-slate-500',
}
</script>

<template>
  <div class="min-h-screen lg:flex">
    <!-- Barre latérale -->
    <aside class="lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div class="flex items-center gap-3 px-5 py-4">
        <div class="h-10 w-10 shrink-0 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
          <svg class="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p class="text-lg font-bold text-white leading-tight">Dronaid</p>
          <p class="text-xs text-slate-400">Administration</p>
        </div>
      </div>

      <nav class="flex lg:flex-col gap-1 overflow-x-auto px-3 pb-3 lg:pb-0 lg:flex-1" aria-label="Sections admin">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition',
            activeTab === tab.key
              ? 'bg-brand-500/15 text-white'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
          ]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
          </svg>
          <span class="flex-1 text-left">{{ tab.label }}</span>
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

      <div class="hidden lg:flex items-center gap-3 border-t border-[var(--color-border)] p-4">
        <div class="h-10 w-10 shrink-0 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold">
          {{ initial(auth.user?.full_name) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-white">{{ auth.user?.full_name }}</p>
          <button @click="auth.logout()" class="text-xs text-slate-400 hover:text-brand-400">Déconnexion</button>
        </div>
      </div>
    </aside>

    <div class="flex-1 min-w-0">
    <header class="border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur sticky top-0 z-10">
      <div class="px-4 lg:px-8 py-3 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-xl font-bold text-white leading-tight">{{ tabs.find((t) => t.key === activeTab)?.label }}</h1>
          <p class="text-xs text-slate-400 truncate">
            <template v-if="lastRefresh">Mis à jour à {{ lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</template>
            <template v-else>Chargement…</template>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="loadAll"
            :disabled="loading"
            class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-slate-200 hover:border-slate-500 transition disabled:opacity-60"
          >
            <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9L20 9m-16 6l1.6 0" />
            </svg>
            <span class="hidden sm:inline">Actualiser</span>
          </button>
          <button @click="auth.logout()" class="lg:hidden rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">Déconnexion</button>
        </div>
      </div>
    </header>

    <main class="px-4 lg:px-8 py-6">
      <div v-if="error" class="mb-4 flex items-center justify-between gap-3 rounded-xl bg-brand-900/30 border border-brand-500/30 p-4 text-brand-300">
        <span>{{ error }}</span>
        <button @click="loadAll" class="rounded-lg bg-brand-500/20 px-3 py-1.5 text-sm font-semibold hover:bg-brand-500/30">Réessayer</button>
      </div>

      <!-- Vue d'ensemble -->
      <div v-if="activeTab === 'stats'" class="space-y-6 animate-fade-in">
        <!-- Bandeau d'urgence -->
        <div
          v-if="pendingCount"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/40 bg-brand-500/10 px-5 py-4"
        >
          <div class="flex items-center gap-3">
            <span class="relative flex h-3 w-3"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" /><span class="relative inline-flex h-3 w-3 rounded-full bg-brand-500" /></span>
            <p class="font-semibold text-white">{{ pendingCount }} alerte{{ pendingCount > 1 ? 's' : '' }} en attente de prise en charge</p>
          </div>
          <button @click="openAlertsFilter('pending')" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Voir les alertes</button>
        </div>

        <!-- KPI -->
        <div class="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <button
            v-for="k in kpis"
            :key="k.label"
            @click="k.action && k.action()"
            class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition hover:border-slate-500"
          >
            <span class="absolute inset-x-0 top-0 h-1" :class="k.bar" />
            <p class="text-sm font-medium text-slate-400">{{ k.label }}</p>
            <p class="mt-2 text-4xl font-bold" :class="k.accent">{{ k.value }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ k.hint }}</p>
          </button>
        </div>

        <!-- Graphiques -->
        <div class="grid gap-4 lg:grid-cols-3">
          <section class="lg:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div class="flex items-baseline justify-between">
              <h2 class="font-bold text-white">Alertes des 14 derniers jours</h2>
              <span class="text-xs text-slate-500">{{ dailyTotal }} au total</span>
            </div>
            <svg viewBox="0 0 560 190" class="mt-4 w-full" role="img" aria-label="Alertes par jour">
              <line v-for="g in [0, 1, 2, 3]" :key="g" x1="0" x2="560" :y1="150 - g * 40" :y2="150 - g * 40" stroke="#26314a" stroke-dasharray="3 4" />
              <g v-for="(d, i) in daily" :key="d.key">
                <rect
                  :x="i * 40 + 8"
                  :y="150 - (d.count / dailyMax) * 120"
                  width="24"
                  :height="Math.max((d.count / dailyMax) * 120, d.count ? 3 : 1)"
                  rx="4"
                  :fill="d.count ? '#ef4444' : '#26314a'"
                />
                <text v-if="d.count" :x="i * 40 + 20" :y="144 - (d.count / dailyMax) * 120" text-anchor="middle" fill="#e6e9f2" font-size="11" font-weight="700">{{ d.count }}</text>
                <text :x="i * 40 + 20" y="170" text-anchor="middle" fill="#64748b" font-size="10">{{ d.label }}</text>
              </g>
            </svg>
          </section>

          <section class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 class="font-bold text-white">Répartition par statut</h2>
            <div class="mt-4 flex items-center gap-5">
              <svg viewBox="0 0 100 100" class="h-36 w-36 shrink-0 -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1a2333" stroke-width="14" />
                <circle
                  v-for="s in donut"
                  :key="s.key"
                  cx="50" cy="50" r="40" fill="none" stroke-width="14"
                  :stroke="s.color"
                  :stroke-dasharray="`${s.len} ${CIRC - s.len}`"
                  :stroke-dashoffset="-s.offset"
                />
                <text x="50" y="50" transform="rotate(90 50 50)" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="18" font-weight="700">{{ stats?.alerts.total ?? 0 }}</text>
              </svg>
              <ul class="space-y-2 text-sm">
                <li v-for="s in donut" :key="s.key" class="flex items-center gap-2">
                  <span class="h-3 w-3 rounded-full" :style="{ background: s.color }" />
                  <span class="text-slate-300">{{ s.label }}</span>
                  <span class="ml-auto pl-3 font-semibold text-white">{{ s.value }}</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <!-- Dernières alertes -->
          <section class="lg:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div class="flex items-center justify-between px-5 py-4">
              <h2 class="font-bold text-white">Dernières alertes</h2>
              <button @click="openAlertsFilter('all')" class="text-sm font-semibold text-brand-400 hover:text-brand-300">Tout voir →</button>
            </div>
            <ul class="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              <li
                v-for="a in recentAlerts"
                :key="a.id"
                @click="goToAlert(a.id)"
                class="flex cursor-pointer items-center gap-4 px-5 py-3 hover:bg-white/5"
              >
                <div class="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-accent-500/30 bg-accent-500/15 text-accent-400 text-lg font-bold flex items-center justify-center">
                  <img v-if="a.victim_avatar_url" :src="avatarSrc(a.victim_avatar_url)" alt="" class="h-full w-full object-cover" />
                  <span v-else>{{ initial(a.victim_name) }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-white">{{ a.victim_name }}</p>
                  <p class="truncate text-xs text-slate-400">{{ timeAgo(a.created_at) }}<template v-if="a.location_name"> · {{ a.location_name }}</template></p>
                </div>
                <StatusBadge :status="a.status" />
              </li>
              <li v-if="!recentAlerts.length" class="px-5 py-10 text-center text-slate-500">Aucune alerte pour l'instant.</li>
            </ul>
          </section>

          <!-- Utilisateurs -->
          <section class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div class="flex items-center justify-between">
              <h2 class="font-bold text-white">Utilisateurs</h2>
              <span class="text-2xl font-bold text-white">{{ stats?.users.total ?? 0 }}</span>
            </div>
            <ul class="mt-4 space-y-3">
              <li v-for="r in userBars" :key="r.label">
                <button class="w-full text-left" @click="openUsersFilter(r.filter)">
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-300">{{ r.label }}</span>
                    <span class="font-semibold text-white">{{ r.value }}</span>
                  </div>
                  <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div class="h-full rounded-full" :class="r.bar" :style="{ width: r.pct + '%' }" />
                  </div>
                </button>
              </li>
            </ul>
          </section>
        </div>
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
    </div>

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
