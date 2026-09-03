<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertsStore } from '../stores/alerts'
import StatusBadge from '../components/StatusBadge.vue'
import { formatDateTime, timeAgo } from '../utils/time'

const alertsStore = useAlertsStore()
const router = useRouter()

onMounted(() => {
  alertsStore.fetchAll()
})
</script>

<template>
  <div class="mx-auto max-w-5xl w-full px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
    <div>
      <h1 class="font-display text-2xl font-bold text-white">Historique des alertes</h1>
      <p class="text-sm text-slate-400 mt-1">Toutes les alertes recentes, quel que soit leur statut.</p>
    </div>

    <div v-if="alertsStore.loading" class="text-slate-400 text-sm">Chargement...</div>

    <div v-else class="overflow-hidden rounded-2xl border border-[var(--color-border)]">
      <table class="w-full text-sm">
        <thead class="bg-[var(--color-surface-2)] text-slate-400 text-xs uppercase tracking-wide">
          <tr>
            <th class="text-left font-semibold px-4 py-3">Victime</th>
            <th class="text-left font-semibold px-4 py-3">Statut</th>
            <th class="text-left font-semibold px-4 py-3">Repondant</th>
            <th class="text-left font-semibold px-4 py-3">Declenchee</th>
            <th class="text-left font-semibold px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="alert in alertsStore.sorted"
            :key="alert.id"
            class="border-t border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-white/[0.03] cursor-pointer"
            @click="router.push({ name: 'alert-detail', params: { id: alert.id } })"
          >
            <td class="px-4 py-3 text-white font-medium">{{ alert.victim_name }}</td>
            <td class="px-4 py-3"><StatusBadge :status="alert.status" /></td>
            <td class="px-4 py-3 text-slate-400">{{ alert.responder_name || '-' }}</td>
            <td class="px-4 py-3 text-slate-400" :title="formatDateTime(alert.created_at)">
              {{ timeAgo(alert.created_at) }}
            </td>
            <td class="px-4 py-3 text-right text-accent-400 font-semibold">Voir &rarr;</td>
          </tr>
          <tr v-if="alertsStore.sorted.length === 0">
            <td colspan="5" class="px-4 py-10 text-center text-slate-500">Aucune alerte enregistree.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
