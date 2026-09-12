import { onBeforeUnmount, ref } from 'vue'
import { getSocket } from '../services/socket'

// Affichage des cameras de la victime, diffusees sous forme de photos JPEG
// rapprochees (voir VideoStreamService cote Flutter + le relais Socket.IO
// cote backend, qui ne livre ces evenements qu'au repondant assigne).
// Chaque nouvelle image recue remplace la precedente pour la camera
// concernee (avant / arriere), donnant un effet de video quasi-live une
// fois affichee dans un <img>.
export function useLiveVideo(alertId) {
  const active = ref(false)
  const dualCamera = ref(false)
  const backFrameUrl = ref(null)
  const frontFrameUrl = ref(null)

  let backUrl = null
  let frontUrl = null

  function base64ToBlob(base64, mimeType) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mimeType || 'image/jpeg' })
  }

  function onChunk(payload) {
    if (!payload || payload.alertId !== alertId) return
    active.value = true

    const url = URL.createObjectURL(base64ToBlob(payload.data, payload.mimeType))
    if (payload.camera === 'front') {
      if (frontUrl) URL.revokeObjectURL(frontUrl)
      frontUrl = url
      frontFrameUrl.value = url
      dualCamera.value = true
    } else {
      if (backUrl) URL.revokeObjectURL(backUrl)
      backUrl = url
      backFrameUrl.value = url
    }
  }

  function onEnded(payload) {
    if (!payload || payload.alertId !== alertId) return
    active.value = false
    dualCamera.value = false
    if (backUrl) URL.revokeObjectURL(backUrl)
    if (frontUrl) URL.revokeObjectURL(frontUrl)
    backUrl = null
    frontUrl = null
    backFrameUrl.value = null
    frontFrameUrl.value = null
  }

  const socket = getSocket()
  socket?.on('alert:video-chunk', onChunk)
  socket?.on('alert:video-ended', onEnded)

  onBeforeUnmount(() => {
    socket?.off('alert:video-chunk', onChunk)
    socket?.off('alert:video-ended', onEnded)
    if (backUrl) URL.revokeObjectURL(backUrl)
    if (frontUrl) URL.revokeObjectURL(frontUrl)
  })

  return { active, dualCamera, backFrameUrl, frontFrameUrl }
}
