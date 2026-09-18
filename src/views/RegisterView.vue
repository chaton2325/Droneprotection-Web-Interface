<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/AuthLayout.vue'
import api from '../services/api'

const auth = useAuthStore()
const router = useRouter()

const fullName = ref('')
const username = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const emergencyContactName = ref('')
const emergencyContactPhone = ref('')
const role = ref('responder')
const loading = ref(false)
const error = ref('')

// Verification de disponibilite en direct, pendant la saisie - avant que le
// reste du formulaire soit rempli (comme cote app mobile) plutot que de
// decouvrir "nom deja pris" seulement a la soumission.
const usernamePattern = /^[a-z0-9_]{3,20}$/
const checkingUsername = ref(false)
const usernameAvailable = ref(null) // null = pas encore verifie, true/false = resultat
let usernameDebounceTimer = null
let usernameCheckToken = 0

watch(username, (value) => {
  usernameAvailable.value = null
  if (usernameDebounceTimer) clearTimeout(usernameDebounceTimer)

  const candidate = value.trim().toLowerCase()
  if (!usernamePattern.test(candidate)) return

  usernameDebounceTimer = setTimeout(() => checkUsername(candidate), 400)
})

async function checkUsername(candidate) {
  const token = ++usernameCheckToken
  checkingUsername.value = true
  try {
    const { data } = await api.get('/auth/check-username', { params: { username: candidate } })
    if (token !== usernameCheckToken) return
    usernameAvailable.value = data.available
  } catch {
    if (token !== usernameCheckToken) return
    usernameAvailable.value = null
  } finally {
    if (token === usernameCheckToken) checkingUsername.value = false
  }
}

const roles = [
  {
    value: 'responder',
    title: 'Repondant',
    desc: "Je veux recevoir les alertes et pouvoir intervenir.",
  },
  {
    value: 'victim',
    title: 'Utilisateur mobile',
    desc: "Je veux pouvoir declencher une alerte d'urgence.",
  },
  {
    value: 'both',
    title: 'Les deux',
    desc: 'Declencher des alertes et en recevoir.',
  },
]

async function onSubmit() {
  if (usernameAvailable.value === false) return
  error.value = ''
  loading.value = true
  try {
    await auth.register({
      fullName: fullName.value,
      username: username.value.trim().toLowerCase(),
      email: email.value,
      phone: phone.value || undefined,
      password: password.value,
      role: role.value,
      emergencyContactName: emergencyContactName.value,
      emergencyContactPhone: emergencyContactPhone.value,
    })
    router.push({ name: 'dashboard' })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <template #title>Inscription</template>
    <template #subtitle>
      Rejoignez le reseau de vigilance et choisissez comment vous souhaitez participer.
    </template>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-300">Nom complet</label>
        <input
          v-model="fullName"
          type="text"
          required
          placeholder="Jean Dupont"
          class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-300">Nom d'utilisateur</label>
        <div class="relative">
          <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">@</span>
          <input
            v-model="username"
            type="text"
            required
            autocapitalize="off"
            autocorrect="off"
            placeholder="jeandupont"
            class="w-full rounded-xl border bg-[var(--color-surface-2)] py-2.5 pl-8 pr-10 text-white placeholder:text-slate-500 outline-none focus:ring-2 transition"
            :class="
              usernameAvailable === false
                ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30'
                : 'border-[var(--color-border)] focus:border-brand-500 focus:ring-brand-500/30'
            "
          />
          <span class="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              v-if="checkingUsername"
              class="h-4 w-4 animate-spin text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <svg
              v-else-if="usernameAvailable === true"
              class="h-4 w-4 text-ok-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg
              v-else-if="usernameAvailable === false"
              class="h-4 w-4 text-brand-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </div>
        <p v-if="usernameAvailable === false" class="mt-1.5 text-xs text-brand-400">
          Ce nom d'utilisateur est deja pris.
        </p>
        <p v-else-if="usernameAvailable === true" class="mt-1.5 text-xs text-ok-400">
          Nom d'utilisateur disponible.
        </p>
        <p v-else class="mt-1.5 text-xs text-slate-500">3 a 20 caracteres : lettres, chiffres, underscore.</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="vous@exemple.com"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-300">Telephone</label>
          <input
            v-model="phone"
            type="tel"
            placeholder="+33 6 12 34 56 78"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
          />
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-300">Mot de passe</label>
        <input
          v-model="password"
          type="password"
          required
          minlength="6"
          placeholder="6 caracteres minimum"
          class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-300">Contact d'urgence</label>
        <p class="mb-2 text-xs text-slate-500">
          Une personne a prevenir en cas d'urgence. Visible par le repondant qui prend en charge votre alerte.
        </p>
        <div class="grid grid-cols-2 gap-3">
          <input
            v-model="emergencyContactName"
            type="text"
            required
            placeholder="Nom du contact"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
          />
          <input
            v-model="emergencyContactPhone"
            type="tel"
            required
            placeholder="Telephone du contact"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
          />
        </div>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-slate-300">Role</label>
        <div class="grid gap-2">
          <label
            v-for="r in roles"
            :key="r.value"
            class="flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition"
            :class="
              role === r.value
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-slate-500'
            "
          >
            <input v-model="role" type="radio" :value="r.value" class="sr-only" />
            <span
              class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
              :class="role === r.value ? 'border-brand-500' : 'border-slate-500'"
            >
              <span v-if="role === r.value" class="h-2 w-2 rounded-full bg-brand-500" />
            </span>
            <span>
              <span class="block text-sm font-semibold text-white">{{ r.title }}</span>
              <span class="block text-xs text-slate-400">{{ r.desc }}</span>
            </span>
          </label>
        </div>
      </div>

      <p v-if="error" class="rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2 text-sm text-brand-400">
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="loading || usernameAvailable === false"
        class="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:brightness-110 disabled:opacity-60"
      >
        {{ loading ? 'Creation du compte...' : 'Creer mon compte' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-400">
      Deja inscrit ?
      <router-link to="/connexion" class="font-semibold text-accent-400 hover:text-accent-300">
        Se connecter
      </router-link>
    </p>
  </AuthLayout>
</template>
