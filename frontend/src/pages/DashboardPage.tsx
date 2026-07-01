import { useOutletContext } from 'react-router-dom'
import { DashboardHome } from '@/components/dashboard/DashboardHome'
import { SectionPanel } from '@/components/dashboard/SectionPanel'
import type { RoleView } from '@/config/role-views'
import type { AuthUser } from '@/features/auth/types'
import { isHomeNav } from '@/features/shell/nav-utils'
import { useShell } from '@/features/shell/ShellProvider'
import type { SystemRole } from '@/lib/rbac'

type DashboardOutletContext = {
  view: RoleView
  user: AuthUser
  activeRole: SystemRole
}

export function DashboardPage() {
  const { view, user } = useOutletContext<DashboardOutletContext>()
  const { activeNavId, activeNavItem } = useShell()

  if (isHomeNav(view, activeNavId) || !activeNavItem) {
    return <DashboardHome view={view} userName={user.fullName} />
  }

  return <SectionPanel item={activeNavItem} />
}
