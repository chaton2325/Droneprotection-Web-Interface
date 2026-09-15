<script setup>
import { nextTick, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChat } from '../composables/useChat'
import { timeAgo } from '../utils/time'

const props = defineProps({ alertId: { type: Number, required: true } })
const auth = useAuthStore()
const { messages, loading, sending, error, send } = useChat(props.alertId)

const draft = ref('')
const listEl = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

watch(messages, scrollToBottom, { deep: true })

async function onSend() {
  const text = draft.value
  if (!text.trim()) return
  draft.value = ''
  await send(text)
  scrollToBottom()
}
</script>

<template>
  <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Messagerie avec la victime</p>

    <div ref="listEl" class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
      <p v-if="loading" class="text-xs text-slate-500">Chargement...</p>
      <p v-else-if="messages.length === 0" class="text-xs text-slate-500">Aucun message pour le moment.</p>
      <div
        v-for="message in messages"
        :key="message.id"
        class="max-w-[85%] rounded-xl px-3 py-2 text-sm"
        :class="
          message.sender_id === auth.user?.id
            ? 'self-end bg-brand-500 text-white'
            : 'self-start bg-[var(--color-surface-2)] text-slate-200'
        "
      >
        {{ message.body }}
        <p class="mt-1 text-[10px] opacity-70">{{ timeAgo(message.created_at) }}</p>
      </div>
    </div>

    <p v-if="error" class="mt-2 text-xs text-brand-400">{{ error }}</p>

    <form class="mt-3 flex gap-2" @submit.prevent="onSend">
      <input
        v-model="draft"
        type="text"
        placeholder="Ecrire un message..."
        class="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
      />
      <button
        type="submit"
        :disabled="sending || !draft.trim()"
        class="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
      >
        Envoyer
      </button>
    </form>
  </div>
</template>
