<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlertsStore } from '../stores/alerts'
import { getSocket } from '../services/socket'
import StatusBadge from '../components/StatusBadge.vue'
import MapView from '../components/MapView.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import { formatDateTime, timeAgo } from '../utils/time'
import { useStaleness } from '../composables/useStaleness'
import { useLiveAudio } from '../composables/useLiveAudio'
import { avatarSrc } from '../services/api'

const props = defineProps({ id: { type: [String, Number], required: true } })
const auth = useAuthStore()
const alertsStore = useAlertsStore()
const router = useRouter()

const busy = ref(false)
const errorMsg = ref('')

const myPosition = ref(null)
const locatingMe = ref(false)
const routeSummary = ref(null)
const routeError = ref('')

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}
function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function toggleRoute() {
  if (myPosition.value) {
    myPosition.value = null
    routeSummary.value = null
    routeError.value = ''
    return
  }

  if (!navigator.geolocation) {
    routeError.value = "La geolocalisation n'est pas disponible sur ce navigateur."
    return
  }

  routeError.value = ''
  locatingMe.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      myPosition.value = [pos.coords.latitude, pos.coords.longitude]
      locatingMe.value = false
    },
    () => {
      routeError.value = 'Impossible de recuperer votre position (autorisation refusee ?).'
      locatingMe.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

onMounted(() => {
  alertsStore.bindSocket()
  alertsStore.fetchDetail(props.id)
  alertsStore.acknowledge(Number(props.id))
  getSocket()?.emit('alert:subscribe', props.id)
})

onBeforeUnmount(() => {
  getSocket()?.emit('alert:unsubscribe', props.id)
})

const alert = computed(() => alertsStore.current)
const isStale = useStaleness(() => alert.value)

// Photo agrandie au clic (victime ou repondant) - fermeture au clic hors image.
const enlargedPhoto = ref(null)
function enlargePhoto(url) {
  if (url) enlargedPhoto.value = avatarSrc(url)
}

// Micro de la victime, ouvert automatiquement de son cote des qu'une
// intervention est acceptee. Le backend ne livre ces evenements qu'au
// repondant assigne : rien ne se passe pour les autres visiteurs de la page.
const { active: audioActive, muted: audioMuted, toggleMute: toggleAudioMute } = useLiveAudio(Number(props.id))
const isAssignedResponder = computed(() => alert.value?.accepted_by === auth.user?.id)

const canAccept = computed(() => {
  const role = auth.user?.role
  return (
    alert.value?.status === 'pending' &&
    (role === 'responder' || role === 'both') &&
    alert.value?.user_id !== auth.user?.id
  )
})
const canResolve = computed(
  () =>
    alert.value &&
    ['pending', 'accepted'].includes(alert.value.status) &&
    (alert.value.user_id === auth.user?.id || alert.value.accepted_by === auth.user?.id)
)
const canCancel = computed(
  () => alert.value && ['pending', 'accepted'].includes(alert.value.status) && alert.value.user_id === auth.user?.id
)

async function run(action) {
  errorMsg.value = ''
  busy.value = true
  try {
    await alertsStore[action](props.id)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
    <button
      type="button"
      class="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white w-fit"
      @click="router.push({ name: 'dashboard' })"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
      Retour au tableau de bord
    </button>

    <div v-if="alertsStore.loading && !alert" class="text-slate-400 text-sm">Chargement...</div>

    <template v-else-if="alert">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="font-display text-2xl font-bold text-white">Alerte #{{ alert.id }}</h1>
            <StatusBadge :status="alert.status" />
            <span
              v-if="isStale"
              class="inline-flex items-center gap-1.5 rounded-full border border-warn-500/30 bg-warn-500/15 px-2.5 py-1 text-xs font-semibold text-warn-400"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-warn-400" />
              Signal perdu
            </span>
          </div>
          <p class="text-sm text-slate-400 mt-1">
            Declenchee {{ timeAgo(alert.created_at) }} - {{ formatDateTime(alert.created_at) }}
            <span v-if="isStale" class="text-warn-400">
              - derniere position {{ timeAgo(alert.updated_at) }}
            </span>
          </p>
        </div>

        <div class="flex gap-2">
          <button
            v-if="canAccept"
            type="button"
            :disabled="busy"
            class="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:brightness-110 disabled:opacity-60"
            @click="run('accept')"
          >
            J'accepte l'intervention
          </button>
          <button
            v-if="canResolve"
            type="button"
            :disabled="busy"
            class="rounded-xl bg-ok-500 px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            @click="run('resolve')"
          >
            Marquer resolue
          </button>
          <button
            v-if="canCancel"
            type="button"
            :disabled="busy"
            class="rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-60"
            @click="run('cancel')"
          >
            Annuler
          </button>
        </div>
      </div>

      <p v-if="errorMsg" class="rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2 text-sm text-brand-400">
        {{ errorMsg }}
      </p>

      <div class="grid lg:grid-cols-5 gap-6">
        <div class="lg:col-span-2 flex flex-col gap-4">
          <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Personne en danger</p>
            <div class="mt-2 flex items-center gap-3">
              <div
                class="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold border border-accent-500/30"
                :class="{ 'cursor-pointer hover:opacity-80 transition': alert.victim_avatar_url }"
                @click="enlargePhoto(alert.victim_avatar_url)"
              >
                <img
                  v-if="alert.victim_avatar_url"
                  :src="avatarSrc(alert.victim_avatar_url)"
                  alt=""
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ alert.victim_name?.[0]?.toUpperCase() || '?' }}</span>
              </div>
              <div>
                <p class="text-lg font-semibold text-white">{{ alert.victim_name }}</p>
                <a
                  v-if="alert.victim_phone"
                  :href="`tel:${alert.victim_phone}`"
                  class="text-sm text-accent-400 hover:text-accent-300"
                >
                  {{ alert.victim_phone }}
                </a>
              </div>
            </div>
            <p v-if="alert.message" class="mt-3 text-sm text-slate-300 leading-relaxed">{{ alert.message }}</p>
          </div>

          <div
            v-if="alert.accepted_by"
            class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Repondant en charge</p>
            <div class="mt-2 flex items-center gap-3">
              <div
                class="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-warn-500/20 text-warn-400 flex items-center justify-center font-bold border border-warn-500/30"
                :class="{ 'cursor-pointer hover:opacity-80 transition': alert.responder_avatar_url }"
                @click="enlargePhoto(alert.responder_avatar_url)"
              >
                <img
                  v-if="alert.responder_avatar_url"
                  :src="avatarSrc(alert.responder_avatar_url)"
                  alt=""
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ alert.responder_name?.[0]?.toUpperCase() || '?' }}</span>
              </div>
              <div>
                <p class="text-lg font-semibold text-white">{{ alert.responder_name }}</p>
                <a
                  v-if="alert.responder_phone"
                  :href="`tel:${alert.responder_phone}`"
                  class="text-sm text-accent-400 hover:text-accent-300"
                >
                  {{ alert.responder_phone }}
                </a>
              </div>
            </div>
            <p class="mt-2 text-xs text-slate-500">Accepte {{ timeAgo(alert.accepted_at) }}</p>

            <button
              v-if="isAssignedResponder"
              type="button"
              class="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition"
              :class="
                audioActive && !audioMuted
                  ? 'border-ok-500/30 bg-ok-500/10 text-ok-400'
                  : 'border-[var(--color-border)] text-slate-400 hover:bg-white/5'
              "
              @click="toggleAudioMute"
            >
              <span class="flex items-center gap-2">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                  <path
                    d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
                  />
                </svg>
                <span v-if="audioMuted">Micro victime coupe</span>
                <span v-else-if="audioActive">Micro victime en direct</span>
                <span v-else>En attente du micro de la victime...</span>
              </span>
              <span class="text-[10px] uppercase tracking-wide opacity-70">
                {{ audioMuted ? 'Reactiver' : 'Couper' }}
              </span>
            </button>
          </div>

          <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Historique de position ({{ alertsStore.locations.length }})
            </p>
            <ul class="space-y-2 max-h-56 overflow-y-auto pr-1">
              <li
                v-for="loc in [...alertsStore.locations].reverse()"
                :key="loc.id"
                class="flex items-center justify-between text-xs text-slate-400 font-mono"
              >
                <span>{{ loc.latitude.toFixed(4) }}, {{ loc.longitude.toFixed(4) }}</span>
                <span>{{ timeAgo(loc.recorded_at) }}</span>
              </li>
              <li v-if="alertsStore.locations.length === 0" class="text-xs text-slate-500">
                Aucune position recue pour le moment.
              </li>
            </ul>
          </div>
        </div>

        <div class="lg:col-span-3 flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              :disabled="locatingMe"
              class="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-60"
              @click="toggleRoute"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 text-accent-400" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {{ locatingMe ? 'Localisation...' : myPosition ? "Masquer l'itineraire" : "Voir l'itineraire" }}
            </button>

            <div
              v-if="routeSummary"
              class="flex items-center gap-2 rounded-xl bg-accent-500/10 border border-accent-500/30 px-4 py-2 text-sm font-semibold text-accent-400"
            >
              <template v-if="routeSummary.straightLine">
                &asymp; {{ formatDistance(routeSummary.distance) }} a vol d'oiseau
              </template>
              <template v-else>
                {{ formatDistance(routeSummary.distance) }} - {{ formatDuration(routeSummary.time) }}
              </template>
            </div>

            <span class="text-[11px] text-slate-500">Itineraire routier via OSRM - gratuit, sans cle API</span>
          </div>

          <p v-if="routeError" class="rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2 text-sm text-brand-400">
            {{ routeError }}
          </p>

          <div class="flex-1 min-h-[420px] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <MapView
              :alerts="[alert]"
              :selected-id="alert.id"
              :route-from="myPosition"
              height="100%"
              @route-summary="(s) => (routeSummary = s)"
              @route-error="(e) => (routeError = e)"
            />
          </div>
        </div>
      </div>
    </template>

    <PhotoLightbox :src="enlargedPhoto" @close="enlargedPhoto = null" />
  </div>
</template>
