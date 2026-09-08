import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
// Origine du backend (sans le /api final) : les avatars sont servis en
// statique a la racine (/uploads/avatars/...), pas sous /api.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
})

// alert.victim_avatar_url / user.avatar_url sont des chemins relatifs
// (/uploads/avatars/xxx.png) : on les prefixe par l'origine du backend.
export function avatarSrc(avatarUrl) {
  if (!avatarUrl) return null
  return `${API_ORIGIN}${avatarUrl}`
}

api.interceptors.request.use((requestConfig) => {
  const token = localStorage.getItem('dp_token')
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`
  }
  return requestConfig
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Erreur reseau.'
    return Promise.reject(new Error(message))
  }
)

export default api
