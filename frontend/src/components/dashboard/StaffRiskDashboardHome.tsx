import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Clock,
  Users,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { RoleView } from '@/config/role-views'
import { DeadlineRiskWidget } from '@/components/reports/DeadlineRiskWidget'
import { StaffDashboardHero, ReportStatCard } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

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
          {t('staffRisk.fullRiskReport')}
        </Link>
        <Link
          to="/deadlines"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm',
          )}
        >
          <CalendarClock className="size-4" />
          {t('staffRisk.worklist')}
        </Link>
      </StaffDashboardHero>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-brand-green">{t('staffRisk.deadlineRiskAnalysis')}</h2>
          <Link to="/reports/deadline-risk" className="text-xs font-medium text-primary hover:underline">
            {t('staffRisk.viewCrossTab')}
          </Link>
        </div>
        <DeadlineRiskWidget />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/reports/deadline-risk" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <BarChart3 className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('staffRisk.crossTab')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('staffRisk.crossTabDesc')}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/deadlines" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('staffRisk.firmDeadlines')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('staffRisk.firmDeadlinesDesc')}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/renewals" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <Clock className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('staffRisk.renewals')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('staffRisk.renewalsDesc')}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
