import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/connexion',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/inscription',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { admin: true },
  },
  {
    path: '/alertes/:id',
    name: 'alert-detail',
    component: () => import('../views/AlertDetailView.vue'),
    props: true,
  },
  {
    path: '/historique',
    name: 'history',
    component: () => import('../views/HistoryView.vue'),
  },
  {
    path: '/localisation-en-direct',
    name: 'live-locations',
    component: () => import('../views/LiveLocationsView.vue'),
    meta: { responder: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.public && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  if (to.meta.admin && auth.user?.role !== 'admin') {
    return { name: 'dashboard' }
  }
  if (to.meta.responder && !['responder', 'both', 'admin'].includes(auth.user?.role)) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
