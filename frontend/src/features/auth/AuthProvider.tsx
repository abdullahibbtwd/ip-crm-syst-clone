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

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AuthUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // Clear session even if server logout fails
    }
    setUser(null)
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
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      setUser,
      logout,
    }),
    [user, isLoading, logout],
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
