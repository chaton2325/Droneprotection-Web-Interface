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

const links = [
  { to: '/', label: 'Tableau de bord', name: 'dashboard' },
  { to: '/historique', label: 'Historique', name: 'history' },
]

const adminLinks = [
  { to: '/admin', label: 'Administration', name: 'admin-dashboard' },
]
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur"
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6 flex h-16 items-center justify-between gap-4">
      <router-link to="/" class="flex items-center gap-2 shrink-0">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-600/30"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 2 20 6v6c0 5.5-3.4 9.9-8 11-4.6-1.1-8-5.5-8-11V6Z"
            />
            <path stroke-linecap="round" d="M12 8v5" />
            <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <div class="leading-tight">
          <p class="font-display font-bold text-white text-sm tracking-wide">DRONE PROTECTION</p>
          <p class="text-[11px] text-slate-400 -mt-0.5">Centre d'alertes</p>
        </div>
      </router-link>

      <nav class="hidden sm:flex items-center gap-1">
        <router-link
          v-for="link in links"
          :key="link.name"
          :to="link.to"
          class="relative px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="
            route.name === link.name
              ? 'text-white bg-white/5'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          "
        >
          {{ link.label }}
          <span
            v-if="link.name === 'dashboard' && pendingCount > 0"
            class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white"
          >
            {{ pendingCount }}
          </span>
        </router-link>
        <router-link
          v-if="auth.user?.role === 'admin'"
          v-for="link in adminLinks"
          :key="link.name"
          :to="link.to"
          class="relative px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="
            route.name === link.name
              ? 'text-white bg-white/5'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          "
        >
          {{ link.label }}
        </router-link>
      </nav>

      <div class="flex items-center gap-3">
        <div class="hidden sm:block text-right leading-tight">
          <p class="text-sm font-semibold text-white">{{ auth.user?.full_name }}</p>
          <p class="text-[11px] text-slate-400 capitalize">{{ auth.user?.role }}</p>
        </div>

        <div ref="profileMenuRoot" class="relative">
          <button
            type="button"
            title="Photo de profil"
            class="h-9 w-9 rounded-full overflow-hidden bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold text-sm border border-accent-500/30 hover:border-accent-400 transition-colors"
            @click="showProfileMenu = !showProfileMenu"
          >
            <img
              v-if="auth.user?.avatar_url"
              :src="avatarSrc(auth.user.avatar_url)"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else>{{ auth.user?.full_name?.[0]?.toUpperCase() || '?' }}</span>
          </button>

          <div
            v-if="showProfileMenu"
            class="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl z-50"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Photo de profil</p>
            <div class="flex items-center gap-3">
              <div
                class="h-14 w-14 shrink-0 rounded-full overflow-hidden bg-accent-500/20 text-accent-400 flex items-center justify-center font-bold text-lg border border-accent-500/30"
              >
                <img
                  v-if="auth.user?.avatar_url"
                  :src="avatarSrc(auth.user.avatar_url)"
                  alt=""
                  class="h-full w-full object-cover"
                />
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
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="onAvatarFileChange"
            />
          </div>
        </div>

        <button
          type="button"
          class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
          @click="logout"
        >
          Deconnexion
        </button>
      </div>
    </div>
  </header>
</template>
