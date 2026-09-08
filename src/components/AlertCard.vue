<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlertsStore } from '../stores/alerts'
import StatusBadge from './StatusBadge.vue'
import PhotoLightbox from './PhotoLightbox.vue'
import { timeAgo } from '../utils/time'
import { useStaleness } from '../composables/useStaleness'
import { avatarSrc } from '../services/api'

const props = defineProps({
  alert: { type: Object, required: true },
})

const auth = useAuthStore()
const alertsStore = useAlertsStore()
const router = useRouter()
const accepting = ref(false)
const errorMsg = ref('')

const canAccept = computed(() => {
  const role = auth.user?.role
  return (
    props.alert.status === 'pending' &&
    (role === 'responder' || role === 'both') &&
    props.alert.user_id !== auth.user?.id
  )
})

const isMine = computed(() => props.alert.user_id === auth.user?.id)
const acceptedByMe = computed(() => props.alert.accepted_by === auth.user?.id)

// Clignotement captivant tant que le repondant n'a pas ouvert/pris en
// charge cette alerte (et jamais pour ses propres alertes).
const isUnacknowledged = computed(
  () =>
    props.alert.status === 'pending' &&
    !isMine.value &&
    !alertsStore.acknowledgedIds.has(props.alert.id)
)

const isStale = useStaleness(() => props.alert)

const stripColor = computed(
  () =>
    ({
      pending: 'bg-brand-500',
      accepted: 'bg-warn-500',
      resolved: 'bg-ok-500',
      cancelled: 'bg-slate-500',
    })[props.alert.status]
)

async function accept() {
  errorMsg.value = ''
  accepting.value = true
  try {
    await alertsStore.accept(props.alert.id)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    accepting.value = false
  }
}

function openDetail() {
  alertsStore.acknowledge(props.alert.id)
  router.push({ name: 'alert-detail', params: { id: props.alert.id } })
}

const enlargedPhoto = ref(null)
function enlargePhoto(url) {
  if (url) enlargedPhoto.value = avatarSrc(url)
}
</script>

<template>
  <div
    class="group relative flex gap-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-slate-500 cursor-pointer"
    :class="{ 'alert-flash': isUnacknowledged }"
    @click="openDetail"
  >
    <span class="absolute inset-y-0 left-0 w-1" :class="stripColor" />

    <div class="flex-1 min-w-0 pl-2">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold text-xs border border-accent-500/30"
            :class="{ 'cursor-pointer hover:opacity-80 transition': alert.victim_avatar_url }"
            @click.stop="enlargePhoto(alert.victim_avatar_url)"
          >
            <img
              v-if="alert.victim_avatar_url"
              :src="avatarSrc(alert.victim_avatar_url)"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else>{{ alert.victim_name?.[0]?.toUpperCase() || '?' }}</span>
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-white truncate">
              {{ alert.victim_name }}
              <span v-if="isMine" class="ml-1 text-[11px] font-normal text-accent-400">(vous)</span>
            </p>
            <p class="text-xs text-slate-400 mt-0.5">{{ timeAgo(alert.created_at) }}</p>
          </div>
        </div>
        <StatusBadge :status="alert.status" />
      </div>

      <p v-if="alert.message" class="mt-2 text-sm text-slate-300 line-clamp-2">
        {{ alert.message }}
      </p>

      <p v-if="alert.latitude != null" class="mt-2 text-xs text-slate-500 font-mono">
        {{ alert.latitude.toFixed(4) }}, {{ alert.longitude.toFixed(4) }}
        <span v-if="alert.accuracy"> - precision {{ Math.round(alert.accuracy) }} m</span>
      </p>

      <p v-if="alert.accepted_by" class="mt-2 text-xs text-warn-400">
        Pris en charge par
        <strong>{{ acceptedByMe ? 'vous' : alert.responder_name }}</strong>
      </p>

      <p v-if="isStale" class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warn-400">
        <span class="h-1.5 w-1.5 rounded-full bg-warn-400" />
        Signal perdu - derniere position {{ timeAgo(alert.updated_at) }}
      </p>

      <p v-if="errorMsg" class="mt-2 text-xs text-brand-400">{{ errorMsg }}</p>

      <div v-if="canAccept" class="mt-3" @click.stop>
        <button
          type="button"
          :disabled="accepting"
          class="w-full sm:w-auto rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow shadow-brand-600/30 transition hover:brightness-110 disabled:opacity-60"
          @click="accept"
        >
          {{ accepting ? 'Prise en charge...' : "J'accepte l'intervention" }}
        </button>
      </div>
    </div>

    <PhotoLightbox :src="enlargedPhoto" @close="enlargedPhoto = null" />
  </div>
</template>
