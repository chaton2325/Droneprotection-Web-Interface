<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppHeader from './components/AppHeader.vue'
import AlertSiren from './components/AlertSiren.vue'

const route = useRoute()
const auth = useAuthStore()

const showChrome = computed(() => !route.meta.public && auth.isAuthenticated)
</script>

<template>
  <div class="min-h-full flex flex-col">
    <AlertSiren v-if="showChrome" />
    <AppHeader v-if="showChrome" />
    <main class="flex-1 flex flex-col">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
