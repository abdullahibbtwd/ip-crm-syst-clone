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
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import type { TFunction } from 'i18next'

const DEADLINE_RISK_WINDOW = 30
const CLIENT_LIST_LIMIT = 100

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
      return { value: '-', hint: t('managingPartner.loadingClients') }
    }
    if (clients.isError) {
      return { value: '-', hint: t('managingPartner.clientsError') }
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
    <div className="space-y-10">
      <StaffDashboardHero
        eyebrow={tNav(`roleHomes.${homeKey}.eyebrow`)}
        title={tNav(`roleHomes.${homeKey}.title`)}
        firstName={firstName}
        description={tNav(`roleHomes.${homeKey}.description`)}
      >
        <Link
          to="/reports/deadline-risk"
          className={cn(
            buttonVariants(),
            'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md',
          )}
        >
          <BarChart3 className="size-4" />
          {t('managingPartner.fullRiskAnalytics')}
        </Link>
        <Link
          to="/reports/revenue-summary"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm',
          )}
        >
          <PieChart className="size-4" />
          {t('managingPartner.revenueTracking')}
        </Link>
      </StaffDashboardHero>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="border-l-4 border-primary pl-4 font-serif text-xl text-brand-green">
            {t('managingPartner.sectionCriticalRisk')}
          </h2>
          <Link
            to="/reports/deadline-risk"
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('managingPartner.viewAllReports')}
          </Link>
        </div>
        <DeadlineRiskWidget />
        <div className="grid gap-6 xl:grid-cols-2">
          <FilingVolumesWidget />
          <RenewalsSummaryWidget />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="border-l-4 border-primary pl-4 font-serif text-xl text-brand-green">
          {t('managingPartner.sectionRevenue')}
        </h2>
        <RevenueSummaryWidget />
        <div className="grid gap-6 lg:grid-cols-2">
          <TeamWorkloadWidget />
          <ClientProfitabilityWidget />
        </div>
      </div>

      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link to="/reports/deadline-risk" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <BarChart3 className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('managingPartner.quickDeadlineRisk')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('managingPartner.quickDeadlineRiskDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/reports/filing-volumes" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <FileOutput className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('managingPartner.quickFilingVolumes')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('managingPartner.quickFilingVolumesDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/reports/renewals-summary" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <RefreshCw className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('managingPartner.quickRenewals')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('managingPartner.quickRenewalsDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/deadlines" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <CalendarClock className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('managingPartner.quickWorklist')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('managingPartner.quickWorklistDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/clients" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('managingPartner.quickClientDeck')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('managingPartner.quickClientDeckDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
