<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/AuthLayout.vue'

const auth = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const role = ref('responder')
const loading = ref(false)
const error = ref('')

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
  error.value = ''
  loading.value = true
  try {
    await auth.register({
      fullName: fullName.value,
      email: email.value,
      phone: phone.value || undefined,
      password: password.value,
      role: role.value,
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
        :disabled="loading"
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
