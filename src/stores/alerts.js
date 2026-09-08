import { defineStore } from 'pinia'
import api from '../services/api'
import { getSocket } from '../services/socket'

function upsert(list, alert) {
  const idx = list.findIndex((a) => a.id === alert.id)
  if (idx === -1) {
    list.unshift(alert)
  } else {
    list[idx] = alert
  }
}

export const useAlertsStore = defineStore('alerts', {
  state: () => ({
    alerts: [],
    current: null,
    locations: [],
    loading: false,
    error: null,
    lastEvent: null,
    // Alertes "pending" que le repondant a deja cliquees/ouvertes : la
    // sirene et le clignotement captivant s'arretent pour celles-ci.
    acknowledgedIds: new Set(),
    _boundSocket: null,
  }),
  getters: {
    pending: (state) => state.alerts.filter((a) => a.status === 'pending'),
    inProgress: (state) => state.alerts.filter((a) => a.status === 'accepted'),
    closed: (state) => state.alerts.filter((a) => ['resolved', 'cancelled'].includes(a.status)),
    sorted: (state) =>
      [...state.alerts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  },
  actions: {
    async fetchActive() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/alerts', { params: { scope: 'active' } })
        this.alerts = data.alerts
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async fetchAll() {
      this.loading = true
      try {
        const { data } = await api.get('/alerts', { params: { scope: 'all' } })
        this.alerts = data.alerts
      } finally {
        this.loading = false
      }
    },

    async fetchMine() {
      this.loading = true
      try {
        const { data } = await api.get('/alerts', { params: { scope: 'mine' } })
        this.alerts = data.alerts
      } finally {
        this.loading = false
      }
    },

    async fetchDetail(id) {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get(`/alerts/${id}`)
        this.current = data.alert
        this.locations = data.locations
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    acknowledge(id) {
      this.acknowledgedIds.add(id)
    },

    async accept(id) {
      const { data } = await api.post(`/alerts/${id}/accept`)
      upsert(this.alerts, data.alert)
      this.acknowledgedIds.add(id)
      if (this.current?.id === data.alert.id) this.current = data.alert
      return data.alert
    },

    async resolve(id) {
      const { data } = await api.post(`/alerts/${id}/resolve`)
      upsert(this.alerts, data.alert)
      if (this.current?.id === data.alert.id) this.current = data.alert
      return data.alert
    },

    async cancel(id) {
      const { data } = await api.post(`/alerts/${id}/cancel`)
      upsert(this.alerts, data.alert)
      if (this.current?.id === data.alert.id) this.current = data.alert
      return data.alert
    },

    bindSocket() {
      const socket = getSocket()
      if (!socket || socket === this._boundSocket) return
      this._boundSocket = socket

      const onUpdate = (event) => (alert) => {
        this.lastEvent = { type: event, alert, at: Date.now() }
        upsert(this.alerts, alert)
        if (this.current?.id === alert.id) this.current = alert
      }

      socket.on('alert:new', onUpdate('alert:new'))
      socket.on('alert:location', (alert) => {
        onUpdate('alert:location')(alert)
        if (this.current?.id === alert.id) {
          this.locations.push({
            id: `live-${Date.now()}`,
            latitude: alert.latitude,
            longitude: alert.longitude,
            accuracy: alert.accuracy,
            recorded_at: alert.updated_at,
          })
        }
      })
      socket.on('alert:accepted', onUpdate('alert:accepted'))
      socket.on('alert:resolved', onUpdate('alert:resolved'))
      socket.on('alert:cancelled', onUpdate('alert:cancelled'))
    },

    unbindSocket() {
      const socket = getSocket()
      if (!socket) return
      socket.off('alert:new')
      socket.off('alert:location')
      socket.off('alert:accepted')
      socket.off('alert:resolved')
      socket.off('alert:cancelled')
      this._boundSocket = null
    },
  },
})
