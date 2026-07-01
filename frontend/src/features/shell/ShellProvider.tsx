import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { RoleView } from '../../config/role-views'
import { findNavItem, getHomeNavId } from './nav-utils'
import type { ShellContextValue } from './types'

const ShellContext = createContext<ShellContextValue | null>(null)

type ShellProviderProps = {
  view: RoleView
  children: ReactNode
}

const SIDEBAR_COLLAPSED_KEY = 'ip_crm_sidebar_collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function ShellProvider({ view, children }: ShellProviderProps) {
  const [activeNavId, setActiveNavId] = useState(() => getHomeNavId(view))
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)

  const handleSetSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // ignore storage errors
    }
  }, [])

  const toggleSidebarCollapsed = useCallback(() => {
    handleSetSidebarCollapsed(!sidebarCollapsed)
  }, [handleSetSidebarCollapsed, sidebarCollapsed])

  const resetForView = useCallback((nextView: RoleView) => {
    setActiveNavId(getHomeNavId(nextView))
    setNotificationsOpen(false)
    setUserMenuOpen(false)
    setSidebarOpen(false)
  }, [])

  useEffect(() => {
    resetForView(view)
  }, [view.role, resetForView])

  const activeNavItem = useMemo(
    () => findNavItem(view, activeNavId),
    [view, activeNavId],
  )

  const breadcrumb = activeNavItem?.label ?? view.topbar.breadcrumb

  const handleSetActiveNavId = useCallback((id: string) => {
    setActiveNavId(id)
    setSidebarOpen(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false)
        setUserMenuOpen(false)
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo<ShellContextValue>(
    () => ({
      activeNavId,
      setActiveNavId: handleSetActiveNavId,
      activeNavItem,
      breadcrumb,
      notificationsOpen,
      setNotificationsOpen,
      userMenuOpen,
      setUserMenuOpen,
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      setSidebarCollapsed: handleSetSidebarCollapsed,
      toggleSidebarCollapsed,
      resetForView,
    }),
    [
      activeNavId,
      handleSetActiveNavId,
      activeNavItem,
      breadcrumb,
      notificationsOpen,
      userMenuOpen,
      sidebarOpen,
      sidebarCollapsed,
      handleSetSidebarCollapsed,
      toggleSidebarCollapsed,
      resetForView,
    ],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used within ShellProvider')
  return ctx
}

export { navId } from './nav-utils'
