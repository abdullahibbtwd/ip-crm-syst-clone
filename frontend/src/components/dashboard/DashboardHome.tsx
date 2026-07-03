import { ShieldCheck } from 'lucide-react'
import { MyDeadlinesWidget } from '@/components/deadlines/MyDeadlinesWidget'
import { PortalDashboard } from '@/components/portal/PortalDashboard'
import { MyTasksWidget } from '@/components/tasks/MyTasksWidget'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAnyPermission } from '@/hooks/usePermission'
import { Card, CardContent } from '@/components/ui/card'
import type { RoleView } from '@/config/role-views'
import { ROLE_LABELS } from '@/lib/rbac'
import { ComingSoon } from './ComingSoon'

type DashboardHomeProps = {
  view: RoleView
  userName: string
}

export function DashboardHome({ view, userName }: DashboardHomeProps) {
  const { home, external, role } = view
  const firstName = userName.split(' ')[0]
  const hasWorkWidgets = useAnyPermission('deadline:read', 'task:read')

  if (external) {
    return <PortalDashboard userName={userName} />
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-muted/30 py-3 shadow-none">
        <CardContent className="flex items-start gap-2.5 px-4 py-0 text-xs">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
          <span className="text-muted-foreground">
            <strong className="font-semibold text-foreground">{ROLE_LABELS[role]}</strong>
            {' - '}
            Signed in as <span className="text-foreground">{firstName}</span>
          </span>
        </CardContent>
      </Card>

      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {home.title}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{home.description}</p>
      </div>

      {hasWorkWidgets ? (
        <div className="space-y-6">
          <PermissionGate resource="deadline" action="read">
            <MyDeadlinesWidget />
          </PermissionGate>
          <PermissionGate resource="task" action="read">
            <MyTasksWidget />
          </PermissionGate>
        </div>
      ) : (
        <ComingSoon title="Dashboard coming soon" />
      )}
    </div>
  )
}
