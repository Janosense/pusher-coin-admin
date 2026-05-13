import axios from 'axios'
import api from './api.js'

/**
 * Admin auth wraps the same 2-step email/password 2FA flow the player
 * SPA uses (`/user/request-verification` → `/user/verify-code`) plus a
 * `/admin/me` probe immediately after to bounce non-admins.
 *
 * Steps 1 and 3 use bare axios because the bearer interceptor isn't
 * relevant for them (the JWT doesn't exist yet at step 1; step 3 uses
 * the JWT we just received but routes through `api` so the interceptor
 * can attach it).
 */

const baseURL = () => import.meta.env.VITE_API_BASE_URL

export const adminAuthService = {
  async requestVerification(login, password) {
    const response = await axios.post(
      `${baseURL()}/user/request-verification/`,
      { login, password },
      { timeout: 10000 }
    )
    return { success: !!response.data?.success, message: response.data?.message }
  },

  async verifyCode(login, password, code) {
    const response = await axios.post(
      `${baseURL()}/user/verify-code/`,
      { login, password, code },
      { timeout: 10000 }
    )
    return response.data
  },

  async getMe() {
    const response = await api.get('/admin/me')
    return {
      id: response.data.id,
      email: response.data.email,
      displayName: response.data.display_name,
      capabilities: response.data.capabilities || {}
    }
  },

  async logout(refreshToken) {
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken })
    } catch (err) {
      console.warn('[admin auth] logout call failed (continuing local clear):', err.message)
    }
  }
}

export default adminAuthService
