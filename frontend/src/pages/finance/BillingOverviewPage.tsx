import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CircleDollarSign, CreditCard, PieChart, Receipt } from 'lucide-react'

import { PermissionGate } from '@/components/permissions/PermissionGate'
import { AgingPills, ReportPanel, ReportStatCard } from '@/components/reports/report-ui'
import { formatInvoiceMoney } from '@/features/invoices/utils'
import { useBillingOverview } from '@/features/billing/hooks/useBilling'

export function BillingOverviewPage() {
  const { t } = useTranslation('finance')

  return (
    <PermissionGate
      resource="billing"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">{t('billingOverview.noPermissionBilling')}</p>
      }
    >
      <PermissionGate
        resource="invoice"
        action="read"
        fallback={
          <p className="text-sm text-muted-foreground">{t('billingOverview.noPermissionInvoice')}</p>
        }
      >
        <BillingOverviewContent />
      </PermissionGate>
    </PermissionGate>
  )
}

function BillingOverviewContent() {
  const { t } = useTranslation(['finance', 'common'])
  const { data, isLoading, isError, refetch, isFetching } = useBillingOverview()

  const currency = data?.revenueSummary.currency ?? 'EUR'
  const summary = data?.revenueSummary.summary
  const aging = data?.revenueSummary.aging

  const rateHealth = data?.rateCardsHealth
  const rateCardsTotal = rateHealth?.rateCardsTotal ?? 0
  const internalCostRateCards = rateHealth?.internalCostRateCards ?? 0
  const unratedCount = rateHealth?.unratedTimeEntries.count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">{t('billingOverview.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t('billingOverview.description')}
          </p>
        </div>

        {isError ? (
          <button
            type="button"
            className="rounded-lg border border-primary/25 bg-white/70 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/[0.05]"
            onClick={() => void refetch()}
          >
            {t('actions.retry', { ns: 'common' })}
          </button>
        ) : null}
      </div>

      <ReportPanel className="p-4 md:p-5">
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('billingOverview.error')}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ReportStatCard
                  icon={Receipt}
                  label={t('billingOverview.invoicedLabel')}
                  value={summary ? formatInvoiceMoney(summary.totalInvoiced, currency) : '-'}
                  hint={
                    summary
                      ? t('billingOverview.invoicedHint', { count: summary.invoiceCount })
                      : undefined
                  }
                  tone="green"
                  to="/reports/revenue-summary"
                  loading={isFetching}
                  compact
                />
                <ReportStatCard
                  icon={CircleDollarSign}
                  label={t('billingOverview.collectedLabel')}
                  value={summary ? formatInvoiceMoney(summary.totalPaid, currency) : '-'}
                  hint={summary ? t('billingOverview.collectedHint') : undefined}
                  tone="brand"
                  to="/reports/revenue-summary"
                  loading={isFetching}
                  compact
                />
                <ReportStatCard
                  icon={PieChart}
                  label={t('billingOverview.outstandingLabel')}
                  value={summary ? formatInvoiceMoney(summary.totalOutstanding, currency) : '-'}
                  hint={
                    summary
                      ? t('billingOverview.outstandingHint', { count: summary.openInvoiceCount })
                      : undefined
                  }
                  tone="primary"
                  to="/invoices?paymentStatus=unpaid"
                  loading={isFetching}
                  compact
                />
                <ReportStatCard
                  icon={AlertTriangle}
                  label={t('billingOverview.criticalLabel')}
                  value={summary ? formatInvoiceMoney(summary.criticalReceivables, currency) : '-'}
                  hint={summary ? t('billingOverview.criticalHint') : undefined}
                  tone="alert"
                  to="/reports/revenue-summary"
                  loading={isFetching}
                  compact
                />
              </div>

              {aging ? (
                <div className="rounded-xl border border-border/80 bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-brand-green/60">
                    {t('billingOverview.receivablesAging')}
                  </p>
                  <div className="mt-3">
                    <AgingPills aging={aging} showAmount currency={currency} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{t('billingOverview.receivablesHint')}</p>
                    <Link
                      to="/reports/revenue-summary"
                      className="rounded-lg border border-primary/20 bg-white/60 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/[0.06]"
                    >
                      {t('billingOverview.openFullReport')}
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-brand-green/15 bg-brand-green/[0.02] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-8 items-center justify-center rounded-xl border border-border/80 bg-white/70">
                        <CreditCard className="size-4 text-brand-green" />
                      </span>
                      <h2 className="font-serif text-lg">{t('billingOverview.rateCardHealth')}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('billingOverview.rateCardHealthDescription')}
                    </p>
                  </div>

                  <Link
                    to="/rate-cards"
                    className="rounded-lg bg-brand-green/10 px-3 py-1.5 text-xs font-semibold text-brand-green transition hover:bg-brand-green/15"
                  >
                    {t('billingOverview.manageRateCards')}
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ReportStatCard
                    icon={CreditCard}
                    label={t('billingOverview.rateCardsLabel')}
                    value={`${rateCardsTotal}`}
                    hint={
                      rateCardsTotal > 0
                        ? t('billingOverview.rateCardsHintConfigured')
                        : t('billingOverview.rateCardsHintMissing')
                    }
                    tone={rateCardsTotal > 0 ? 'green' : 'alert'}
                    compact
                  />
                  <ReportStatCard
                    icon={PieChart}
                    label={t('billingOverview.internalCostLabel')}
                    value={`${internalCostRateCards}`}
                    hint={
                      internalCostRateCards > 0
                        ? t('billingOverview.internalCostHintTrueMargin')
                        : t('billingOverview.internalCostHintRevenue')
                    }
                    tone={internalCostRateCards > 0 ? 'brand' : 'primary'}
                    compact
                  />
                  <ReportStatCard
                    icon={AlertTriangle}
                    label={t('billingOverview.unratedLabel')}
                    value={`${unratedCount}`}
                    hint={
                      unratedCount > 0
                        ? t('billingOverview.unratedHintBad')
                        : t('billingOverview.unratedHintGood')
                    }
                    tone={unratedCount > 0 ? 'alert' : 'green'}
                    compact
                  />

                  <div className="rounded-2xl border border-border/80 bg-white/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {t('billingOverview.nextStep')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {unratedCount > 0 || rateCardsTotal === 0
                        ? t('billingOverview.nextStepFix')
                        : t('billingOverview.nextStepHealthy')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('billingOverview.nextStepHint')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">{t('billingOverview.tip')}</div>
            </div>
          </div>
        )}
      </ReportPanel>
    </div>
  )
}
