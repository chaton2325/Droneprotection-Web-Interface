import { defineStore } from 'pinia'
import api from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'
import { useAlertsStore } from './alerts'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },
  actions: {
    restoreSession() {
      const token = localStorage.getItem('dp_token')
      const userRaw = localStorage.getItem('dp_user')
      if (token && userRaw) {
        this.token = token
        this.user = JSON.parse(userRaw)
        connectSocket(token)
      }
      this.ready = true
    },

    setSession(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('dp_token', token)
      localStorage.setItem('dp_user', JSON.stringify(user))
      connectSocket(token)
    },

    async register(payload) {
      const { data } = await api.post('/auth/register', payload)
      this.setSession(data.token, data.user)
      return data.user
    },

    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this.setSession(data.token, data.user)
      return data.user
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('dp_token')
      localStorage.removeItem('dp_user')
      disconnectSocket()

      const alertsStore = useAlertsStore()
      alertsStore.$reset()
    },
  },
})
