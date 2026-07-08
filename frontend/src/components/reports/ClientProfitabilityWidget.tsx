import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CircleDollarSign,
  Info,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
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
import { useClientProfitabilityReport } from '@/features/reports/hooks/useReports'
import {
  ReportPanel,
  WidgetBody,
  WidgetEmptyState,
  WidgetErrorState,
  WidgetFooterBar,
  WidgetInfoBanner,
  WidgetLoadingSkeleton,
  WidgetMetricBadge,
  WidgetMiniStat,
  WidgetPanelHeader,
  WidgetRankBadge,
  WidgetStatRail,
  WidgetTableSection,
  WIDGET_TABLE_HEAD,
  WIDGET_TABLE_ROW,
  WidgetTableShell,
  WidgetTypeBadge,
} from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 8

export function ClientProfitabilityWidget() {
  const { t } = useTranslation('reports')
  const { data, isLoading, isError } = useClientProfitabilityReport()
  const currency = data?.currency ?? 'EUR'
  const preview = data?.clients.slice(0, PREVIEW_LIMIT) ?? []
  const topClient = data?.clients[0]
  const isTrueMargin = data?.profitabilityBasis === 'true_margin'

  return (
    <ReportPanel className="overflow-hidden p-0">
      <WidgetPanelHeader
        icon={TrendingUp}
        title={t('widgets.clientProfitability.title')}
        subtitle={t('widgets.clientProfitability.subtitle')}
        to="/clients"
        linkLabel={t('widgets.clientProfitability.viewAllClients')}
        accent="brand"
      />

      <WidgetBody>
        {isLoading ? (
          <WidgetLoadingSkeleton rows={5} />
        ) : isError ? (
          <WidgetErrorState message={t('widgets.clientProfitability.error')} />
        ) : !data ? null : (
          <div className="space-y-6">
            <WidgetInfoBanner>
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary opacity-70" aria-hidden />
              <p>
                <span className="font-bold not-italic text-brand-green">
                  {isTrueMargin
                    ? t('widgets.clientProfitability.trueMargin')
                    : t('widgets.clientProfitability.revenueProxy')}
                </span>{' '}
                {data.methodologyNote}
              </p>
            </WidgetInfoBanner>

            <WidgetStatRail wash="mixed">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <WidgetMiniStat
                  icon={CircleDollarSign}
                  label={t('widgets.clientProfitability.totalRevenue')}
                  value={formatInvoiceMoney(data.summary.totalRevenue, currency)}
                  hint={t('widgets.clientProfitability.clients', {
                    count: data.summary.clientCount,
                  })}
                  tone="green"
                  size="sm"
                />
                <WidgetMiniStat
                  icon={TrendingUp}
                  label={
                    isTrueMargin
                      ? t('widgets.clientProfitability.totalMargin')
                      : t('widgets.clientProfitability.topClient')
                  }
                  value={
                    isTrueMargin
                      ? formatInvoiceMoney(data.summary.totalMargin, currency)
                      : topClient?.client.displayName.split(' ')[0] ?? '-'
                  }
                  hint={
                    isTrueMargin
                      ? t('widgets.clientProfitability.internalCost', {
                          amount: formatInvoiceMoney(data.summary.totalInternalCost, currency),
                        })
                      : topClient
                        ? formatInvoiceMoney(topClient.totalRevenue, currency)
                        : t('widgets.clientProfitability.noBillingData')
                  }
                  tone="brand"
                  size="sm"
                />
                <WidgetMiniStat
                  icon={Receipt}
                  label={t('widgets.clientProfitability.unbilledWip')}
                  value={formatInvoiceMoney(data.summary.totalUnbilledAmount, currency)}
                  hint={t('widgets.clientProfitability.pendingAccrual')}
                  tone="brand"
                  size="sm"
                />
                <WidgetMiniStat
                  icon={Users}
                  label={t('widgets.clientProfitability.firmBilled')}
                  value={data.summary.matterCount}
                  hint={t('widgets.clientProfitability.totalMatters')}
                  tone="green"
                  size="sm"
                />
              </div>
            </WidgetStatRail>

            {preview.length === 0 ? (
              <WidgetEmptyState icon={Wallet} title={t('widgets.clientProfitability.empty')} />
            ) : (
              <WidgetTableSection
                title={t('widgets.clientProfitability.table.clientPortfolio')}
                count={preview.length}
                footer={
                  data.clients.length > preview.length ? (
                    <WidgetFooterBar
                      message={t('widgets.clientProfitability.showingTop', {
                        shown: preview.length,
                        total: data.clients.length,
                        basis: isTrueMargin
                          ? t('widgets.clientProfitability.basisMargin')
                          : t('widgets.clientProfitability.basisRevenue'),
                      })}
                      to="/clients"
                      linkLabel={t('widgets.clientProfitability.viewLeaderboard')}
                    />
                  ) : undefined
                }
              >
                <WidgetTableShell>
                  <Table>
                    <TableHeader className={WIDGET_TABLE_HEAD}>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {t('widgets.clientProfitability.table.clientPortfolio')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70 sm:table-cell">
                          {t('widgets.clientProfitability.table.matters')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70 md:table-cell">
                          {t('widgets.clientProfitability.table.billable')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70 lg:table-cell">
                          {t('widgets.clientProfitability.table.unbilled')}
                        </TableHead>
                        <TableHead className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {isTrueMargin
                            ? t('widgets.clientProfitability.table.margin')
                            : t('widgets.clientProfitability.table.revenue')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, index) => {
                        const isTop = index === 0
                        const metric = formatInvoiceMoney(
                          isTrueMargin ? row.totalMargin : row.totalRevenue,
                          currency,
                        )
                        return (
                          <TableRow
                            key={row.client.id}
                            className={cn(
                              WIDGET_TABLE_ROW,
                              isTop && 'bg-primary/[0.03]',
                            )}
                          >
                            <TableCell className="px-4 py-4">
                              <div className="flex items-start gap-3">
                                <WidgetRankBadge rank={index + 1} />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <Link
                                    to={`/clients/${row.client.id}/billing`}
                                    className="block truncate text-[13px] font-bold text-brand-green transition-colors hover:text-primary"
                                  >
                                    {row.client.displayName}
                                  </Link>
                                  {row.client.internalCode ? (
                                    <WidgetTypeBadge>{row.client.internalCode}</WidgetTypeBadge>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden px-4 py-4 text-right text-[13px] font-medium tabular-nums text-muted-foreground sm:table-cell">
                              {row.matterCount}
                            </TableCell>
                            <TableCell className="hidden px-4 py-4 text-right text-[13px] font-medium tabular-nums text-muted-foreground md:table-cell">
                              {formatInvoiceMoney(row.totalBillableAmount, currency)}
                            </TableCell>
                            <TableCell className="hidden px-4 py-4 text-right text-[13px] font-medium tabular-nums text-muted-foreground lg:table-cell">
                              {formatInvoiceMoney(row.unbilledAmount, currency)}
                            </TableCell>
                            <TableCell className="px-4 py-4 text-right">
                              <WidgetMetricBadge tone={isTop ? 'brand' : 'green'}>
                                {metric}
                              </WidgetMetricBadge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </WidgetTableShell>
              </WidgetTableSection>
            )}
          </div>
        )}
      </WidgetBody>
    </ReportPanel>
  )
}
