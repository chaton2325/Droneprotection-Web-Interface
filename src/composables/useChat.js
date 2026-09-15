import { onBeforeUnmount, ref } from 'vue'
import api from '../services/api'
import { getSocket } from '../services/socket'

// Messagerie texte entre la victime et le repondant assigne. Le backend ne
// livre les evenements `alert:message` qu'aux 2 participants (voir
// sendAlertMessage cote backend) : pas de filtrage supplementaire necessaire
// ici au-dela de l'alertId.
export function useChat(alertId) {
  const messages = ref([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref('')

  async function loadHistory() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get(`/alerts/${alertId}/messages`)
      messages.value = data.messages
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function onMessage(message) {
    if (!message || message.alert_id !== alertId) return
    if (messages.value.some((m) => m.id === message.id)) return
    messages.value = [...messages.value, message]
  }

  const socket = getSocket()
  socket?.on('alert:message', onMessage)

  async function send(body) {
    const text = body.trim()
    if (!text) return
    sending.value = true
    try {
      const { data } = await api.post(`/alerts/${alertId}/messages`, { body: text })
      if (!messages.value.some((m) => m.id === data.message.id)) {
        messages.value = [...messages.value, data.message]
      }
    } catch (err) {
      error.value = err.message
    } finally {
      sending.value = false
    }
  }

  onBeforeUnmount(() => {
    socket?.off('alert:message', onMessage)
  })

  loadHistory()

  return { messages, loading, sending, error, send }
}
