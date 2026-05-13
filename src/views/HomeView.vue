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
  <div class="home">
    <header class="home__header">
      <h1 class="home__title">Pusher Coin — Admin</h1>
      <div class="home__user">
        <span>{{ auth.admin?.displayName || auth.admin?.email }}</span>
        <button class="home__logout" @click="onLogout">Sign out</button>
      </div>
    </header>

    <main class="home__main">
      <p class="home__placeholder">
        Signed in. Room list and schedule editor land in the next step.
      </p>
    </main>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.home__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.home__user {
  display: flex;
  align-items: center;
  column-gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.home__logout {
  padding: 6px 12px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.home__logout:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.home__main {
  flex-grow: 1;
  padding: 32px;
}

.home__placeholder {
  margin: 0;
  color: var(--text-muted);
}
</style>
