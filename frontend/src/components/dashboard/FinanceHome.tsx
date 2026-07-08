import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Banknote,
  CreditCard,
  PieChart,
  Receipt,
} from 'lucide-react'
import type { RoleView } from '@/config/role-views'
import { RevenueSummaryWidget } from '@/components/reports/RevenueSummaryWidget'
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

type FinanceHomeProps = {
  view: RoleView
  userName: string
}

export function FinanceHome({ view, userName }: FinanceHomeProps) {
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
        <Link to="/invoices" className={dashboardHeroPrimaryClass()}>
          <Receipt className="size-4" />
          {t('finance.invoiceCenter')}
        </Link>
        <Link to="/reports/revenue-summary" className={dashboardHeroSecondaryClass()}>
          <PieChart className="size-4" />
          {t('finance.revenueAnalytics')}
        </Link>
      </StaffDashboardHero>

      <DashboardKpiRail desktopCols={3} ariaLabel={t('slider.kpiCarousel')}>
        <ReportStatCard
          icon={Receipt}
          label={t('finance.draftInvoices')}
          value={12}
          hint={t('finance.awaitingIssuance')}
          to="/invoices?status=draft"
          tone="brand"
        />
        <ReportStatCard
          icon={Banknote}
          label={t('finance.unpaidAmount')}
          value="€42,500"
          hint={t('finance.awaitingPayment')}
          to="/invoices?paymentStatus=unpaid"
          tone="alert"
        />
        <ReportStatCard
          icon={CreditCard}
          label={t('finance.recentPayments')}
          value="€8,200"
          hint={t('finance.last30Days')}
          to="/invoices?paymentStatus=paid"
          tone="green"
        />
      </DashboardKpiRail>

      <div className="space-y-6">
        <DashboardSectionHeading
          title={t('finance.revenueSummary')}
          action={
            <Link
              to="/reports/revenue-summary"
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary/10 hover:underline"
            >
              {t('finance.viewFullReport')}
            </Link>
          }
        />
        <RevenueSummaryWidget />
      </div>

      <DashboardQuickLinksRail desktopCols={3} ariaLabel={t('slider.quickLinksCarousel')}>
        <DashboardQuickLinkCard
          to="/invoices"
          icon={Receipt}
          title={t('finance.invoices')}
          description={t('finance.invoicesDesc')}
          iconClassName={ICON_PRIMARY}
          variant="row"
        />
        <DashboardQuickLinkCard
          to="/reports/revenue-summary"
          icon={PieChart}
          title={t('finance.analytics')}
          description={t('finance.analyticsDesc')}
          iconClassName={ICON_GREEN}
          variant="row"
        />
        <DashboardQuickLinkCard
          to="/rate-cards"
          icon={CreditCard}
          title={t('finance.rateCards')}
          description={t('finance.rateCardsDesc')}
          iconClassName={ICON_GREEN}
          variant="row"
        />
      </DashboardQuickLinksRail>
    </DashboardPageShell>
  )
}
