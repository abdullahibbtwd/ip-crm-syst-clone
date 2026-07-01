import { ShieldCheck, User } from 'lucide-react'
import { MyDeadlinesWidget } from '@/components/deadlines/MyDeadlinesWidget'
import { MyTasksWidget } from '@/components/tasks/MyTasksWidget'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAnyPermission } from '@/hooks/usePermission'
import { Card, CardContent } from '@/components/ui/card'
import type { RoleView } from '@/config/role-views'
import { ROLE_LABELS } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import { ComingSoon } from './ComingSoon'

type DashboardHomeProps = {
  view: RoleView
  userName: string
}

export function DashboardHome({ view, userName }: DashboardHomeProps) {
  const { home, external, role } = view
  const firstName = userName.split(' ')[0]
  const hasWorkWidgets = useAnyPermission('deadline:read', 'task:read')

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          'border py-3 shadow-none',
          external
            ? 'border-primary/20 bg-primary/5'
            : 'border-border bg-muted/30',
        )}
      >
        <CardContent className="flex items-start gap-2.5 px-4 py-0 text-xs">
          {external ? (
            <User className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          ) : (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
          )}
          <span className={external ? 'text-primary' : 'text-muted-foreground'}>
            <strong className="font-semibold text-foreground">{ROLE_LABELS[role]}</strong>
            {' - '}
            {external ? 'Client portal access.' : 'Signed in as '}
            {!external && <span className="text-foreground">{firstName}</span>}
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
