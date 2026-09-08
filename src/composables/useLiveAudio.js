import { onBeforeUnmount, ref } from 'vue'
import { getSocket } from '../services/socket'

// Lecture du micro de la victime, diffuse par blocs WAV d'environ 1s
// (voir AudioStreamService cote Flutter + le relais Socket.IO cote backend,
// qui ne livre ces evenements qu'au repondant assigne). Lecture sequentielle
// via un <audio> cache : chaque bloc est joue a la suite du precedent.
export function useLiveAudio(alertId) {
  const active = ref(false)
  const muted = ref(false)

  const audioEl = new Audio()
  const queue = []
  let playing = false
  let currentUrl = null

  function playNext() {
    if (muted.value || queue.length === 0) {
      playing = false
      return
    }
    playing = true
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    currentUrl = queue.shift()
    audioEl.src = currentUrl
    audioEl.play().catch(() => {
      // Autoplay bloque par le navigateur : on retentera au chunk suivant
      // (ou apres une interaction utilisateur qui debloque la lecture).
      playing = false
    })
  }
  audioEl.addEventListener('ended', playNext)

  function base64ToBlob(base64, mimeType) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mimeType || 'audio/wav' })
  }

  function onChunk(payload) {
    if (!payload || payload.alertId !== alertId) return
    active.value = true
    queue.push(URL.createObjectURL(base64ToBlob(payload.data, payload.mimeType)))
    if (!playing) playNext()
  }

  function onEnded(payload) {
    if (!payload || payload.alertId !== alertId) return
    active.value = false
  }

  const socket = getSocket()
  socket?.on('alert:audio-chunk', onChunk)
  socket?.on('alert:audio-ended', onEnded)

  function toggleMute() {
    muted.value = !muted.value
    if (muted.value) {
      audioEl.pause()
      playing = false
    } else if (queue.length > 0 && !playing) {
      playNext()
    }
  }

  onBeforeUnmount(() => {
    socket?.off('alert:audio-chunk', onChunk)
    socket?.off('alert:audio-ended', onEnded)
    audioEl.pause()
    audioEl.removeEventListener('ended', playNext)
    if (currentUrl) URL.revokeObjectURL(currentUrl)
    queue.forEach((url) => URL.revokeObjectURL(url))
  })

  return { active, muted, toggleMute }
}
