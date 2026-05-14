<script setup>
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/auth.js'

const router = useRouter()
const auth = useAdminAuthStore()

const onLogout = async () => {
  await auth.logout()
  router.push({ name: 'sign-in' })
}
</script>

<template>
  <div class="layout">
    <header class="layout__header">
      <div class="layout__brand">
        <RouterLink to="/rooms">Pusher Coin — Admin</RouterLink>
      </div>
      <nav class="layout__nav">
        <RouterLink :to="{ name: 'rooms-list' }">Rooms</RouterLink>
        <RouterLink :to="{ name: 'withdrawals' }">Withdrawals</RouterLink>
        <RouterLink :to="{ name: 'settings' }">Settings</RouterLink>
      </nav>
      <div class="layout__user">
        <span>{{ auth.admin?.displayName || auth.admin?.email }}</span>
        <button class="layout__logout" @click="onLogout">Sign out</button>
      </div>
    </header>
    <main class="layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout__header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.layout__brand a {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
}

.layout__nav {
  display: flex;
  column-gap: 16px;
  flex-grow: 1;
}

.layout__nav :deep(a) {
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.layout__nav :deep(a.router-link-active) {
  background: var(--surface-elevated);
  color: var(--text);
}

.layout__user {
  display: flex;
  align-items: center;
  column-gap: 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.layout__logout {
  padding: 6px 12px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.layout__logout:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.layout__main {
  flex-grow: 1;
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}
</style>
