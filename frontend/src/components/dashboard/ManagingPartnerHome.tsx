import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  CalendarClock,
  FileOutput,
  PieChart,
  RefreshCw,
  Users,
} from 'lucide-react'
import type { RoleView } from '@/config/role-views'
import { useClients } from '@/features/crm/hooks/useClients'
import {
  useDeadlineRiskReport,
  useFilingVolumesReport,
  useRenewalsSummaryReport,
} from '@/features/reports/hooks/useReports'
import {
  defaultFilingPeriod,
  defaultRenewalsDueBefore,
} from '@/features/reports/renewal-urgency'
import type { ReportStatTone } from '@/components/reports/report-ui'
import { ClientProfitabilityWidget } from '@/components/reports/ClientProfitabilityWidget'
import { DeadlineRiskWidget } from '@/components/reports/DeadlineRiskWidget'
import { FilingVolumesWidget } from '@/components/reports/FilingVolumesWidget'
import { RenewalsSummaryWidget } from '@/components/reports/RenewalsSummaryWidget'
import { RevenueSummaryWidget } from '@/components/reports/RevenueSummaryWidget'
import { TeamWorkloadWidget } from '@/components/reports/TeamWorkloadWidget'
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
import type { TFunction } from 'i18next'

const DEADLINE_RISK_WINDOW = 30
const CLIENT_LIST_LIMIT = 100

const ICON_GREEN =
  'bg-gradient-to-br from-brand-green/20 to-brand-green/5 text-brand-green shadow-[0_0_14px_rgba(26,60,52,0.12)]'
const ICON_PRIMARY =
  'bg-gradient-to-br from-primary/25 to-primary/5 text-primary shadow-[0_0_14px_rgba(232,98,26,0.18)]'

function firmRiskLevel(
  critical: number,
  t: TFunction<'dashboard'>,
): { label: string; tone: ReportStatTone } {
  if (critical === 0) return { label: t('managingPartner.riskLevel.low'), tone: 'green' }
  if (critical <= 8) return { label: t('managingPartner.riskLevel.medium'), tone: 'brand' }
  return { label: t('managingPartner.riskLevel.high'), tone: 'alert' }
}

function filingTrendHint(
  byMonth: { month: string; count: number }[],
  t: TFunction<'dashboard'>,
): string {
  if (byMonth.length === 0) return t('managingPartner.last12Months')
  const recent = byMonth.slice(-6).reduce((sum, row) => sum + row.count, 0)
  const prior = byMonth.slice(0, 6).reduce((sum, row) => sum + row.count, 0)
  if (prior === 0) return t('managingPartner.filingsInLast6Mo', { count: recent })
  const pct = Math.round(((recent - prior) / prior) * 100)
  return t('managingPartner.trendVsPrior6Mo', { pct: `${pct >= 0 ? '+' : ''}${pct}` })
}

function formatClientCount(count: number, hasMore: boolean) {
  return hasMore ? `${count}+` : String(count)
}

type ManagingPartnerHomeProps = {
  view: RoleView
  userName: string
}

export function ManagingPartnerHome({ view, userName }: ManagingPartnerHomeProps) {
  const { t } = useTranslation('dashboard')
  const { t: tNav } = useTranslation('nav')
  const { homeKey } = view.home
  const firstName = userName.split(' ')[0]

  const deadlineRisk = useDeadlineRiskReport({ dueWithinDays: DEADLINE_RISK_WINDOW })
  const filingVolumes = useFilingVolumesReport(defaultFilingPeriod())
  const renewalsSummary = useRenewalsSummaryReport({
    dueBefore: defaultRenewalsDueBefore(),
  })
  const clients = useClients({ limit: 100 })

  const riskKpi = useMemo(() => {
    const critical = deadlineRisk.data?.summary.critical ?? 0
    const clientsWithDeadlines = deadlineRisk.data?.summary.clients ?? 0
    const total = deadlineRisk.data?.summary.total ?? 0
    const level = firmRiskLevel(critical, t)
    return {
      ...level,
      hint: t('managingPartner.riskHint', {
        critical,
        total,
        clients: clientsWithDeadlines,
      }),
    }
  }, [deadlineRisk.data, t])

  const filingsKpi = useMemo(() => {
    const total = filingVolumes.data?.summary.totalFilings ?? 0
    const thisMonth = filingVolumes.data?.byMonth.at(-1)?.count ?? 0
    const hint = filingVolumes.data?.byMonth.length
      ? `${filingTrendHint(filingVolumes.data.byMonth, t)} · ${t('managingPartner.thisMonth', { count: thisMonth })}`
      : t('managingPartner.last12Months')
    return {
      value: total.toLocaleString('en-EU'),
      hint,
    }
  }, [filingVolumes.data, t])

  const renewalsKpi = useMemo(() => {
    const pipeline = renewalsSummary.data?.summary.pipelineTotal ?? 0
    const critical = renewalsSummary.data?.summary.critical ?? 0
    const upcoming = renewalsSummary.data?.summary.upcoming ?? 0
    return {
      value: pipeline.toLocaleString('en-EU'),
      hint: t('managingPartner.renewalsHint', { critical, upcoming }),
    }
  }, [renewalsSummary.data, t])

  const clientsKpi = useMemo(() => {
    if (clients.isLoading) {
      return { value: '—', hint: t('managingPartner.loadingClients') }
    }
    if (clients.isError) {
      return { value: '—', hint: t('managingPartner.clientsError') }
    }
    const items = clients.data?.items ?? []
    const hasMore = Boolean(clients.data?.nextCursor)
    return {
      value: formatClientCount(items.length, hasMore),
      hint: hasMore
        ? t('managingPartner.clientsHintMore', { count: CLIENT_LIST_LIMIT })
        : t('managingPartner.clientsHint'),
    }
  }, [clients.data, clients.isError, clients.isLoading, t])

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
          {t('managingPartner.fullRiskAnalytics')}
        </Link>
        <Link to="/reports/revenue-summary" className={dashboardHeroSecondaryClass()}>
          <PieChart className="size-4" />
          {t('managingPartner.revenueTracking')}
        </Link>
      </StaffDashboardHero>

      <DashboardKpiRail desktopCols={4} ariaLabel={t('slider.kpiCarousel')}>
        <ReportStatCard
          icon={BarChart3}
          label={t('managingPartner.firmDeadlineRisk')}
          value={riskKpi.label}
          hint={riskKpi.hint}
          to="/reports/deadline-risk"
          tone={riskKpi.tone}
          loading={deadlineRisk.isLoading}
        />
        <ReportStatCard
          icon={FileOutput}
          label={t('managingPartner.filings12Mo')}
          value={filingsKpi.value}
          hint={filingsKpi.hint}
          to="/reports/filing-volumes"
          tone="green"
          loading={filingVolumes.isLoading}
        />
        <ReportStatCard
          icon={RefreshCw}
          label={t('managingPartner.renewalPipeline')}
          value={renewalsKpi.value}
          hint={renewalsKpi.hint}
          to="/reports/renewals-summary"
          tone="green"
          loading={renewalsSummary.isLoading}
        />
        <ReportStatCard
          icon={Users}
          label={t('managingPartner.clients')}
          value={clientsKpi.value}
          hint={clientsKpi.hint}
          to="/clients"
          tone="brand"
          loading={clients.isLoading}
        />
      </DashboardKpiRail>

      <div className="space-y-6">
        <DashboardSectionHeading
          title={t('managingPartner.sectionCriticalRisk')}
          action={
            <Link
              to="/reports/deadline-risk"
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/10 hover:underline"
            >
              {t('managingPartner.viewAllReports')}
            </Link>
          }
        />
        <DeadlineRiskWidget />
        <div className="grid gap-6 xl:grid-cols-2">
          <FilingVolumesWidget />
          <RenewalsSummaryWidget />
        </div>
      </div>

      <div className="space-y-6">
        <DashboardSectionHeading title={t('managingPartner.sectionRevenue')} />
        <RevenueSummaryWidget />
        <div className="grid gap-6 lg:grid-cols-2">
          <TeamWorkloadWidget />
          <ClientProfitabilityWidget />
        </div>
      </div>

      <DashboardQuickLinksRail desktopCols={5} ariaLabel={t('slider.quickLinksCarousel')}>
        <DashboardQuickLinkCard
          to="/reports/deadline-risk"
          icon={BarChart3}
          title={t('managingPartner.quickDeadlineRisk')}
          description={t('managingPartner.quickDeadlineRiskDesc')}
          iconClassName={ICON_GREEN}
        />
        <DashboardQuickLinkCard
          to="/reports/filing-volumes"
          icon={FileOutput}
          title={t('managingPartner.quickFilingVolumes')}
          description={t('managingPartner.quickFilingVolumesDesc')}
          iconClassName={ICON_PRIMARY}
        />
        <DashboardQuickLinkCard
          to="/reports/renewals-summary"
          icon={RefreshCw}
          title={t('managingPartner.quickRenewals')}
          description={t('managingPartner.quickRenewalsDesc')}
          iconClassName={ICON_GREEN}
        />
        <DashboardQuickLinkCard
          to="/deadlines"
          icon={CalendarClock}
          title={t('managingPartner.quickWorklist')}
          description={t('managingPartner.quickWorklistDesc')}
          iconClassName={ICON_GREEN}
        />
        <DashboardQuickLinkCard
          to="/clients"
          icon={Users}
          title={t('managingPartner.quickClientDeck')}
          description={t('managingPartner.quickClientDeckDesc')}
          iconClassName={ICON_PRIMARY}
        />
      </DashboardQuickLinksRail>
    </DashboardPageShell>
  )
}
