import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe, logoutRequest } from './api'
import type { AuthUser } from './types'
import i18n from '@/i18n'
import { applyDocumentDirection, isSupportedLocale } from '@/i18n/locales'
import {
  getAuthRefreshStatus,
  isAuthSessionInvalid,
  markAuthSessionInvalid,
  markAuthSessionLive,
  onAuthRefreshFailed,
  onAuthRefreshStatusChange,
  type AuthRefreshStatus,
} from '@/lib/authRefresh'

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AuthUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setUser = useCallback((next: AuthUser) => {
    markAuthSessionLive()
    setUserState(next)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // Clear session even if server logout fails
    }
    markAuthSessionInvalid()
    setUserState(null)
  }, [])

  useEffect(() => {
    return onAuthRefreshFailed(() => setUserState(null))
  }, [])

  useEffect(() => {
    fetchMe()
      .then((profile) => {
        setUser(profile)
        if (profile.preferredLocale && isSupportedLocale(profile.preferredLocale)) {
          void i18n.changeLanguage(profile.preferredLocale)
          applyDocumentDirection(profile.preferredLocale)
        }
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401 || isAuthSessionInvalid()) {
          markAuthSessionInvalid()
        }
        setUserState(null)
      })
      .finally(() => setIsLoading(false))
  }, [setUser])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      setUser,
      logout,
    }),
    [user, isLoading, setUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

/**
 * True once the cookie session is usable: profile loaded, not mid-refresh,
 * and refresh has not been marked dead. Tokens are httpOnly cookies — this
 * flag and the interceptor mutex share AuthRefreshStatus in authRefresh.ts.
 */
export function useAuthReady() {
  const { isAuthenticated, isLoading } = useAuth()
  const [refreshStatus, setRefreshStatus] = useState<AuthRefreshStatus>(
    getAuthRefreshStatus,
  )

  useEffect(() => onAuthRefreshStatusChange(setRefreshStatus), [])

  return isAuthenticated && !isLoading && refreshStatus === 'idle'
}
