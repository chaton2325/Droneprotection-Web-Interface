<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useAlertsStore } from '../stores/alerts'
import StatusBadge from './StatusBadge.vue'
import api from '../services/api'

const auth = useAuthStore()
const alertsStore = useAlertsStore()

const triggering = ref(false)
const errorMsg = ref('')

const myActiveAlert = computed(() =>
  alertsStore.alerts.find(
    (a) => a.user_id === auth.user?.id && ['pending', 'accepted'].includes(a.status)
  )
)

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}

async function trigger() {
  errorMsg.value = ''
  triggering.value = true
  try {
    const position = await getPosition()
    const { data } = await api.post('/alerts', {
      message: 'Alerte declenchee depuis le tableau de bord web',
      ...(position || {}),
    })
    alertsStore.alerts.unshift(data.alert)
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    triggering.value = false
  }
}

async function cancel() {
  if (!myActiveAlert.value) return
  await alertsStore.cancel(myActiveAlert.value.id)
}

async function resolve() {
  if (!myActiveAlert.value) return
  await alertsStore.resolve(myActiveAlert.value.id)
}
</script>

<template>
  <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
    <div v-if="!myActiveAlert" class="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        <p class="text-sm font-semibold text-white">Tester / declencher une alerte</p>
        <p class="text-xs text-slate-400 mt-1">
          Simule le bouton d'urgence de l'application mobile depuis ce navigateur.
        </p>
      </div>
      <button
        type="button"
        :disabled="triggering"
        class="relative shrink-0 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 font-bold text-white shadow-lg shadow-brand-600/40 transition hover:brightness-110 disabled:opacity-60"
        @click="trigger"
      >
        {{ triggering ? 'Envoi...' : 'SOS - Declencher' }}
      </button>
    </div>

    <div v-else class="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        <div class="flex items-center gap-2">
          <p class="text-sm font-semibold text-white">Votre alerte est active</p>
          <StatusBadge :status="myActiveAlert.status" />
        </div>
        <p class="text-xs text-slate-400 mt-1">
          {{
            myActiveAlert.status === 'pending'
              ? 'En attente d\'un repondant...'
              : `Prise en charge par ${myActiveAlert.responder_name}`
          }}
        </p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button
          type="button"
          class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
          @click="cancel"
        >
          Annuler
        </button>
        <button
          type="button"
          class="rounded-lg bg-ok-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          @click="resolve"
        >
          Marquer resolue
        </button>
      </div>
    </div>

    <p v-if="errorMsg" class="mt-3 text-xs text-brand-400">{{ errorMsg }}</p>
  </div>
</template>
