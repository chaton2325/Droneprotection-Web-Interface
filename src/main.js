import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Restaure la session (token en localStorage) avant le premier rendu des routes protegees.
const auth = useAuthStore()
auth.restoreSession()

app.mount('#app')
