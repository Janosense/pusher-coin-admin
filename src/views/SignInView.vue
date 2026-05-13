<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAdminAuthStore()

const step = ref('credentials') // 'credentials' | 'code'
const login = ref('')
const password = ref('')
const code = ref('')
const localError = ref(null)
const info = ref(null)

const onSubmitCredentials = async () => {
  localError.value = null
  info.value = null
  const result = await auth.requestCode(login.value, password.value)
  if (result.success) {
    info.value = result.message || 'A 6-digit code has been sent to your email.'
    step.value = 'code'
  } else {
    localError.value = result.error || 'Sign-in failed.'
  }
}

const onSubmitCode = async () => {
  localError.value = null
  const result = await auth.verifyCode(login.value, password.value, code.value)
  if (result.success) {
    router.push(route.query.redirect || { name: 'rooms-list' })
  } else {
    localError.value = result.error || 'Verification failed.'
  }
}

const backToCredentials = () => {
  step.value = 'credentials'
  code.value = ''
  localError.value = null
  info.value = null
}
</script>

<template>
  <div class="signin">
    <form class="signin__card" @submit.prevent="step === 'credentials' ? onSubmitCredentials() : onSubmitCode()">
      <h1 class="signin__title">Pusher Coin — Admin</h1>

      <template v-if="step === 'credentials'">
        <label class="signin__field">
          <span>Email or username</span>
          <input v-model="login" type="text" autocomplete="username" required />
        </label>
        <label class="signin__field">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <button class="signin__submit" type="submit" :disabled="auth.isLoading">
          {{ auth.isLoading ? 'Sending code…' : 'Continue' }}
        </button>
      </template>

      <template v-else>
        <p class="signin__info">{{ info }}</p>
        <label class="signin__field">
          <span>6-digit code</span>
          <input
            v-model="code"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
            autocomplete="one-time-code"
            required
          />
        </label>
        <button class="signin__submit" type="submit" :disabled="auth.isLoading">
          {{ auth.isLoading ? 'Verifying…' : 'Sign in' }}
        </button>
        <button class="signin__back" type="button" @click="backToCredentials">Back</button>
      </template>

      <p v-if="localError" class="signin__error">{{ localError }}</p>
    </form>
  </div>
</template>

<style scoped>
.signin {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.signin__card {
  display: flex;
  flex-direction: column;
  row-gap: 16px;
  width: 100%;
  max-width: 360px;
  padding: 32px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.signin__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.signin__field {
  display: flex;
  flex-direction: column;
  row-gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.signin__field input {
  padding: 10px 12px;
  background: var(--surface-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
}

.signin__field input:focus {
  border-color: var(--primary);
}

.signin__submit {
  padding: 12px;
  background: var(--primary);
  color: var(--bg);
  border: 0;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.signin__submit:hover:not(:disabled) {
  background: var(--primary-hover);
}

.signin__back {
  padding: 8px;
  background: transparent;
  color: var(--text-muted);
  border: 0;
}

.signin__info {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.signin__error {
  margin: 0;
  padding: 10px 12px;
  background: rgba(248, 113, 113, 0.1);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  font-size: 13px;
}
</style>
