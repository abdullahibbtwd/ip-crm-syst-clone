import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Clock,
  Users,
} from 'lucide-react'
import type { RoleView } from '@/config/role-views'
import { DeadlineRiskWidget } from '@/components/reports/DeadlineRiskWidget'
import { StaffDashboardHero, ReportStatCard } from '@/components/reports/report-ui'
import {
  DashboardKpiRail,
  DashboardPageShell,
  DashboardQuickLinkCard,
  DashboardQuickLinksRail,
  DashboardSectionHeading,
  dashboardHeroPrimaryClass,
  dashboardHeroSecondaryClass,
} from '@/components/dashboard/dashboard-shell'

const ICON_GREEN =
  'bg-gradient-to-br from-brand-green/20 to-brand-green/5 text-brand-green shadow-[0_0_14px_rgba(26,60,52,0.12)]'
const ICON_PRIMARY =
  'bg-gradient-to-br from-primary/25 to-primary/5 text-primary shadow-[0_0_14px_rgba(232,98,26,0.18)]'

type StaffRiskDashboardHomeProps = {
  view: RoleView
  userName: string
}

export function StaffRiskDashboardHome({ view, userName }: StaffRiskDashboardHomeProps) {
  const { t } = useTranslation('dashboard')
  const { t: tNav } = useTranslation('nav')
  const { homeKey } = view.home
  const firstName = userName.split(' ')[0]

  return (
    <DashboardPageShell>
      <StaffDashboardHero
        eyebrow={tNav(`roleHomes.${homeKey}.eyebrow`)}
        title={tNav(`roleHomes.${homeKey}.title`)}
        firstName={firstName}
        description={tNav(`roleHomes.${homeKey}.description`)}
      >
        <Link to="/reports/deadline-risk" className={dashboardHeroPrimaryClass()}>
          <BarChart3 className="size-4" />
          {t('staffRisk.fullRiskReport')}
        </Link>
        <Link to="/deadlines" className={dashboardHeroSecondaryClass()}>
          <CalendarClock className="size-4" />
          {t('staffRisk.worklist')}
        </Link>
      </StaffDashboardHero>

      <DashboardKpiRail desktopCols={3} ariaLabel={t('slider.kpiCarousel')}>
        <ReportStatCard
          icon={AlertTriangle}
          label={t('staffRisk.criticalRisk')}
          value={4}
          hint={t('staffRisk.deadlines7Days')}
          to="/reports/deadline-risk?urgency=critical"
          tone="alert"
        />
        <ReportStatCard
          icon={Clock}
          label={t('staffRisk.upcomingRenewals')}
          value={28}
          hint={t('staffRisk.next30Days')}
          to="/renewals"
          tone="brand"
        />
        <ReportStatCard
          icon={Users}
          label={t('staffRisk.unassignedMatters')}
          value={12}
          hint={t('staffRisk.awaitingAllocation')}
          to="/matters?status=unassigned"
          tone="green"
        />
      </DashboardKpiRail>

      <div className="space-y-6">
        <DashboardSectionHeading
          title={t('staffRisk.deadlineRiskAnalysis')}
          action={
            <Link
              to="/reports/deadline-risk"
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/10 hover:underline"
            >
              {t('staffRisk.viewCrossTab')}
            </Link>
          }
        />
        <DeadlineRiskWidget />
      </div>

      <DashboardQuickLinksRail desktopCols={3} ariaLabel={t('slider.quickLinksCarousel')}>
        <DashboardQuickLinkCard
          to="/reports/deadline-risk"
          icon={BarChart3}
          title={t('staffRisk.crossTab')}
          description={t('staffRisk.crossTabDesc')}
          iconClassName={ICON_GREEN}
          variant="row"
        />
        <DashboardQuickLinkCard
          to="/deadlines"
          icon={AlertTriangle}
          title={t('staffRisk.firmDeadlines')}
          description={t('staffRisk.firmDeadlinesDesc')}
          iconClassName={ICON_PRIMARY}
          variant="row"
        />
        <DashboardQuickLinkCard
          to="/renewals"
          icon={Clock}
          title={t('staffRisk.renewals')}
          description={t('staffRisk.renewalsDesc')}
          iconClassName={ICON_GREEN}
          variant="row"
        />
      </DashboardQuickLinksRail>
    </DashboardPageShell>
  )
}
