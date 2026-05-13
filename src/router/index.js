import { createRouter, createWebHistory } from 'vue-router'
import SignInView from '@/views/SignInView.vue'
import HomeView from '@/views/HomeView.vue'
import { useAdminAuthStore } from '@/stores/auth.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/sign-in', name: 'sign-in', component: SignInView, meta: { requiresGuest: true } },
    { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } }
  ]
})

router.beforeEach(async (to, from, next) => {
  const auth = useAdminAuthStore()
  if (!auth.isInitialized) {
    await auth.initialize()
  }

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresGuest = to.matched.some((r) => r.meta.requiresGuest)

  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'sign-in', query: { redirect: to.fullPath } })
  }
  if (requiresGuest && auth.isAuthenticated) {
    return next({ name: 'home' })
  }
  next()
})

export default router
