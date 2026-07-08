import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Inbox, Users } from 'lucide-react'
import type { RoleView } from '@/config/role-views'
import { FilingVolumesWidget } from '@/components/reports/FilingVolumesWidget'
import { RenewalsSummaryWidget } from '@/components/reports/RenewalsSummaryWidget'
import { StaffDashboardHero } from '@/components/reports/report-ui'
import {
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
    <DashboardPageShell>
      <StaffDashboardHero
        eyebrow={tNav(`roleHomes.${homeKey}.eyebrow`)}
        title={tNav(`roleHomes.${homeKey}.title`)}
        firstName={firstName}
        description={tNav(`roleHomes.${homeKey}.description`)}
      >
        <Link to="/intake" className={dashboardHeroPrimaryClass()}>
          <Inbox className="size-4" />
          {t('coordinator.intakeQueue')}
        </Link>
        <Link to="/matters" className={dashboardHeroSecondaryClass()}>
          <FolderOpen className="size-4" />
          {t('coordinator.browseMatters')}
        </Link>
      </StaffDashboardHero>

      <div className="space-y-6">
        <DashboardSectionHeading
          title={t('coordinator.pipelineInsights')}
          action={
            <div className="flex gap-2">
              <Link
                to="/reports/filing-volumes"
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/10 hover:underline"
              >
                {t('coordinator.filingVolumes')}
              </Link>
              <span className="text-muted-foreground/30">•</span>
              <Link
                to="/reports/renewals-summary"
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/10 hover:underline"
              >
                {t('coordinator.renewalsSummary')}
              </Link>
            </div>
          }
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <FilingVolumesWidget />
          <RenewalsSummaryWidget />
        </div>
      </div>

      <DashboardQuickLinksRail desktopCols={3} ariaLabel={t('slider.quickLinksCarousel')}>
        <DashboardQuickLinkCard
          to="/intake"
          icon={Inbox}
          title={t('coordinator.intakePipeline')}
          description={t('coordinator.intakePipelineDesc')}
          iconClassName={ICON_PRIMARY}
          variant="row"
        />
        <DashboardQuickLinkCard
          to="/matters"
          icon={FolderOpen}
          title={t('coordinator.openMatters')}
          description={t('coordinator.openMattersDesc')}
          iconClassName={ICON_GREEN}
          variant="row"
        />
        <DashboardQuickLinkCard
          to="/clients"
          icon={Users}
          title={t('coordinator.clientDeck')}
          description={t('coordinator.clientDeckDesc')}
          iconClassName={ICON_GREEN}
          variant="row"
        />
      </DashboardQuickLinksRail>
    </DashboardPageShell>
  )
}
