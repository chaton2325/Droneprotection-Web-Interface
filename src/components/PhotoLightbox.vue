<script setup>
defineProps({
  src: { type: String, default: null },
})
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div
      v-if="src"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      @click="emit('close')"
    >
      <button
        type="button"
        class="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Fermer"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        :src="src"
        alt=""
        class="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        @click.stop
      />
    </div>
  </Teleport>
</template>
