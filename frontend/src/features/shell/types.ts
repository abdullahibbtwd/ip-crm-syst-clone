import type { NavItem, RoleView } from '../../config/role-views'

export type ShellNotification = {
  id: string
  title: string
  body: string
  unread: boolean
  linkUrl?: string | null
}

export type ShellContextValue = {
  activeNavId: string
  setActiveNavId: (id: string) => void
  activeNavItem: NavItem | null
  breadcrumb: string
  notificationsOpen: boolean
  setNotificationsOpen: (open: boolean) => void
  userMenuOpen: boolean
  setUserMenuOpen: (open: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  resetForView: (view: RoleView) => void
}
