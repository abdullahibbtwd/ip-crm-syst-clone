import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CircleDollarSign,
  PieChart,
  Receipt,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatInvoiceMoney } from '@/features/invoices/utils'
import { useRevenueSummaryReport } from '@/features/reports/hooks/useReports'
import {
  agingBucketLabel,
  AGING_DOT_CLASS,
  AGING_ROW_CLASS,
  defaultRevenuePeriod,
} from '@/features/reports/receivables-aging'
import { AgingPills, ReportStatCard, ReportPanel } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 6

export function RevenueSummaryWidget() {
  const { t } = useTranslation('reports')
  const period = defaultRevenuePeriod()
  const { data, isLoading, isError } = useRevenueSummaryReport(period)
  const currency = data?.currency ?? 'EUR'
  const preview = data?.agingPreview.slice(0, PREVIEW_LIMIT) ?? []

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportStatCard
          icon={Receipt}
          label={t('widgets.revenueSummary.invoiced12Mo')}
          value={data ? formatInvoiceMoney(data.summary.totalInvoiced, currency) : '-'}
          hint={t('widgets.revenueSummary.issued', { count: data?.summary.invoiceCount ?? 0 })}
          tone="green"
          to="/reports/revenue-summary"
          loading={isLoading}
          compact
        />
        <ReportStatCard
          icon={CircleDollarSign}
          label={t('widgets.revenueSummary.collected')}
          value={data ? formatInvoiceMoney(data.summary.totalPaid, currency) : '-'}
          hint={t('widgets.revenueSummary.paidInPeriod')}
          tone="brand"
          loading={isLoading}
          compact
        />
        <ReportStatCard
          icon={PieChart}
          label={t('widgets.revenueSummary.outstanding')}
          value={data ? formatInvoiceMoney(data.summary.totalOutstanding, currency) : '-'}
          hint={t('widgets.revenueSummary.open', { count: data?.summary.openInvoiceCount ?? 0 })}
          tone="primary"
          to="/invoices?paymentStatus=unpaid"
          loading={isLoading}
          compact
        />
        <ReportStatCard
          icon={AlertTriangle}
          label={t('widgets.revenueSummary.criticalRisk')}
          value={data ? formatInvoiceMoney(data.summary.criticalReceivables, currency) : '-'}
          hint={t('widgets.revenueSummary.overdue60Days')}
          tone="alert"
          to="/reports/revenue-summary"
          loading={isLoading}
          compact
        />
      </div>

      <ReportPanel className="p-0 overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-3 p-5 md:px-6">
          <div>
            <h3 className="flex items-center gap-2.5 font-serif text-lg text-brand-green leading-none">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Banknote className="size-5" />
              </span>
              {t('widgets.revenueSummary.receivablesAging')}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground font-medium">
              {t('widgets.revenueSummary.agingSubtitle')}
            </p>
          </div>
          <Link
            to="/reports/revenue-summary"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-[11px] font-bold h-8' })}
          >
            {t('widgets.revenueSummary.fullReport')}
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="px-5 pb-6 md:px-6 md:pb-8">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground italic">
              {t('widgets.revenueSummary.loading')}
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-sm text-destructive font-medium">
              {t('widgets.revenueSummary.error')}
            </div>
          ) : !data ? null : (
            <div className="space-y-6">
              {data.summary.totalOutstanding > 0 ? (
                <div className="pb-2">
                  <AgingPills aging={data.aging} showAmount currency={currency} />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-brand-green/15 bg-brand-green/[0.02] py-10 text-center">
                  <p className="text-sm font-bold text-brand-green">{t('widgets.revenueSummary.portfolioHealthy')}</p>
                  <p className="mt-1 text-xs text-muted-foreground font-medium">
                    {t('widgets.revenueSummary.noReceivables')}
                  </p>
                </div>
              )}

              {preview.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest">
                          {t('widgets.revenueSummary.table.invoiceInfo')}
                        </TableHead>
                        <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest">
                          {t('widgets.revenueSummary.table.client')}
                        </TableHead>
                        <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest sm:table-cell text-right">
                          {t('widgets.revenueSummary.table.outstanding')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn('transition-colors', AGING_ROW_CLASS[row.agingBucket])}
                        >
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  'size-2 shrink-0 rounded-full shadow-sm',
                                  AGING_DOT_CLASS[row.agingBucket],
                                )}
                              />
                              <div className="flex flex-col gap-0.5">
                                <Link
                                  to={`/invoices`}
                                  className="text-[13px] font-bold text-brand-green hover:text-primary transition-colors"
                                >
                                  {row.invoiceNumber ?? t('widgets.revenueSummary.draftRef')}
                                </Link>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase opacity-70">
                                  {agingBucketLabel(row.agingBucket)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-[13px] font-medium text-foreground/80">{row.clientName}</TableCell>
                          <TableCell className="hidden py-3 px-4 text-right text-sm font-bold tabular-nums text-brand-green sm:table-cell">
                            {formatInvoiceMoney(row.outstanding, row.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {data.agingPreview.length > preview.length ? (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/70 tracking-tight italic">
                    {t('widgets.revenueSummary.showingOf', {
                      shown: preview.length,
                      total: data.agingPreview.length,
                    })}
                  </p>
                  <Link
                    to="/reports/revenue-summary"
                    className="text-[11px] font-bold text-primary hover:underline underline-offset-4"
                  >
                    {t('widgets.revenueSummary.viewPortfolio')}
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </ReportPanel>
    </div>
  )
}
