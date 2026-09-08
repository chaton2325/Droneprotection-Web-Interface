// Alarme sonore + clignotement du titre d'onglet pour les nouvelles alertes,
// generee via Web Audio API (aucun fichier audio a heberger).

let audioCtx = null
let sirenIntervalId = null
let toneToggle = false

function ensureContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

function beep(freq, duration) {
  const ctx = ensureContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration + 0.02)
}

// Sirene deux tons (alternance aigu/grave) qui boucle jusqu'a stopSiren().
export function startSiren() {
  if (sirenIntervalId) return
  ensureContext()
  const tick = () => {
    toneToggle = !toneToggle
    beep(toneToggle ? 880 : 660, 0.26)
  }
  tick()
  sirenIntervalId = setInterval(tick, 420)
}

export function stopSiren() {
  if (sirenIntervalId) {
    clearInterval(sirenIntervalId)
    sirenIntervalId = null
  }
}

let titleFlashIntervalId = null
let originalTitle = null

export function startTitleFlash(message) {
  if (titleFlashIntervalId) return
  originalTitle = document.title
  let toggled = false
  titleFlashIntervalId = setInterval(() => {
    document.title = toggled ? originalTitle : message
    toggled = !toggled
  }, 1000)
}

export function stopTitleFlash() {
  if (titleFlashIntervalId) {
    clearInterval(titleFlashIntervalId)
    titleFlashIntervalId = null
    if (originalTitle) document.title = originalTitle
  }
}
