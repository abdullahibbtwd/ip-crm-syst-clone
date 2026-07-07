import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Banknote,
  CreditCard,
  PieChart,
  Receipt,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { RoleView } from '@/config/role-views'
import { RevenueSummaryWidget } from '@/components/reports/RevenueSummaryWidget'
import { StaffDashboardHero, ReportStatCard } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

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
    <div className="space-y-10">
      <StaffDashboardHero
        eyebrow={tNav(`roleHomes.${homeKey}.eyebrow`)}
        title={tNav(`roleHomes.${homeKey}.title`)}
        firstName={firstName}
        description={tNav(`roleHomes.${homeKey}.description`)}
      >
        <Link
          to="/invoices"
          className={cn(
            buttonVariants(),
            'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md',
          )}
        >
          <Receipt className="size-4" />
          {t('finance.invoiceCenter')}
        </Link>
        <Link
          to="/reports/revenue-summary"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm',
          )}
        >
          <PieChart className="size-4" />
          {t('finance.revenueAnalytics')}
        </Link>
      </StaffDashboardHero>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-brand-green">{t('finance.revenueSummary')}</h2>
          <Link to="/reports/revenue-summary" className="text-xs font-medium text-primary hover:underline">
            {t('finance.viewFullReport')}
          </Link>
        </div>
        <RevenueSummaryWidget />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/invoices" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Receipt className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('finance.invoices')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('finance.invoicesDesc')}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/reports/revenue-summary" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <PieChart className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('finance.analytics')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('finance.analyticsDesc')}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/30 transition group-hover:translate-x-1 group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/rate-cards" className="group block">
          <Card className="h-full border-brand-green/10 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-1">
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green/8 text-brand-green transition-transform group-hover:scale-110">
                <CreditCard className="size-5" />
              </span>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[13px] font-bold uppercase tracking-wider text-brand-green">
                  {t('finance.rateCards')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('finance.rateCardsDesc')}
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
