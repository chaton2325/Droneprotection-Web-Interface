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
    <div>
      <h1 class="font-display text-2xl font-bold text-white">Tableau de bord</h1>
      <p class="text-sm text-slate-400 mt-1">
        Alertes anti-bandit en direct - soyez le premier a repondre.
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p class="text-2xl font-bold text-brand-400 font-display">{{ alertsStore.pending.length }}</p>
        <p class="text-xs text-slate-400 mt-1">En attente</p>
      </div>
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p class="text-2xl font-bold text-warn-400 font-display">{{ alertsStore.inProgress.length }}</p>
        <p class="text-xs text-slate-400 mt-1">En cours</p>
      </div>
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p class="text-2xl font-bold text-ok-400 font-display">{{ alertsStore.closed.length }}</p>
        <p class="text-xs text-slate-400 mt-1">Cloturees</p>
      </div>
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p class="text-2xl font-bold text-white font-display">{{ alertsStore.alerts.length }}</p>
        <p class="text-xs text-slate-400 mt-1">Total suivi</p>
      </div>
    </div>

    <TriggerAlertPanel v-if="canTrigger" />

    <div class="grid lg:grid-cols-5 gap-6 flex-1 min-h-0">
      <div class="lg:col-span-2 flex flex-col gap-4 min-h-0">
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
            :class="tab === 'pending' ? 'bg-brand-500 text-white' : 'bg-[var(--color-surface)] text-slate-400 border border-[var(--color-border)]'"
            @click="tab = 'pending'"
          >
            En attente ({{ alertsStore.pending.length }})
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
            :class="tab === 'accepted' ? 'bg-warn-500 text-white' : 'bg-[var(--color-surface)] text-slate-400 border border-[var(--color-border)]'"
            @click="tab = 'accepted'"
          >
            En cours ({{ alertsStore.inProgress.length }})
          </button>
        </div>

        <div class="flex flex-col gap-3 overflow-y-auto pr-1" style="max-height: 65vh">
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
