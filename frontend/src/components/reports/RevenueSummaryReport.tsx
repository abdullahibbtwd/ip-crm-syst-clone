import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CircleDollarSign,
  PieChart,
  Receipt,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatInvoiceDate, formatInvoiceMoney } from '@/features/invoices/utils'
import { useRevenueSummaryReport } from '@/features/reports/hooks/useReports'
import {
  AGING_DOT_CLASS,
  AGING_ROW_CLASS,
  agingBucketLabel,
  defaultRevenuePeriod,
  formatReportMonth,
} from '@/features/reports/receivables-aging'
import {
  AgingLegend,
  AgingPills,
  ReportPanel,
  ReportStatCard,
} from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

export function RevenueSummaryReport() {
  const { t } = useTranslation(['reports', 'common'])
  const defaults = defaultRevenuePeriod()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)

  const filters = useMemo(() => ({ from, to }), [from, to])
  const { data, isLoading, isError, refetch, isFetching } = useRevenueSummaryReport(filters)
  const currency = data?.currency ?? 'EUR'

  return (
    <div className="space-y-6">
      <ReportPanel className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[140px] flex-1 space-y-2">
            <Label htmlFor="rev-from" className="text-brand-green/80">
              {t('revenueSummary.filters.periodFrom')}
            </Label>
            <Input
              id="rev-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border-brand-green/15 bg-background"
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-2">
            <Label htmlFor="rev-to" className="text-brand-green/80">
              {t('revenueSummary.filters.periodTo')}
            </Label>
            <Input
              id="rev-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-brand-green/15 bg-background"
            />
          </div>
        </div>
      </ReportPanel>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('revenueSummary.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('revenueSummary.error')}</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStatCard
              icon={Receipt}
              label={t('revenueSummary.stats.totalInvoiced')}
              value={formatInvoiceMoney(data.summary.totalInvoiced, currency)}
              hint={t('revenueSummary.issuedInPeriod', { count: data.summary.invoiceCount })}
              tone="green"
            />
            <ReportStatCard
              icon={CircleDollarSign}
              label={t('revenueSummary.stats.collected')}
              value={formatInvoiceMoney(data.summary.totalPaid, currency)}
              hint={t('revenueSummary.stats.collectedHint')}
              tone="brand"
            />
            <ReportStatCard
              icon={PieChart}
              label={t('revenueSummary.stats.outstanding')}
              value={formatInvoiceMoney(data.summary.totalOutstanding, currency)}
              hint={t('revenueSummary.openInvoices', { count: data.summary.openInvoiceCount })}
              tone="primary"
            />
            <ReportStatCard
              icon={AlertTriangle}
              label={t('revenueSummary.stats.criticalReceivables')}
              value={formatInvoiceMoney(data.summary.criticalReceivables, currency)}
              hint={t('revenueSummary.stats.criticalReceivablesHint')}
              tone="alert"
            />
          </div>

          <AgingLegend />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t('revenueSummary.generated', { date: formatInvoiceDate(data.generatedAt) })}
              {isFetching ? ` · ${t('common:loading.refreshing')}` : ''}
              <span className="mx-2 text-border">|</span>
              {t('revenueSummary.period', {
                from: formatInvoiceDate(data.period.from),
                to: formatInvoiceDate(data.period.to),
              })}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
                {t('common:actions.refresh')}
              </Button>
              <Link
                to="/invoices?paymentStatus=unpaid"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('revenueSummary.invoiceRegister')}
              </Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-brand-green/10 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <h3 className="font-serif text-lg text-brand-green">
                    {t('revenueSummary.revenueByMonth.title')}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('revenueSummary.revenueByMonth.description')}
                  </p>
                </div>
                {data.byMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('revenueSummary.noInvoices')}</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/80">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>{t('revenueSummary.table.month')}</TableHead>
                          <TableHead className="text-right">{t('revenueSummary.table.invoiced')}</TableHead>
                          <TableHead className="text-right">{t('revenueSummary.table.paid')}</TableHead>
                          <TableHead className="text-right">{t('revenueSummary.table.open')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byMonth.map((row) => (
                          <TableRow key={row.month}>
                            <TableCell className="font-medium text-brand-green">
                              {formatReportMonth(row.month)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatInvoiceMoney(row.invoiced, currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatInvoiceMoney(row.paid, currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatInvoiceMoney(row.outstanding, currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-brand-green/10 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <h3 className="font-serif text-lg text-brand-green">
                    {t('revenueSummary.agingSection.title')}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('revenueSummary.agingSection.description')}
                  </p>
                </div>
                <AgingPills aging={data.aging} showAmount currency={currency} />
                <div className="grid grid-cols-2 gap-2">
                  {(
                    ['current', 'overdue30', 'overdue60', 'overdue90plus'] as const
                  ).map((bucket) => (
                    <div
                      key={bucket}
                      className={cn(
                        'rounded-lg border px-3 py-2.5',
                        AGING_ROW_CLASS[bucket],
                      )}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {agingBucketLabel(bucket)}
                      </p>
                      <p className="mt-1 font-serif text-lg tabular-nums text-brand-green">
                        {formatInvoiceMoney(data.aging[bucket].amount, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('revenueSummary.invoice', { count: data.aging[bucket].count })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-brand-green/60">
              {t('revenueSummary.agingDetail')}
            </p>
            {data.agingPreview.length === 0 ? (
              <Card className="border-dashed border-brand-green/20 bg-brand-green/[0.03] shadow-none">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {t('revenueSummary.noReceivables')}
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>{t('revenueSummary.table.invoice')}</TableHead>
                      <TableHead>{t('revenueSummary.table.client')}</TableHead>
                      <TableHead>{t('revenueSummary.table.due')}</TableHead>
                      <TableHead>{t('revenueSummary.table.aging')}</TableHead>
                      <TableHead className="text-right">{t('revenueSummary.table.outstanding')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.agingPreview.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(AGING_ROW_CLASS[row.agingBucket])}
                      >
                        <TableCell className="font-medium text-brand-green">
                          {row.invoiceNumber ?? '-'}
                        </TableCell>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatInvoiceDate(row.dueDate)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span
                              className={cn(
                                'size-2 rounded-full',
                                AGING_DOT_CLASS[row.agingBucket],
                              )}
                            />
                            {agingBucketLabel(row.agingBucket)}
                            {row.daysPastDue != null && row.daysPastDue > 0
                              ? ` (${row.daysPastDue}d)`
                              : ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatInvoiceMoney(row.outstanding, row.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
