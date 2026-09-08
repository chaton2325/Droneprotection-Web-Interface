import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { secondsSince } from '../utils/time'

// Au-dela de ce delai sans mise a jour de position, on considere le contact
// avec le telephone de la victime comme perdu (ecran eteint, batterie morte,
// zone sans reseau...). L'app mobile envoie sa position toutes les 6s tant
// qu'une alerte est active : 60s laisse une marge confortable contre les
// creux reseau ponctuels tout en restant reactif.
const STALE_THRESHOLD_SECONDS = 60

/**
 * Indique si une alerte active (pending/accepted) n'a plus ete mise a jour
 * depuis un moment : le telephone de la victime a probablement perdu le
 * contact (eteint, batterie morte...). On ne l'annule jamais automatiquement
 * (ce serait dangereux si la victime est reellement en difficulte) : on se
 * contente de le signaler aux repondants.
 */
export function useStaleness(getAlert) {
  const tick = ref(0)
  let intervalId = null

  onMounted(() => {
    intervalId = setInterval(() => {
      tick.value += 1
    }, 5000)
  })
  onBeforeUnmount(() => clearInterval(intervalId))

  return computed(() => {
    tick.value // force la reevaluation periodique
    const alert = getAlert()
    if (!alert || !['pending', 'accepted'].includes(alert.status)) return false
    const seconds = secondsSince(alert.updated_at)
    return seconds != null && seconds > STALE_THRESHOLD_SECONDS
  })
}
