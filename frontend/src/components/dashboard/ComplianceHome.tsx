import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, FileOutput, List, Shield, Trash2, Users } from 'lucide-react'
import type { RoleView } from '@/config/role-views'
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

type ComplianceHomeProps = {
  view: RoleView
  userName: string
}

export function ComplianceHome({ view, userName }: ComplianceHomeProps) {
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
        <Link to="/compliance/audit-trail" className={dashboardHeroPrimaryClass()}>
          <List className="size-4" />
          {t('compliance.auditTrail')}
        </Link>
        <Link to="/clients" className={dashboardHeroSecondaryClass()}>
          <Users className="size-4" />
          {t('compliance.clientRegister')}
        </Link>
      </StaffDashboardHero>

      <div className="space-y-6">
        <DashboardSectionHeading title={t('compliance.sectionGdpr')} />
        <DashboardQuickLinksRail desktopCols={4} ariaLabel={t('slider.quickLinksCarousel')}>
          <DashboardQuickLinkCard
            to="/compliance/audit-trail"
            icon={List}
            title={t('compliance.auditTrail')}
            description={t('compliance.auditTrailDesc')}
            iconClassName={ICON_GREEN}
          />
          <DashboardQuickLinkCard
            to="/compliance/data-exports"
            icon={FileOutput}
            title={t('compliance.dataExports')}
            description={t('compliance.dataExportsDesc')}
            iconClassName={ICON_PRIMARY}
          />
          <DashboardQuickLinkCard
            to="/compliance/retention"
            icon={Trash2}
            title={t('compliance.retentionRules')}
            description={t('compliance.retentionRulesDesc')}
            iconClassName={ICON_GREEN}
          />
          <DashboardQuickLinkCard
            to="/clients"
            icon={Shield}
            title={t('compliance.clientRegister')}
            description={t('compliance.clientRegisterDesc')}
            iconClassName={ICON_PRIMARY}
          />
        </DashboardQuickLinksRail>
      </div>

      <div className="space-y-6">
        <DashboardSectionHeading title={t('compliance.sectionAccess')} />
        <DashboardQuickLinksRail desktopCols={2} ariaLabel={t('slider.quickLinksCarousel')}>
          <DashboardQuickLinkCard
            to="/clients"
            icon={Eye}
            title={t('compliance.accessHistory')}
            description={t('compliance.accessHistoryDesc')}
            iconClassName={ICON_GREEN}
          />
          <DashboardQuickLinkCard
            to="/compliance/data-exports"
            icon={FileOutput}
            title={t('compliance.sarExports')}
            description={t('compliance.sarExportsDesc')}
            iconClassName={ICON_PRIMARY}
          />
        </DashboardQuickLinksRail>
      </div>
    </DashboardPageShell>
  )
}
