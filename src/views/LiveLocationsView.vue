<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import api, { avatarSrc } from '../services/api'
import { getSocket } from '../services/socket'
import { timeAgo } from '../utils/time'

const search = ref('')
const page = ref(1)
const pageSize = 20
const users = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function fetchPage() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/users/live-locations', {
      params: { search: search.value.trim() || undefined, page: page.value, pageSize },
    })
    users.value = data.users
    total.value = data.total
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchPage()
  }, 350)
})

function goToPage(next) {
  if (next < 1 || next > totalPages.value) return
  page.value = next
  fetchPage()
}

// Patch en direct la ligne concernee plutot que de refaire un aller-retour
// serveur a chaque mise a jour de position (voir broadcastLiveLocation cote
// backend - meme evenement diffuse a tous les repondants connectes).
function onLiveUpdate(payload) {
  const idx = users.value.findIndex((u) => u.id === payload.id)
  if (idx === -1) {
    // Quelqu'un vient d'activer le partage : pas assez d'info ici pour
    // l'inserer proprement dans le tri/la page courante, on recharge.
    fetchPage()
    return
  }
  users.value[idx] = {
    ...users.value[idx],
    live_latitude: payload.latitude,
    live_longitude: payload.longitude,
    live_location_at: payload.updated_at,
    accessible: true,
  }
}

function onLiveStopped(payload) {
  const idx = users.value.findIndex((u) => u.id === payload.id)
  if (idx === -1) return
  users.value.splice(idx, 1)
  total.value = Math.max(0, total.value - 1)
}

const socket = getSocket()

onMounted(() => {
  fetchPage()
  socket?.on('user:live-location', onLiveUpdate)
  socket?.on('user:live-location-stopped', onLiveStopped)
})

onBeforeUnmount(() => {
  socket?.off('user:live-location', onLiveUpdate)
  socket?.off('user:live-location-stopped', onLiveStopped)
})

function mapsUrl(user) {
  return `https://www.google.com/maps/search/?api=1&query=${user.live_latitude},${user.live_longitude}`
}
function directionsUrl(user) {
  return `https://www.google.com/maps/dir/?api=1&destination=${user.live_latitude},${user.live_longitude}&travelmode=driving`
}

const roleLabels = { victim: 'Utilisateur mobile', responder: 'Repondant', both: 'Les deux', admin: 'Admin' }
</script>

<template>
  <div class="mx-auto max-w-5xl w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
    <div>
      <h1 class="font-display text-2xl font-bold text-white">Localisation en direct</h1>
      <p class="text-sm text-slate-400 mt-1">
        Toutes les personnes de la plateforme ayant active le partage de position en direct.
      </p>
    </div>

    <input
      v-model="search"
      type="search"
      placeholder="Rechercher par nom ou @nom d'utilisateur..."
      class="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
    />

    <p v-if="error" class="rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2 text-sm text-brand-400">
      {{ error }}
    </p>

    <div v-if="loading && users.length === 0" class="text-slate-400 text-sm">Chargement...</div>

    <div v-else class="overflow-hidden rounded-2xl border border-[var(--color-border)]">
      <table class="w-full text-sm">
        <thead class="bg-[var(--color-surface-2)] text-slate-400 text-xs uppercase tracking-wide">
          <tr>
            <th class="text-left font-semibold px-4 py-3">Personne</th>
            <th class="text-left font-semibold px-4 py-3">Role</th>
            <th class="text-left font-semibold px-4 py-3">Statut</th>
            <th class="text-left font-semibold px-4 py-3">Derniere position</th>
            <th class="text-left font-semibold px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-t border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div
                  class="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold text-xs border border-accent-500/30"
                >
                  <img
                    v-if="user.avatar_url"
                    :src="avatarSrc(user.avatar_url)"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                  <span v-else>{{ user.full_name?.[0]?.toUpperCase() || '?' }}</span>
                </div>
                <div>
                  <p class="text-white font-medium leading-tight">{{ user.full_name }}</p>
                  <p class="text-xs text-slate-500 leading-tight">@{{ user.username }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-slate-400">{{ roleLabels[user.role] || user.role }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border"
                :class="
                  user.accessible
                    ? 'bg-ok-500/15 text-ok-400 border-ok-500/30'
                    : 'bg-white/5 text-slate-400 border-[var(--color-border)]'
                "
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="user.accessible ? 'bg-ok-400' : 'bg-slate-500'" />
                {{ user.accessible ? 'Accessible' : 'Hors ligne' }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-400">
              {{ user.live_location_at ? timeAgo(user.live_location_at) : 'Aucune position recue' }}
            </td>
            <td class="px-4 py-3">
              <div v-if="user.live_latitude != null" class="flex items-center gap-3">
                <a
                  :href="mapsUrl(user)"
                  target="_blank"
                  rel="noopener"
                  class="text-accent-400 hover:text-accent-300 font-semibold"
                >
                  Ouvrir dans Maps
                </a>
                <a
                  :href="directionsUrl(user)"
                  target="_blank"
                  rel="noopener"
                  class="text-brand-400 hover:text-brand-300 font-semibold"
                >
                  Itineraire
                </a>
              </div>
              <span v-else class="text-slate-600">-</span>
            </td>
          </tr>
          <tr v-if="!loading && users.length === 0">
            <td colspan="5" class="px-4 py-10 text-center text-slate-500">
              Personne ne partage sa position en direct pour le moment.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > 0" class="flex items-center justify-between text-sm text-slate-400">
      <p>Page {{ page }} / {{ totalPages }} - {{ total }} au total</p>
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="page <= 1"
          class="rounded-lg border border-[var(--color-border)] px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          @click="goToPage(page - 1)"
        >
          Precedent
        </button>
        <button
          type="button"
          :disabled="page >= totalPages"
          class="rounded-lg border border-[var(--color-border)] px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          @click="goToPage(page + 1)"
        >
          Suivant
        </button>
      </div>
    </div>
  </div>
</template>
