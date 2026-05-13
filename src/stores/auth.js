import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import adminAuthService from '@/services/adminAuthService.js'
import { TOKEN_KEY, USER_KEY } from '@/services/api.js'

export const useAdminAuthStore = defineStore('admin-auth', () => {
  const admin = ref(null)
  const accessToken = ref(null)
  const refreshTokenValue = ref(null)
  const accessTokenExpiresAt = ref(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!(accessToken.value && admin.value))

  const clearError = () => {
    error.value = null
  }

  const persist = () => {
    try {
      if (accessToken.value) {
        localStorage.setItem(TOKEN_KEY, accessToken.value)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
      const payload = {
        admin: admin.value,
        refreshToken: refreshTokenValue.value,
        accessTokenExpiresAt: accessTokenExpiresAt.value
      }
      if (admin.value || refreshTokenValue.value) {
        localStorage.setItem(USER_KEY, JSON.stringify(payload))
      } else {
        localStorage.removeItem(USER_KEY)
      }
    } catch (err) {
      console.warn('[admin auth store] persist failed:', err.message)
    }
  }

  const hydrate = () => {
    try {
      accessToken.value = localStorage.getItem(TOKEN_KEY)
      const raw = localStorage.getItem(USER_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      admin.value = parsed.admin || null
      refreshTokenValue.value = parsed.refreshToken || null
      accessTokenExpiresAt.value = parsed.accessTokenExpiresAt || null
    } catch (err) {
      console.warn('[admin auth store] hydrate failed:', err.message)
      clearLocal()
    }
  }

  const clearLocal = () => {
    admin.value = null
    accessToken.value = null
    refreshTokenValue.value = null
    accessTokenExpiresAt.value = null
    error.value = null
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (err) {
      console.warn('[admin auth store] clear localStorage failed:', err.message)
    }
  }

  /**
   * Two-step sign-in. Step 1 sends a 6-digit code to the admin's email;
   * step 2 redeems the code, verifies admin privileges via /admin/me,
   * and writes the session.
   */
  const requestCode = async (login, password) => {
    clearError()
    isLoading.value = true
    try {
      const result = await adminAuthService.requestVerification(login, password)
      return { success: result.success, message: result.message }
    } catch (err) {
      const code = err.response?.data?.code
      const message = err.response?.data?.message || err.message
      error.value = message
      return { success: false, error: message, code }
    } finally {
      isLoading.value = false
    }
  }

  const verifyCode = async (login, password, code) => {
    clearError()
    isLoading.value = true
    try {
      const envelope = await adminAuthService.verifyCode(login, password, code)
      // Provisionally stash the token so the /admin/me request can attach it.
      accessToken.value = envelope.access_token
      refreshTokenValue.value = envelope.refresh_token
      accessTokenExpiresAt.value = Date.now() + envelope.access_token_expires_in * 1000
      persist()

      try {
        const me = await adminAuthService.getMe()
        admin.value = me
        persist()
        return { success: true, admin: me }
      } catch (probeErr) {
        // Probe failed — likely 403 because the user isn't an admin.
        // Revoke the just-issued refresh token on the server and clear
        // local state so we don't leave a half-authed session behind.
        await adminAuthService.logout(refreshTokenValue.value)
        clearLocal()
        const status = probeErr.response?.status
        const message =
          status === 403
            ? 'This account does not have administrator privileges.'
            : probeErr.response?.data?.message || probeErr.message
        error.value = message
        return { success: false, error: message }
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message
      error.value = message
      return { success: false, error: message, code: err.response?.data?.code }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    const refresh = refreshTokenValue.value
    if (refresh) {
      await adminAuthService.logout(refresh)
    }
    clearLocal()
  }

  const initialize = async () => {
    if (isInitialized.value) return
    hydrate()
    // If we have a stored token, re-verify the session is still admin.
    if (accessToken.value) {
      try {
        admin.value = await adminAuthService.getMe()
        persist()
      } catch {
        clearLocal()
      }
    }
    isInitialized.value = true
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('admin-auth:token-expired', () => {
      clearLocal()
    })
    window.addEventListener('admin-auth:token-refreshed', (evt) => {
      const env = evt.detail
      if (!env?.access_token) return
      accessToken.value = env.access_token
      refreshTokenValue.value = env.refresh_token
      accessTokenExpiresAt.value = Date.now() + env.access_token_expires_in * 1000
      persist()
    })
  }

  return {
    admin: computed(() => admin.value),
    isAuthenticated,
    isInitialized: computed(() => isInitialized.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    requestCode,
    verifyCode,
    logout,
    initialize,
    clearError
  }
})
