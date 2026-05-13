import axios from 'axios'

/**
 * Bearer + 401-refresh axios instance for the admin SPA.
 *
 * Distinct localStorage keys from the player SPA so the two sessions
 * don't trample each other if they happen to share an origin in dev.
 */

export const TOKEN_KEY = 'pc_admin_auth_token'
export const USER_KEY = 'pc_admin_user_data'
const REFRESH_PATH = '/auth/refresh'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

let inflightRefresh = null

const readRefreshToken = () => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw)?.refreshToken || null : null
  } catch {
    return null
  }
}

const writeRefreshedTokens = (envelope) => {
  localStorage.setItem(TOKEN_KEY, envelope.access_token)
  try {
    const raw = localStorage.getItem(USER_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed.refreshToken = envelope.refresh_token
    parsed.accessTokenExpiresAt = Date.now() + envelope.access_token_expires_in * 1000
    localStorage.setItem(USER_KEY, JSON.stringify(parsed))
  } catch (err) {
    console.warn('[admin api] persist refreshed tokens failed:', err.message)
  }
  window.dispatchEvent(new CustomEvent('admin-auth:token-refreshed', { detail: envelope }))
}

const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

const performRefresh = async () => {
  const refreshToken = readRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}${REFRESH_PATH}`,
    { refresh_token: refreshToken },
    { timeout: 10000 }
  )
  writeRefreshedTokens(response.data)
  return response.data.access_token
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const config = error.config || {}
    const isRefreshCall = (config.url || '').endsWith(REFRESH_PATH)
    const alreadyRetried = config.__retriedAfterRefresh

    if (status !== 401 || isRefreshCall || alreadyRetried) {
      if (status === 401) {
        clearStoredAuth()
        window.dispatchEvent(new CustomEvent('admin-auth:token-expired'))
      }
      return Promise.reject(error)
    }

    if (!readRefreshToken()) {
      clearStoredAuth()
      window.dispatchEvent(new CustomEvent('admin-auth:token-expired'))
      return Promise.reject(error)
    }

    if (!inflightRefresh) {
      inflightRefresh = performRefresh().finally(() => {
        inflightRefresh = null
      })
    }

    try {
      const newAccess = await inflightRefresh
      config.__retriedAfterRefresh = true
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${newAccess}`
      return api.request(config)
    } catch (refreshErr) {
      clearStoredAuth()
      window.dispatchEvent(new CustomEvent('admin-auth:token-expired'))
      return Promise.reject(refreshErr)
    }
  }
)

export default api
