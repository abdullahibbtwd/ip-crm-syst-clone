import { Link } from 'react-router-dom'
import {
  Award,
  Atom,
  CalendarClock,
  FolderOpen,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MATTER_PAGE_SIZE } from '@/components/matters/MattersTable'
import { useMatters } from '@/features/matters/hooks/useMatters'
import { useMyDeadlines } from '@/features/deadlines/hooks/useDeadlines'
import { usePortalRenewals } from '@/features/renewals/hooks/useRenewals'
import { deadlineUrgency } from '@/features/deadlines/utils'
import type { RoleView } from '@/config/role-views'
import { StaffDashboardHero, ReportStatCard } from '@/components/reports/report-ui'
import {
  DashboardKpiRail,
  DashboardPageShell,
  dashboardHeroPrimaryClass,
  dashboardHeroSecondaryClass,
} from '@/components/dashboard/dashboard-shell'

type PortalDashboardProps = {
  view: RoleView
  userName: string
}

export function PortalDashboard({ view, userName }: PortalDashboardProps) {
  const { t } = useTranslation('portal')
  const { t: tNav } = useTranslation('nav')
  const { t: tDash } = useTranslation('dashboard')
  const { homeKey } = view.home
  const firstName = userName.split(' ')[0]
  const matters = useMatters({ limit: MATTER_PAGE_SIZE })
  const deadlines = useMyDeadlines({ limit: 100 })
  const renewals = usePortalRenewals()

  const matterCount = matters.data?.items.length ?? 0
  const matterHasMore = Boolean(matters.data?.nextCursor)

  const renewalCount = renewals.data?.length ?? 0
  const renewalsNeedAction =
    renewals.data?.filter((r) => r.status === 'upcoming').length ?? 0

  const deadlineItems = deadlines.data?.items ?? []
  const openDeadlines = deadlineItems.filter(
    (d) => d.status !== 'completed' && d.status !== 'superseded',
  )
  const overdueCount = deadlineItems.filter(
    (d) => deadlineUrgency(d.dueDate, d.status) === 'overdue',
  ).length

  return (
    <DashboardPageShell>
      <StaffDashboardHero
        eyebrow={tNav(`roleHomes.${homeKey}.eyebrow`)}
        title={tNav(`roleHomes.${homeKey}.title`)}
        firstName={firstName}
        description={tNav(`roleHomes.${homeKey}.description`)}
      >
        <Link to="/portal/intake?tab=new&type=trademark" className={dashboardHeroPrimaryClass()}>
          <Award className="size-4" />
          {t('dashboard.fileTrademark')}
        </Link>
        <Link to="/portal/intake?tab=new&type=patent" className={dashboardHeroSecondaryClass()}>
          <Atom className="size-4" />
          {t('dashboard.filePatent')}
        </Link>
      </StaffDashboardHero>

      <DashboardKpiRail desktopCols={4} ariaLabel={tDash('slider.kpiCarousel')}>
        <ReportStatCard
          icon={FolderOpen}
          label={t('dashboard.stats.activeMatters')}
          value={matterHasMore ? `${matterCount}+` : matterCount}
          hint={t('dashboard.stats.activeMattersHint')}
          to="/matters"
          tone="green"
          loading={matters.isLoading}
        />
        <ReportStatCard
          icon={RefreshCw}
          label={t('dashboard.stats.renewals')}
          value={renewalCount}
          hint={
            renewalsNeedAction > 0
              ? t('dashboard.stats.renewalsNeedAction', { count: renewalsNeedAction })
              : t('dashboard.stats.renewalsCurrent')
          }
          to="/portal/renewals"
          tone={renewalsNeedAction > 0 ? 'brand' : 'green'}
          loading={renewals.isLoading}
        />
        <ReportStatCard
          icon={CalendarClock}
          label={t('dashboard.stats.openDeadlines')}
          value={openDeadlines.length}
          hint={t('dashboard.stats.openDeadlinesHint')}
          to="/deadlines/my"
          tone="brand"
          loading={deadlines.isLoading}
        />
        <ReportStatCard
          icon={AlertTriangle}
          label={t('dashboard.stats.overdue')}
          value={overdueCount}
          hint={
            overdueCount > 0
              ? t('dashboard.stats.overdueUrgent')
              : t('dashboard.stats.overdueCurrent')
          }
          to="/deadlines/my"
          tone={overdueCount > 0 ? 'alert' : 'green'}
          loading={deadlines.isLoading}
        />
      </DashboardKpiRail>
    </DashboardPageShell>
  )
}
