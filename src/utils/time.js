// Les dates SQLite (datetime('now')) sont en UTC, sans timezone explicite.
function parseUtc(sqliteDate) {
  if (!sqliteDate) return null
  return new Date(sqliteDate.replace(' ', 'T') + 'Z')
}

export function timeAgo(sqliteDate) {
  const date = parseUtc(sqliteDate)
  if (!date) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 5) return "a l'instant"
  if (seconds < 60) return `il y a ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

export function formatDateTime(sqliteDate) {
  const date = parseUtc(sqliteDate)
  if (!date) return ''
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
