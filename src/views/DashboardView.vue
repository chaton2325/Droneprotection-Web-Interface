<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useAlertsStore } from '../stores/alerts'
import AlertCard from '../components/AlertCard.vue'
import MapView from '../components/MapView.vue'
import TriggerAlertPanel from '../components/TriggerAlertPanel.vue'

const auth = useAuthStore()
const alertsStore = useAlertsStore()
const tab = ref('pending')

const tiles = computed(() => [
  { label: 'En attente', value: alertsStore.pending.length, text: 'text-brand-400', bar: 'bg-brand-500' },
  { label: 'En cours', value: alertsStore.inProgress.length, text: 'text-warn-400', bar: 'bg-warn-500' },
  { label: 'Clôturées', value: alertsStore.closed.length, text: 'text-ok-400', bar: 'bg-ok-500' },
  { label: 'Total suivi', value: alertsStore.alerts.length, text: 'text-white', bar: 'bg-slate-400' },
])

onMounted(() => {
  alertsStore.bindSocket()
  alertsStore.fetchActive()
})

const canTrigger = computed(() => ['victim', 'both'].includes(auth.user?.role))

const visible = computed(() => (tab.value === 'pending' ? alertsStore.pending : alertsStore.inProgress))
const mapAlerts = computed(() => [...alertsStore.pending, ...alertsStore.inProgress])
</script>

<template>
  <div class="mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-3xl font-bold text-white">Tableau de bord</h1>
        <p class="text-sm text-slate-400 mt-1">
          Bonjour <strong class="text-slate-200">{{ auth.user?.full_name }}</strong> — alertes en direct, soyez le premier à répondre.
        </p>
      </div>
      <span class="flex items-center gap-2 rounded-full border border-ok-500/30 bg-ok-500/10 px-3 py-1 text-xs font-semibold text-ok-400">
        <span class="h-2 w-2 rounded-full bg-ok-400 animate-pulse" /> Temps réel
      </span>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="t in tiles"
        :key="t.label"
        class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      >
        <span class="absolute inset-x-0 top-0 h-1" :class="t.bar" />
        <p class="text-sm font-medium text-slate-400">{{ t.label }}</p>
        <p class="mt-2 text-4xl font-bold font-display" :class="t.text">{{ t.value }}</p>
      </div>
    </div>

    <TriggerAlertPanel v-if="canTrigger" />

    <div class="grid lg:grid-cols-5 gap-6 flex-1 min-h-0">
      <div class="lg:col-span-2 flex flex-col gap-4 min-h-0">
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="tab === 'pending' ? 'bg-brand-500 text-white' : 'bg-[var(--color-surface)] text-slate-400 border border-[var(--color-border)]'"
            @click="tab = 'pending'"
          >
            En attente ({{ alertsStore.pending.length }})
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="tab === 'accepted' ? 'bg-warn-500 text-white' : 'bg-[var(--color-surface)] text-slate-400 border border-[var(--color-border)]'"
            @click="tab = 'accepted'"
          >
            En cours ({{ alertsStore.inProgress.length }})
          </button>
        </div>

        <div class="flex flex-col gap-3 overflow-y-auto pr-1" style="max-height: calc(100vh - 20rem); min-height: 20rem">
          <AlertCard v-for="alert in visible" :key="alert.id" :alert="alert" />

          <div
            v-if="!alertsStore.loading && visible.length === 0"
            class="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center"
          >
            <p class="text-sm text-slate-400">
              {{ tab === 'pending' ? "Aucune alerte en attente pour le moment." : "Aucune intervention en cours." }}
            </p>
          </div>
        </div>
      </div>

      <div class="lg:col-span-3 min-h-[360px] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <MapView :alerts="mapAlerts" height="100%" />
      </div>
    </div>
  </div>
</template>
