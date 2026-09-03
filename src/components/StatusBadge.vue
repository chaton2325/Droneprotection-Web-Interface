<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
})

const config = {
  pending: { label: 'En attente', classes: 'bg-brand-500/15 text-brand-400 border-brand-500/30' },
  accepted: { label: 'Prise en charge', classes: 'bg-warn-500/15 text-warn-400 border-warn-500/30' },
  resolved: { label: 'Resolue', classes: 'bg-ok-500/15 text-ok-400 border-ok-500/30' },
  cancelled: { label: 'Annulee', classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
}

const current = computed(() => config[props.status] || config.cancelled)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
    :class="current.classes"
  >
    <span
      class="h-1.5 w-1.5 rounded-full"
      :class="{
        'bg-brand-400 animate-pulse': status === 'pending',
        'bg-warn-400': status === 'accepted',
        'bg-ok-400': status === 'resolved',
        'bg-slate-400': status === 'cancelled',
      }"
    />
    {{ current.label }}
  </span>
</template>
