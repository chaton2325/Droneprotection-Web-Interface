<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  alerts: { type: Array, default: () => [] },
  selectedId: { type: [Number, String], default: null },
  height: { type: String, default: '100%' },
  // Position [lat, lng] du repondant : quand fournie, un itineraire routier
  // (OSRM, gratuit et sans cle API) est trace jusqu'a l'alerte selectionnee.
  routeFrom: { type: Array, default: null },
})
const emit = defineEmits(['select', 'route-summary', 'route-error'])

const container = ref(null)
let map = null
let markers = new Map()
let meMarker = null
let routingControl = null
let routingPluginPromise = null
let fallbackLine = null

const colorFor = (status) =>
  ({ pending: '#ef4444', accepted: '#f59e0b', resolved: '#22c55e', cancelled: '#64748b' })[status] ||
  '#64748b'

function markerIcon(status, active) {
  const color = colorFor(status)
  const size = active ? 26 : 18
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:999px;
      background:${color};border:2px solid rgba(255,255,255,0.9);
      box-shadow:0 0 0 4px ${color}33, 0 2px 6px rgba(0,0,0,0.4);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const meIcon = L.divIcon({
  className: '',
  html: `<span style="
    display:block;width:18px;height:18px;border-radius:999px;
    background:#0ea5e9;border:3px solid white;
    box-shadow:0 0 0 5px #0ea5e955, 0 2px 6px rgba(0,0,0,0.5);
  "></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function coords(alert) {
  if (alert.latitude == null || alert.longitude == null) return null
  return [alert.latitude, alert.longitude]
}

function syncMarkers() {
  if (!map) return
  const seen = new Set()

  for (const alert of props.alerts) {
    const pos = coords(alert)
    if (!pos) continue
    seen.add(alert.id)

    const active = String(alert.id) === String(props.selectedId)
    if (markers.has(alert.id)) {
      const marker = markers.get(alert.id)
      marker.setLatLng(pos)
      marker.setIcon(markerIcon(alert.status, active))
    } else {
      const marker = L.marker(pos, { icon: markerIcon(alert.status, active) })
        .addTo(map)
        .bindPopup(`<strong>${alert.victim_name}</strong><br/>${alert.message || 'Alerte d\'urgence'}`)
      marker.on('click', () => emit('select', alert.id))
      markers.set(alert.id, marker)
    }
  }

  for (const [id, marker] of markers.entries()) {
    if (!seen.has(id)) {
      map.removeLayer(marker)
      markers.delete(id)
    }
  }
}

function fitToMarkers() {
  if (!map || markers.size === 0) return
  const group = L.featureGroup([...markers.values()])
  map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 15 })
}

// Charge le plugin d'itineraire (et son CSS) uniquement quand on en a besoin :
// leaflet-routing-machine s'attend a trouver `window.L`, d'ou l'affectation
// juste avant l'import dynamique.
function loadRoutingPlugin() {
  if (!routingPluginPromise) {
    window.L = L
    routingPluginPromise = Promise.all([
      import('leaflet-routing-machine'),
      import('leaflet-routing-machine/dist/leaflet-routing-machine.css'),
    ])
  }
  return routingPluginPromise
}

function clearRoute() {
  if (routingControl && map) {
    map.removeControl(routingControl)
    routingControl = null
  }
  if (meMarker && map) {
    map.removeLayer(meMarker)
    meMarker = null
  }
  if (fallbackLine && map) {
    map.removeLayer(fallbackLine)
    fallbackLine = null
  }
}

// Repli quand le service de routage OSRM (gratuit, public) ne repond pas ou
// ne trouve pas de trajet routier : on trace au moins une ligne directe avec
// la distance a vol d'oiseau, pour que l'information reste utile.
function drawFallbackLine(from, to) {
  if (!map) return
  if (fallbackLine) map.removeLayer(fallbackLine)
  fallbackLine = L.polyline([from, to], {
    color: '#94a3b8',
    weight: 3,
    dashArray: '6 8',
    opacity: 0.8,
  }).addTo(map)
  map.fitBounds(fallbackLine.getBounds().pad(0.3), { maxZoom: 15 })
  emit('route-summary', { distance: map.distance(from, to), time: null, straightLine: true })
}

async function syncRoute() {
  if (!map) return

  const target = props.alerts.find((a) => String(a.id) === String(props.selectedId)) || props.alerts[0]
  const to = target ? coords(target) : null

  if (!props.routeFrom || !to) {
    clearRoute()
    return
  }

  try {
    await loadRoutingPlugin()
  } catch (err) {
    emit('route-error', "Impossible de charger le module d'itineraire.")
    return
  }
  // Le prop a pu changer pendant le chargement (asynchrone) du plugin.
  if (!map || !props.routeFrom) return

  if (!meMarker) {
    meMarker = L.marker(props.routeFrom, { icon: meIcon }).addTo(map).bindPopup('Votre position')
  } else {
    meMarker.setLatLng(props.routeFrom)
  }

  if (routingControl) {
    routingControl.setWaypoints([L.latLng(...props.routeFrom), L.latLng(...to)])
    return
  }

  routingControl = L.Routing.control({
    waypoints: [L.latLng(...props.routeFrom), L.latLng(...to)],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    show: true,
    collapsible: true,
    createMarker: () => null, // les marqueurs sont deja geres par syncMarkers()/meMarker
    lineOptions: {
      styles: [{ color: '#0ea5e9', weight: 5, opacity: 0.85 }],
    },
    // Instance publique OSRM (project-osrm.org) : gratuite, sans cle API,
    // utilisee par defaut par leaflet-routing-machine (usage raisonnable/demo).
  }).addTo(map)

  routingControl.on('routesfound', (e) => {
    const route = e.routes[0]
    if (route) {
      emit('route-summary', { distance: route.summary.totalDistance, time: route.summary.totalTime })
    }
  })
  routingControl.on('routingerror', (e) => {
    // Visible dans la console navigateur pour diagnostiquer un souci du
    // service public OSRM (indisponibilite, aucun trajet routier trouve...).
    console.error('[OSRM routing error]', e.error)

    if (map && routingControl) {
      map.removeControl(routingControl)
      routingControl = null
    }
    emit(
      'route-error',
      "Itineraire routier indisponible (service gratuit OSRM) - distance a vol d'oiseau affichee a la place."
    )
    drawFallbackLine(props.routeFrom, to)
  })
}

onMounted(() => {
  map = L.map(container.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView([48.8566, 2.3522], 12)

  map.attributionControl.setPrefix(false)

  // Tuiles OpenStreetMap standard : gratuites, sans cle API, aucune inscription.
  // Le rendu sombre est obtenu via un filtre CSS (voir .leaflet-tile-pane dans
  // style.css) plutot que via un fond de carte "dark" tiers (ceux-ci exigent
  // desormais quasi tous une cle, ex. CARTO depuis 2024).
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  syncMarkers()
  fitToMarkers()
  syncRoute()
})

onBeforeUnmount(() => {
  clearRoute()
  map?.remove()
  map = null
  markers.clear()
})

watch(
  () => props.alerts,
  () => {
    syncMarkers()
    syncRoute()
  },
  { deep: true }
)

watch(
  () => props.selectedId,
  () => {
    syncMarkers()
    const marker = markers.get(props.selectedId) || markers.get(Number(props.selectedId))
    if (marker) {
      map.panTo(marker.getLatLng())
      marker.openPopup()
    }
    syncRoute()
  }
)

watch(
  () => props.routeFrom,
  () => syncRoute()
)
</script>

<template>
  <div ref="container" class="w-full rounded-2xl overflow-hidden" :style="{ height }" />
</template>
