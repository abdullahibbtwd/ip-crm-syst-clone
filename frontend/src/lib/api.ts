import axios from 'axios'
import {
  isAuthSessionInvalid,
  MAX_AUTH_RETRIES,
  refreshSession,
} from './authRefresh'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Per-request 401 retry count. Must live on this config object, not a module global. */
    _authRetryCount?: number
  }
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const SKIP_REFRESH = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
]

function shouldSkipRefresh(url: unknown): boolean {
  if (typeof url !== 'string') return false
  return SKIP_REFRESH.some((path) => url.includes(path))
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (
      error.response?.status !== 401 ||
      !original ||
      shouldSkipRefresh(original.url)
    ) {
      return Promise.reject(error)
    }

    const retryCount = original._authRetryCount ?? 0
    if (retryCount >= MAX_AUTH_RETRIES || isAuthSessionInvalid()) {
      return Promise.reject(error)
    }

    original._authRetryCount = retryCount + 1
    try {
      await refreshSession()
      return api(original)
    } catch {
      return Promise.reject(error)
    }
  },
)
