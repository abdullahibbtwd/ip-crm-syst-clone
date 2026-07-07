import { CalendarClock, ListTodo, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MyDeadlinesWidget } from '@/components/deadlines/MyDeadlinesWidget'
import { CoordinatorHome } from '@/components/dashboard/CoordinatorHome'
import { DocketingRiskHome } from '@/components/dashboard/DocketingRiskHome'
import { FinanceHome } from '@/components/dashboard/FinanceHome'
import { ManagingPartnerHome } from '@/components/dashboard/ManagingPartnerHome'
import { PortalDashboard } from '@/components/portal/PortalDashboard'
import { MyTasksWidget } from '@/components/tasks/MyTasksWidget'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAnyPermission } from '@/hooks/usePermission'
import type { RoleView } from '@/config/role-views'
import { roleLabel } from '@/lib/rbac'
import { StaffDashboardHero, ReportStatCard } from '@/components/reports/report-ui'
import { ComingSoon } from './ComingSoon'
import { useMyDeadlines } from '@/features/deadlines/hooks/useDeadlines'
import { useMyTasks } from '@/features/tasks/hooks/useTasks'

type DashboardHomeProps = {
  view: RoleView
  userName: string
}

function useRoleHomeCopy(view: RoleView) {
  const { t } = useTranslation('nav')
  const { homeKey, comingSoon } = view.home

  return {
    title: t(`roleHomes.${homeKey}.title`),
    description: comingSoon
      ? t('roleHomes._comingSoon.description')
      : t(`roleHomes.${homeKey}.description`),
  }
}

function DefaultStaffHome({ view, userName }: DashboardHomeProps) {
  const { t } = useTranslation('dashboard')
  const { role } = view
  const homeCopy = useRoleHomeCopy(view)
  const firstName = userName.split(' ')[0]
  const hasWorkWidgets = useAnyPermission('deadline:read', 'task:read')

  const deadlines = useMyDeadlines({ limit: 50 })
  const tasks = useMyTasks(50)

  return (
    <div className="space-y-10">
      <StaffDashboardHero
        eyebrow={roleLabel(role)}
        title={homeCopy.title}
        firstName={firstName}
        description={homeCopy.description}
      >
        <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>{t('defaultStaff.verifiedSession')}</span>
        </div>
      </StaffDashboardHero>

      {hasWorkWidgets ? (
        <div className="grid gap-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <PermissionGate resource="deadline" action="read">
              <ReportStatCard
                icon={CalendarClock}
                label={t('defaultStaff.activeDeadlines')}
                value={deadlines.data?.items.length ?? 0}
                hint={t('defaultStaff.assignedToYou')}
                to="/deadlines/my"
                tone="brand"
                loading={deadlines.isLoading}
              />
            </PermissionGate>
            <PermissionGate resource="task" action="read">
              <ReportStatCard
                icon={ListTodo}
                label={t('defaultStaff.pendingTasks')}
                value={tasks.data?.items.length ?? 0}
                hint={t('defaultStaff.awaitingCompletion')}
                to="/tasks"
                tone="green"
                loading={tasks.isLoading}
              />
            </PermissionGate>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <PermissionGate resource="deadline" action="read">
                <MyDeadlinesWidget />
              </PermissionGate>
            </div>
            <div className="space-y-8">
              <PermissionGate resource="task" action="read">
                <MyTasksWidget />
              </PermissionGate>
            </div>
          </div>
        </div>
      ) : (
        <ComingSoon title={t('comingSoon.dashboardTitle')} />
      )}
    </div>
  )
}

export function DashboardHome({ view, userName }: DashboardHomeProps) {
  if (view.external) {
    return <PortalDashboard view={view} userName={userName} />
  }

  if (view.role === 'managing_partner') {
    return <ManagingPartnerHome view={view} userName={userName} />
  }

  if (view.role === 'docketing_admin') {
    return <DocketingRiskHome view={view} userName={userName} />
  }

  if (view.role === 'finance') {
    return <FinanceHome view={view} userName={userName} />
  }

  if (view.role === 'coordinator') {
    return <CoordinatorHome view={view} userName={userName} />
  }

  return <DefaultStaffHome view={view} userName={userName} />
}
