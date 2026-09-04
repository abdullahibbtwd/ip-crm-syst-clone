import axios from 'axios'

export type AuthRefreshStatus = 'idle' | 'refreshing' | 'invalid'

/** Max times a single request config may retry after a 401. */
export const MAX_AUTH_RETRIES = 1

let refreshPromise: Promise<void> | null = null
let status: AuthRefreshStatus = 'idle'
const failedListeners = new Set<() => void>()
const statusListeners = new Set<(next: AuthRefreshStatus) => void>()

function setStatus(next: AuthRefreshStatus) {
  if (status === next) return
  status = next
  for (const listener of statusListeners) listener(status)
}

export function getAuthRefreshStatus(): AuthRefreshStatus {
  return status
}

export function onAuthRefreshStatusChange(
  listener: (next: AuthRefreshStatus) => void,
): () => void {
  statusListeners.add(listener)
  listener(status)
  return () => {
    statusListeners.delete(listener)
  }
}

/** Clears the session in AuthProvider when the shared refresh fails. */
export function onAuthRefreshFailed(listener: () => void): () => void {
  failedListeners.add(listener)
  return () => {
    failedListeners.delete(listener)
  }
}

/**
 * Call after login / /auth/me success. Cookies are the token store;
 * this flag is the session's usability, shared with useAuthReady().
 */
export function markAuthSessionLive() {
  setStatus('idle')
}

/** Call on logout so stray 401s do not POST /auth/refresh with a dead cookie. */
export function markAuthSessionInvalid() {
  refreshPromise = null
  setStatus('invalid')
}

export function isAuthSessionInvalid(): boolean {
  return status === 'invalid'
}

/**
 * One in-flight refresh for the whole app. Concurrent 401s wait on this
 * promise instead of each rotating the refresh cookie.
 *
 * Tokens live only in httpOnly cookies (Set-Cookie on this response).
 * There is no in-memory access token — queued callers retry after this
 * promise resolves, which is after the browser has applied the new cookies.
 */
export function refreshSession(): Promise<void> {
  if (status === 'invalid') {
    return Promise.reject(invalidSessionError())
  }

  if (!refreshPromise) {
    setStatus('refreshing')
    refreshPromise = axios
      .post('/api/auth/refresh', {}, { withCredentials: true })
      .then(() => {
        setStatus('idle')
      })
      .catch((err: unknown) => {
        setStatus('invalid')
        for (const listener of failedListeners) listener()
        throw err
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export function resetAuthRefreshForTests() {
  refreshPromise = null
  setStatus('idle')
  failedListeners.clear()
  statusListeners.clear()
}

function invalidSessionError() {
  return Object.assign(new Error('Session expired'), { code: 'AUTH_SESSION_INVALID' })
}
