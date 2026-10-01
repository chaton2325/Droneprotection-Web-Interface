<script setup>
import { onMounted, onBeforeUnmount, computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAlertsStore } from '../stores/alerts'
import { avatarSrc } from '../services/api'

const auth = useAuthStore()
const alerts = useAlertsStore()
const router = useRouter()
const route = useRoute()

const profileMenuRoot = ref(null)

function onDocumentClick(event) {
  if (showProfileMenu.value && !profileMenuRoot.value?.contains(event.target)) {
    showProfileMenu.value = false
  }
}

onMounted(() => {
  alerts.bindSocket()
  alerts.fetchActive()
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

const pendingCount = computed(() => alerts.pending.length)

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

const showProfileMenu = ref(false)
const fileInput = ref(null)
const avatarBusy = ref(false)
const avatarError = ref('')

function pickAvatarFile() {
  avatarError.value = ''
  fileInput.value?.click()
}

async function onAvatarFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  avatarBusy.value = true
  avatarError.value = ''
  try {
    await auth.uploadAvatar(file)
  } catch (err) {
    avatarError.value = err.message
  } finally {
    avatarBusy.value = false
  }
}

async function clearAvatar() {
  avatarBusy.value = true
  avatarError.value = ''
  try {
    await auth.removeAvatar()
  } catch (err) {
    avatarError.value = err.message
  } finally {
    avatarBusy.value = false
  }
}

const ICONS = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  history: 'M12 8v4l3 3M3.05 11a9 9 0 11.5 4M3 4v5h5',
  live: 'M17.7 6.3a8 8 0 010 11.4M6.3 17.7a8 8 0 010-11.4M12 12h.01',
  admin: 'M9 12l2 2 4-4m5.6-4A12 12 0 0112 2.9 12 12 0 013.4 6 12 12 0 003 9c0 5.6 3.8 10.3 9 11.6 5.2-1.3 9-6 9-11.6 0-1-.1-2-.4-3z',
}

const navLinks = computed(() => {
  const role = auth.user?.role
  const out = [
    { to: '/', label: 'Tableau de bord', short: 'Accueil', name: 'dashboard', icon: ICONS.dashboard },
    { to: '/historique', label: 'Historique', short: 'Historique', name: 'history', icon: ICONS.history },
  ]
  if (['responder', 'both', 'admin'].includes(role)) {
    out.push({ to: '/localisation-en-direct', label: 'Localisation en direct', short: 'Direct', name: 'live-locations', icon: ICONS.live })
  }
  if (role === 'admin') {
    out.push({ to: '/admin', label: 'Administration', short: 'Admin', name: 'admin-dashboard', icon: ICONS.admin })
  }
  return out
})

const isActive = (link) => route.name === link.name || (link.name === 'dashboard' && route.name === 'alert-detail')
</script>

<template>
  <div>
    <!-- Barre latérale (ordinateur) -->
    <aside
      class="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <router-link to="/" class="flex items-center gap-3 px-5 py-5">
        <span class="h-11 w-11 shrink-0 overflow-hidden rounded-[22%] bg-black">
          <img src="/logo.png" alt="Dronaid" class="h-full w-full scale-[1.08] object-cover" />
        </span>
        <div class="leading-tight">
          <p class="font-display font-bold text-white tracking-wide">DRONAID</p>
          <p class="text-xs text-slate-400">Centre d'alertes</p>
        </div>
      </router-link>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Navigation principale">
        <router-link
          v-for="link in navLinks"
          :key="link.name"
          :to="link.to"
          class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
          :class="
            isActive(link)
              ? 'bg-brand-500/15 text-white'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          "
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
          </svg>
          <span class="flex-1">{{ link.label }}</span>
          <span
            v-if="link.name === 'dashboard' && pendingCount > 0"
            class="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white animate-pulse"
          >
            {{ pendingCount }}
          </span>
        </router-link>
      </nav>

      <div ref="profileMenuRoot" class="relative border-t border-[var(--color-border)] p-4">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
          @click="showProfileMenu = !showProfileMenu"
        >
          <span
            class="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold text-lg border border-accent-500/30"
          >
            <img v-if="auth.user?.avatar_url" :src="avatarSrc(auth.user.avatar_url)" alt="" class="h-full w-full object-cover" />
            <span v-else>{{ auth.user?.full_name?.[0]?.toUpperCase() || '?' }}</span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-white">{{ auth.user?.full_name }}</span>
            <span class="block text-xs text-slate-400 capitalize">{{ auth.user?.role }}</span>
          </span>
        </button>

        <div
          v-if="showProfileMenu"
          class="absolute bottom-full left-4 right-4 mb-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-xl"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Photo de profil</p>
          <div class="flex items-center gap-3">
            <div class="h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold text-xl border border-accent-500/30">
              <img v-if="auth.user?.avatar_url" :src="avatarSrc(auth.user.avatar_url)" alt="" class="h-full w-full object-cover" />
              <span v-else>{{ auth.user?.full_name?.[0]?.toUpperCase() || '?' }}</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <button
                type="button"
                :disabled="avatarBusy"
                class="rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
                @click="pickAvatarFile"
              >
                {{ avatarBusy ? 'Envoi...' : 'Changer la photo' }}
              </button>
              <button
                v-if="auth.user?.avatar_url"
                type="button"
                :disabled="avatarBusy"
                class="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-60"
                @click="clearAvatar"
              >
                Retirer
              </button>
            </div>
          </div>
          <p v-if="avatarError" class="mt-2 text-xs text-brand-400">{{ avatarError }}</p>
          <p class="mt-2 text-[11px] text-slate-500">JPEG, PNG ou WEBP, 5 Mo max.</p>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onAvatarFileChange" />
          <button
            type="button"
            class="mt-3 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            @click="logout"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </aside>

    <!-- Barre du haut (mobile) -->
    <header class="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 backdrop-blur">
      <router-link to="/" class="flex items-center gap-2.5">
        <span class="h-9 w-9 overflow-hidden rounded-[22%] bg-black">
          <img src="/logo.png" alt="Dronaid" class="h-full w-full scale-[1.08] object-cover" />
        </span>
        <span class="font-display font-bold text-white tracking-wide">DRONAID</span>
      </router-link>
      <div class="flex items-center gap-2">
        <span class="h-9 w-9 overflow-hidden rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold text-sm border border-accent-500/30">
          <img v-if="auth.user?.avatar_url" :src="avatarSrc(auth.user.avatar_url)" alt="" class="h-full w-full object-cover" />
          <span v-else>{{ auth.user?.full_name?.[0]?.toUpperCase() || '?' }}</span>
        </span>
        <button
          type="button"
          class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
          @click="logout"
        >
          Déconnexion
        </button>
      </div>
    </header>

    <!-- Navigation du bas (mobile) -->
    <nav
      class="lg:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur"
      aria-label="Navigation principale"
    >
      <router-link
        v-for="link in navLinks"
        :key="link.name"
        :to="link.to"
        class="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold"
        :class="isActive(link) ? 'text-brand-400' : 'text-slate-400'"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="link.icon" />
        </svg>
        {{ link.short }}
        <span
          v-if="link.name === 'dashboard' && pendingCount > 0"
          class="absolute right-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white"
        >
          {{ pendingCount }}
        </span>
      </router-link>
    </nav>
  </div>
</template>
