# Drone Protection - Interface Web (centre d'alertes)

Interface web (Vue 3 + Vite + Tailwind CSS v4) destinee aux **repondants** inscrits pour
recevoir en temps reel les alertes anti-bandit declenchees depuis l'application mobile
[Droneprotection-Flutter-frontend](../Droneprotection-Flutter-frontend), les localiser sur une
carte et les prendre en charge.

## Fonctionnement

- Inscription / connexion (role `responder`, `victim` ou `both`).
- Des la connexion, le socket temps reel rejoint automatiquement la room des repondants.
- Chaque nouvelle alerte (`alert:new`) apparait instantanement dans le tableau de bord et sur la carte.
- La position de la victime se met a jour en direct (`alert:location`).
- Un clic sur **"J'accepte l'intervention"** tente une prise en charge atomique cote backend :
  si un autre repondant a ete plus rapide, un message d'erreur s'affiche et le bouton disparait
  chez tout le monde grace a l'evenement `alert:accepted`.
- Historique complet des alertes (resolues / annulees) disponible dans l'onglet **Historique**.
- Sur la fiche d'une alerte, le bouton **"Voir l'itineraire"** geolocalise le repondant et trace
  le trajet routier jusqu'a la victime (distance, duree, instructions), via
  [OSRM](https://project-osrm.org) - service public, **gratuit et sans cle API**.

## Installation

```bash
npm install
cp .env.example .env   # ajuster VITE_API_URL / VITE_SOCKET_URL si besoin
npm run dev
```

Le backend ([Droneprotection-Backend](../Droneprotection-Backend)) doit tourner sur
`http://localhost:4000` (ou l'URL configuree dans `.env`).

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** + **Tailwind CSS v4**
- **Pinia** pour l'etat global (auth, alertes)
- **vue-router** avec garde d'authentification
- **socket.io-client** pour le temps reel
- **Leaflet** (fond de carte sombre CARTO, gratuit et sans cle) pour la geolocalisation des alertes
- **Leaflet Routing Machine** + **OSRM** (gratuit, sans cle API) pour l'itineraire jusqu'a la victime

## Structure

```
src/
  components/   AppHeader, AlertCard, MapView, StatusBadge, TriggerAlertPanel, AuthLayout
  views/        LoginView, RegisterView, DashboardView, AlertDetailView, HistoryView
  stores/       auth.js, alerts.js (Pinia)
  services/     api.js (axios), socket.js (socket.io-client)
  router/       index.js
```
