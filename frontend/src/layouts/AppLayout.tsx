import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getRoleView, type NavItem } from '../config/role-views'
import { useAuth } from '../features/auth/AuthProvider'
import { NotificationSyncProvider } from '../features/notifications/notification-sync-context'
import {
  withActiveNav,
  navId,
  isNavPathActive,
  navPathSpecificity,
  findNavItem,
} from '../features/shell/nav-utils'
import { ShellProvider, useShell } from '../features/shell/ShellProvider'
import { AppSidebar } from '../components/layout/AppSidebar'
import { AppTopbar } from '../components/layout/AppTopbar'
import { AiAssistantFab } from '../features/ai-assistant/components/AiAssistantFab'
import { Button } from '@/components/ui/button'
import {
  initials,
  resolvePrimaryRole,
  roleLabel,
  ROLE_LABELS,
  type SystemRole,
} from '../lib/rbac'
import { cn } from '../lib/cn'
import { useTranslation } from 'react-i18next'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const userRoles = useMemo(
    () => (user?.roles ?? []).filter((r): r is SystemRole => r in ROLE_LABELS),
    [user?.roles],
  )

  const primaryRole = resolvePrimaryRole(userRoles)
  const [activeRole, setActiveRole] = useState<SystemRole>(primaryRole)

  useEffect(() => {
    setActiveRole(resolvePrimaryRole(userRoles))
  }, [user?.id, userRoles])

  const effectiveRole = userRoles.includes(activeRole) ? activeRole : primaryRole
  const view = getRoleView(effectiveRole)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <ShellProvider view={view}>
      <NotificationSyncProvider>
        <LayoutBody
          view={view}
          user={user}
          userRoles={userRoles}
          effectiveRole={effectiveRole}
          onRoleChange={setActiveRole}
          onLogout={handleLogout}
        />
      </NotificationSyncProvider>
    </ShellProvider>
  )
}

function LayoutBody({
  view,
  user,
  userRoles,
  effectiveRole,
  onRoleChange,
  onLogout,
}: {
  view: ReturnType<typeof getRoleView>
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  userRoles: SystemRole[]
  effectiveRole: SystemRole
  onRoleChange: (role: SystemRole) => void
  onLogout: () => void
}) {
  const { t } = useTranslation('nav')
  const { activeNavId, setActiveNavId, sidebarOpen, setSidebarOpen } = useShell()
  const location = useLocation()
  const navigate = useNavigate()
  const activeView = withActiveNav(view, activeNavId)

  useEffect(() => {
    const navItems = [
      ...view.nav.flatMap((s) => s.items),
      ...view.footer,
    ]
      .filter((item): item is NavItem & { path: string } => Boolean(item.path))
      .sort((a, b) => navPathSpecificity(b.path) - navPathSpecificity(a.path))

    for (const item of navItems) {
      if (isNavPathActive(item.path, location.pathname, location.search)) {
        setActiveNavId(navId(item))
        return
      }
    }
    if (location.pathname.startsWith('/intake')) {
      const intakeItem = view.nav
        .flatMap((s) => s.items)
        .find((i) => i.path === '/intake')
      if (intakeItem) {
        setActiveNavId(navId(intakeItem))
        return
      }
    }
    if (location.pathname.startsWith('/users')) {
      const usersItem = [
        ...view.nav.flatMap((s) => s.items),
        ...view.footer,
      ].find((i) => i.path?.startsWith('/users'))
      if (usersItem) {
        setActiveNavId(navId(usersItem))
        return
      }
    }
    for (const item of view.footer) {
      if (item.path && location.pathname.startsWith(item.path)) {
        setActiveNavId(navId(item))
        return
      }
    }
    if (location.pathname === '/dashboard') {
      const current = findNavItem(view, activeNavId)
      // Keep pathless "Coming Soon" section panels selected
      if (current && !current.path && !current.isHome) return
      const home = view.nav.flatMap((s) => s.items).find((i) => i.isHome)
      if (home) setActiveNavId(navId(home))
    }
  }, [location.pathname, location.search, view, setActiveNavId, activeNavId])

  const handleNavigate = (id: string, path?: string) => {
    if (path) {
      navigate(path)
      setActiveNavId(id)
      setSidebarOpen(false)
      return
    }
    navigate('/dashboard')
    setActiveNavId(id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-brand-light">
      {userRoles.length > 1 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-brand-green/10 bg-white px-4 py-2.5 md:hidden">
          {userRoles.map((role) => (
            <Button
              key={role}
              type="button"
              size="sm"
              variant={effectiveRole === role ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => onRoleChange(role)}
            >
              {roleLabel(role)}
            </Button>
          ))}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && (
          <button
            type="button"
            aria-label={t('sidebar.close')}
            className="absolute inset-0 z-40 bg-brand-green/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={cn(
            'z-50 h-full shrink-0 transition-transform duration-200 lg:relative lg:translate-x-0',
            sidebarOpen
              ? 'absolute inset-y-0 left-0 translate-x-0'
              : 'absolute inset-y-0 left-0 -translate-x-full lg:translate-x-0',
          )}
        >
          <AppSidebar
            nav={activeView.nav}
            footer={activeView.footer}
            external={activeView.external}
            activeNavId={activeNavId}
            onNavigate={handleNavigate}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar
            userName={user.fullName}
            roleLabel={roleLabel(effectiveRole)}
            avatarInitials={initials(user.fullName)}
            email={user.email}
            external={activeView.external}
            showLanguage={activeView.topbar.showLanguage}
            showTasks={activeView.topbar.showTasks}
            availableRoles={userRoles}
            activeRole={effectiveRole}
            onRoleChange={onRoleChange}
            onLogout={onLogout}
          />

          <main className="app-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet
              context={{
                view: activeView,
                user,
                activeRole: effectiveRole,
              }}
            />
          </main>
        </div>
      </div>

      <AiAssistantFab />
    </div>
  )
}
