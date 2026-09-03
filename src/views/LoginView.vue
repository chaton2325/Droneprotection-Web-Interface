<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/AuthLayout.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push(route.query.redirect || { name: 'dashboard' })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <template #title>Connexion repondant</template>
    <template #subtitle>
      Connectez-vous pour recevoir les alertes d'urgence en temps reel et intervenir.
    </template>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="vous@exemple.com"
          class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
        />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-300">Mot de passe</label>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="********"
          class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
        />
      </div>

      <p v-if="error" class="rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2 text-sm text-brand-400">
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:brightness-110 disabled:opacity-60"
      >
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-400">
      Pas encore inscrit pour recevoir les alertes ?
      <router-link to="/inscription" class="font-semibold text-accent-400 hover:text-accent-300">
        Creer un compte
      </router-link>
    </p>
  </AuthLayout>
</template>
