// Le backend (PostgreSQL, now()) renvoie des dates ISO 8601 avec timezone
// explicite (ex: "2026-09-08T17:55:38.665Z"), directement exploitables. On
// garde un filet de securite pour un ancien format sans timezone (ex: style
// SQLite "2026-09-08 17:55:38") au cas ou.
const HAS_TIMEZONE = /(Z|[+-]\d{2}:?\d{2})$/
function parseUtc(isoDate) {
  if (!isoDate) return null
  if (HAS_TIMEZONE.test(isoDate)) return new Date(isoDate)
  return new Date(isoDate.replace(' ', 'T') + 'Z')
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

export function secondsSince(isoDate) {
  const date = parseUtc(isoDate)
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / 1000)
}

export function formatDateTime(sqliteDate) {
  const date = parseUtc(sqliteDate)
  if (!date) return ''
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
