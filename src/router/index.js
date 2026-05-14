import { createRouter, createWebHistory } from 'vue-router'
import SignInView from '@/views/SignInView.vue'
import RoomListView from '@/views/RoomListView.vue'
import RoomFormView from '@/views/RoomFormView.vue'
import RoomScheduleView from '@/views/RoomScheduleView.vue'
import WithdrawalsView from '@/views/WithdrawalsView.vue'
import { useAdminAuthStore } from '@/stores/auth.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/sign-in', name: 'sign-in', component: SignInView, meta: { requiresGuest: true } },
    { path: '/', redirect: { name: 'rooms-list' } },
    {
      path: '/rooms',
      name: 'rooms-list',
      component: RoomListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/rooms/new',
      name: 'rooms-new',
      component: RoomFormView,
      meta: { requiresAuth: true }
    },
    {
      path: '/rooms/:id/edit',
      name: 'rooms-edit',
      component: RoomFormView,
      meta: { requiresAuth: true }
    },
    {
      path: '/rooms/:id/schedule',
      name: 'rooms-schedule',
      component: RoomScheduleView,
      meta: { requiresAuth: true }
    },
    {
      path: '/withdrawals',
      name: 'withdrawals',
      component: WithdrawalsView,
      meta: { requiresAuth: true }
    }
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
    return next({ name: 'rooms-list' })
  }
  next()
})

export default router
