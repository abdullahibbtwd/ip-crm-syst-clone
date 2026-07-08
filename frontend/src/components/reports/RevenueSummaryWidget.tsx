import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  PieChart,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
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
import {
  AgingPills,
  ReportStatCard,
  ReportPanel,
  WidgetBody,
  WidgetEmptyState,
  WidgetErrorState,
  WidgetFooterBar,
  WidgetInsetPanel,
  WidgetLoadingSkeleton,
  WidgetMetricBadge,
  WidgetPanelHeader,
  WidgetSection,
  WidgetStatRail,
  WidgetTableSection,
  WIDGET_TABLE_HEAD,
  WIDGET_TABLE_ROW,
  WidgetTableShell,
  WidgetTypeBadge,
} from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 6

const AGING_DOT_GLOW: Partial<Record<string, string>> = {
  overdue90plus: 'shadow-[0_0_8px_rgba(197,48,48,0.75)]',
  overdue60: 'shadow-[0_0_6px_rgba(232,98,26,0.55)]',
  overdue30: 'shadow-[0_0_5px_rgba(232,98,26,0.4)]',
}

export function RevenueSummaryWidget() {
  const { t } = useTranslation('reports')
  const period = defaultRevenuePeriod()
  const { data, isLoading, isError } = useRevenueSummaryReport(period)
  const currency = data?.currency ?? 'EUR'
  const preview = data?.agingPreview.slice(0, PREVIEW_LIMIT) ?? []
  const hasCritical = (data?.summary.criticalReceivables ?? 0) > 0

  return (
    <ReportPanel className="overflow-hidden p-0">
      <WidgetPanelHeader
        icon={Banknote}
        title={t('widgets.revenueSummary.receivablesAging')}
        subtitle={t('widgets.revenueSummary.agingSubtitle')}
        to="/reports/revenue-summary"
        linkLabel={t('widgets.revenueSummary.fullReport')}
        accent="brand"
        pulse={hasCritical}
      />

      <WidgetBody>
        {isLoading ? (
          <WidgetLoadingSkeleton rows={5} />
        ) : isError ? (
          <WidgetErrorState message={t('widgets.revenueSummary.error')} />
        ) : !data ? null : (
          <div className="space-y-6">
            <WidgetStatRail wash="primary">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ReportStatCard
                  icon={Receipt}
                  label={t('widgets.revenueSummary.invoiced12Mo')}
                  value={data ? formatInvoiceMoney(data.summary.totalInvoiced, currency) : '-'}
                  hint={t('widgets.revenueSummary.issued', {
                    count: data?.summary.invoiceCount ?? 0,
                  })}
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
                  hint={t('widgets.revenueSummary.open', {
                    count: data?.summary.openInvoiceCount ?? 0,
                  })}
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
            </WidgetStatRail>

            {data.summary.totalOutstanding > 0 ? (
              <WidgetInsetPanel>
                <WidgetSection title={t('widgets.revenueSummary.agingSubtitle')}>
                  <AgingPills aging={data.aging} showAmount currency={currency} />
                </WidgetSection>
              </WidgetInsetPanel>
            ) : (
              <WidgetEmptyState
                icon={ShieldCheck}
                title={t('widgets.revenueSummary.portfolioHealthy')}
                description={t('widgets.revenueSummary.noReceivables')}
              />
            )}

            {preview.length > 0 ? (
              <WidgetTableSection
                title={t('widgets.revenueSummary.table.invoiceInfo')}
                count={preview.length}
                footer={
                  data.agingPreview.length > preview.length ? (
                    <WidgetFooterBar
                      message={t('widgets.revenueSummary.showingOf', {
                        shown: preview.length,
                        total: data.agingPreview.length,
                      })}
                      to="/reports/revenue-summary"
                      linkLabel={t('widgets.revenueSummary.viewPortfolio')}
                    />
                  ) : undefined
                }
              >
                <WidgetTableShell>
                  <Table>
                    <TableHeader className={WIDGET_TABLE_HEAD}>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">
                          {t('widgets.revenueSummary.table.invoiceInfo')}
                        </TableHead>
                        <TableHead className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">
                          {t('widgets.revenueSummary.table.client')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest sm:table-cell">
                          {t('widgets.revenueSummary.table.outstanding')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn(WIDGET_TABLE_ROW, AGING_ROW_CLASS[row.agingBucket])}
                        >
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'size-2.5 shrink-0 rounded-full',
                                  AGING_DOT_CLASS[row.agingBucket],
                                  AGING_DOT_GLOW[row.agingBucket],
                                )}
                              />
                              <div className="flex flex-col gap-1">
                                <Link
                                  to="/invoices"
                                  className="text-[13px] font-bold text-brand-green transition-colors hover:text-primary"
                                >
                                  {row.invoiceNumber ?? t('widgets.revenueSummary.draftRef')}
                                </Link>
                                <WidgetTypeBadge>
                                  {agingBucketLabel(row.agingBucket)}
                                </WidgetTypeBadge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-[13px] font-medium text-foreground/80">
                            {row.clientName}
                          </TableCell>
                          <TableCell className="hidden px-4 py-4 text-right sm:table-cell">
                            <WidgetMetricBadge
                              tone={
                                row.agingBucket === 'overdue90plus'
                                  ? 'alert'
                                  : row.agingBucket === 'current'
                                    ? 'green'
                                    : 'brand'
                              }
                            >
                              {formatInvoiceMoney(row.outstanding, row.currency)}
                            </WidgetMetricBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </WidgetTableShell>
              </WidgetTableSection>
            ) : null}
          </div>
        )}
      </WidgetBody>
    </ReportPanel>
  )
}
