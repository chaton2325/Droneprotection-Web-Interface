<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlertsStore } from '../stores/alerts'
import { startSiren, stopSiren, startTitleFlash, stopTitleFlash } from '../services/alarm'

// Sirene + banniere plein-largeur, visibles depuis n'importe quelle page de
// l'app (montees une fois dans App.vue) : tant qu'une alerte declenchee par
// quelqu'un d'autre n'a pas ete ouverte par ce repondant, ca clignote ET ca
// sonne. Jamais de son/clignotement pour ses propres alertes (c'est la
// victime, elle est deja au courant).

const auth = useAuthStore()
const alertsStore = useAlertsStore()
const router = useRouter()

const canRespond = computed(() => ['responder', 'both', 'admin'].includes(auth.user?.role))

const activeAlarms = computed(() => {
  if (!canRespond.value) return []
  return alertsStore.pending
    .filter((a) => a.user_id !== auth.user?.id && !alertsStore.acknowledgedIds.has(a.id))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
})

const topAlarm = computed(() => activeAlarms.value[0] || null)

watch(
  activeAlarms,
  (list) => {
    if (list.length > 0) {
      startSiren()
      startTitleFlash(list.length === 1 ? '🚨 Nouvelle alerte !' : `🚨 ${list.length} alertes !`)
    } else {
      stopSiren()
      stopTitleFlash()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopSiren()
  stopTitleFlash()
})

function openTopAlarm() {
  const alarm = topAlarm.value
  if (!alarm) return
  alertsStore.acknowledge(alarm.id)
  router.push({ name: 'alert-detail', params: { id: alarm.id } })
}
</script>

<template>
  <div
    v-if="topAlarm"
    role="alert"
    class="siren-banner sticky top-0 z-50 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 text-white cursor-pointer"
    @click="openTopAlarm"
  >
    <div class="flex items-center gap-3 min-w-0">
      <svg viewBox="0 0 24 24" class="h-6 w-6 shrink-0 animate-bounce" fill="currentColor">
        <path
          d="M12 2a7 7 0 0 0-7 7v4.586l-1.707 1.707A1 1 0 0 0 4 17h16a1 1 0 0 0 .707-1.707L19 13.586V9a7 7 0 0 0-7-7Zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Z"
        />
      </svg>
      <p class="font-semibold truncate">
        <span v-if="activeAlarms.length === 1">
          Nouvelle alerte de {{ topAlarm.victim_name }} - cliquez pour repondre
        </span>
        <span v-else>{{ activeAlarms.length }} alertes en attente - cliquez pour repondre</span>
      </p>
    </div>
    <span
      class="hidden sm:inline shrink-0 text-xs font-bold uppercase tracking-wide bg-white/20 rounded-full px-3 py-1"
    >
      Voir l'alerte
    </span>
  </div>
</template>
