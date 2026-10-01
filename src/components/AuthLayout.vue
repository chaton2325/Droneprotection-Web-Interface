<script setup>
defineSlots()
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <!-- Panneau de marque -->
    <div class="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[var(--color-surface)] p-12">
      <div
        class="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl"
      />
      <div
        class="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl"
      />

      <div class="relative z-10 flex items-center gap-3">
        <span class="h-14 w-14 shrink-0 overflow-hidden rounded-[22%] bg-black shadow-lg shadow-black/40">
          <img src="/logo.png" alt="Dronaid" class="h-full w-full scale-[1.08] object-cover" />
        </span>
        <span class="font-display font-bold text-white tracking-wide">DRONAID</span>
      </div>

      <div class="relative z-10 max-w-md">
        <h1 class="font-display text-4xl font-bold text-white leading-tight">
          Un bouton d'urgence.<br />
          Un reseau qui repond.
        </h1>
        <p class="mt-4 text-slate-400 leading-relaxed">
          Des qu'une victime declenche l'alerte anti-bandit depuis l'application mobile, sa
          position est diffusee en direct a tous les repondants inscrits. Le premier a accepter
          prend en charge l'intervention&nbsp;- les autres sont automatiquement informes.
        </p>

        <div class="mt-8 grid grid-cols-3 gap-4">
          <div class="rounded-xl border border-[var(--color-border)] bg-white/[0.03] p-4">
            <p class="text-2xl font-bold text-white font-display">1</p>
            <p class="text-xs text-slate-400 mt-1">Appui d'urgence</p>
          </div>
          <div class="rounded-xl border border-[var(--color-border)] bg-white/[0.03] p-4">
            <p class="text-2xl font-bold text-white font-display">Live</p>
            <p class="text-xs text-slate-400 mt-1">Position en direct</p>
          </div>
          <div class="rounded-xl border border-[var(--color-border)] bg-white/[0.03] p-4">
            <p class="text-2xl font-bold text-white font-display">1x</p>
            <p class="text-xs text-slate-400 mt-1">Un seul repondant</p>
          </div>
        </div>
      </div>

      <p class="relative z-10 text-xs text-slate-500">
        &copy; {{ new Date().getFullYear() }} Dronaid - reseau de vigilance citoyenne
      </p>
    </div>

    <!-- Formulaire -->
    <div class="flex items-center justify-center p-6 sm:p-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex items-center gap-2 lg:hidden">
          <span class="h-11 w-11 shrink-0 overflow-hidden rounded-[22%] bg-black">
            <img src="/logo.png" alt="Dronaid" class="h-full w-full scale-[1.08] object-cover" />
          </span>
          <span class="font-display font-bold text-white">DRONAID</span>
        </div>

        <h2 class="font-display text-2xl font-bold text-white">
          <slot name="title" />
        </h2>
        <p class="mt-2 text-sm text-slate-400">
          <slot name="subtitle" />
        </p>

        <div class="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl shadow-black/20">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
