import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  FolderOpen,
  Inbox,
  Users,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { RoleView } from '@/config/role-views'
import { FilingVolumesWidget } from '@/components/reports/FilingVolumesWidget'
import { RenewalsSummaryWidget } from '@/components/reports/RenewalsSummaryWidget'
import { StaffDashboardHero } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

type CoordinatorHomeProps = {
  view: RoleView
  userName: string
}

export function CoordinatorHome({ view, userName }: CoordinatorHomeProps) {
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
          to="/intake"
          className={cn(
            buttonVariants(),
            'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md',
          )}
        >
          <Inbox className="size-4" />
          {t('coordinator.intakeQueue')}
        </Link>
        <Link
          to="/matters"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm',
          )}
        >
          <FolderOpen className="size-4" />
          {t('coordinator.browseMatters')}
        </Link>
      </StaffDashboardHero>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-brand-green">{t('coordinator.pipelineInsights')}</h2>
          <div className="flex gap-2">
            <Link to="/reports/filing-volumes" className="text-xs font-medium text-primary hover:underline">
              {t('coordinator.filingVolumes')}
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link to="/reports/renewals-summary" className="text-xs font-medium text-primary hover:underline">
              {t('coordinator.renewalsSummary')}
            </Link>
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <FilingVolumesWidget />
          <RenewalsSummaryWidget />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/intake" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Inbox className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('coordinator.intakePipeline')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('coordinator.intakePipelineDesc')}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/matters" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <FolderOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('coordinator.openMatters')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('coordinator.openMattersDesc')}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/clients" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('coordinator.clientDeck')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('coordinator.clientDeckDesc')}
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
