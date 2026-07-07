import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CircleDollarSign,
  Info,
  Receipt,
  TrendingUp,
  Users,
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
import { cn } from '@/lib/utils'
import { formatInvoiceMoney } from '@/features/invoices/utils'
import { useClientProfitabilityReport } from '@/features/reports/hooks/useReports'
import { ReportPanel } from '@/components/reports/report-ui'

const PREVIEW_LIMIT = 8

export function ClientProfitabilityWidget() {
  const { t } = useTranslation('reports')
  const { data, isLoading, isError } = useClientProfitabilityReport()
  const currency = data?.currency ?? 'EUR'
  const preview = data?.clients.slice(0, PREVIEW_LIMIT) ?? []
  const topClient = data?.clients[0]
  const isTrueMargin = data?.profitabilityBasis === 'true_margin'

  const Stat = ({ icon: Icon, label, value, hint, tone = 'brand' }: {
    icon: typeof CircleDollarSign
    label: string
    value: ReactNode
    hint?: string
    tone?: 'brand' | 'green'
  }) => {
    const isBrand = tone === 'brand'
    const isGreen = tone === 'green'

    return (
      <div className={cn(
        "group flex items-center gap-2 rounded-xl border p-2 transition-all duration-300 min-w-0",
        isBrand && "border-primary/18 bg-primary/[0.05]",
        isGreen && "border-brand-green/12 bg-brand-green/[0.04]"
      )}>
        <div className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
          isBrand && "bg-primary/12 text-primary",
          isGreen && "bg-brand-green/10 text-brand-green"
        )}>
          <Icon className="size-3" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className={cn(
            "text-[7.5px] font-black uppercase tracking-[0.05em] truncate opacity-80",
            isBrand && "text-primary",
            isGreen && "text-brand-green"
          )}>
            {label}
          </p>
          <p className="font-serif text-sm font-bold leading-tight text-brand-green tabular-nums truncate">
            {isLoading ? <span className="animate-pulse">···</span> : value}
          </p>
          {hint && (
            <p className="text-[8px] font-extrabold text-muted-foreground/40 uppercase tracking-tighter truncate leading-none">
              {hint}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <ReportPanel className="p-0 overflow-hidden">
      <div className="flex flex-row items-center justify-between gap-3 p-5 md:px-6">
        <div>
          <h3 className="flex items-center gap-2.5 font-serif text-lg text-brand-green leading-none">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <TrendingUp className="size-5" />
            </span>
            {t('widgets.clientProfitability.title')}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground font-medium">
            {t('widgets.clientProfitability.subtitle')}
          </p>
        </div>
        <Link
          to="/clients"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-[11px] font-bold h-8' })}
        >
          {t('widgets.clientProfitability.viewAllClients')}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="px-5 pb-6 md:px-6 md:pb-8">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground italic">
            {t('widgets.clientProfitability.loading')}
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm text-destructive font-medium">
            {t('widgets.clientProfitability.error')}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            <div className="flex gap-3 rounded-2xl border border-primary/15 bg-primary/[0.03] px-4 py-3 text-[11px] leading-relaxed text-muted-foreground font-medium italic">
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary opacity-70" aria-hidden />
              <p>
                <span className="font-bold text-brand-green not-italic">
                  {isTrueMargin ? t('widgets.clientProfitability.trueMargin') : t('widgets.clientProfitability.revenueProxy')}
                </span>{' '}
                {data.methodologyNote}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={CircleDollarSign}
                label={t('widgets.clientProfitability.totalRevenue')}
                value={formatInvoiceMoney(data.summary.totalRevenue, currency)}
                hint={t('widgets.clientProfitability.clients', { count: data.summary.clientCount })}
                tone="green"
              />
              <Stat
                icon={TrendingUp}
                label={isTrueMargin ? t('widgets.clientProfitability.totalMargin') : t('widgets.clientProfitability.topClient')}
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
              />
              <Stat
                icon={Receipt}
                label={t('widgets.clientProfitability.unbilledWip')}
                value={formatInvoiceMoney(data.summary.totalUnbilledAmount, currency)}
                hint={t('widgets.clientProfitability.pendingAccrual')}
                tone="brand"
              />
              <Stat
                icon={Users}
                label={t('widgets.clientProfitability.firmBilled')}
                value={data.summary.matterCount}
                hint={t('widgets.clientProfitability.totalMatters')}
                tone="green"
              />
            </div>

            {preview.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-green/15 bg-brand-green/[0.02] py-10 text-center">
                <p className="text-sm font-bold text-brand-green text-muted-foreground italic">
                  {t('widgets.clientProfitability.empty')}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-brand-green/70">
                        {t('widgets.clientProfitability.table.clientPortfolio')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70 sm:table-cell">
                        {t('widgets.clientProfitability.table.matters')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70 md:table-cell">
                        {t('widgets.clientProfitability.table.billable')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70 lg:table-cell">
                        {t('widgets.clientProfitability.table.unbilled')}
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70">
                        {isTrueMargin ? t('widgets.clientProfitability.table.margin') : t('widgets.clientProfitability.table.revenue')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => (
                      <TableRow key={row.client.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <Link
                              to={`/clients/${row.client.id}/billing`}
                              className="text-[13px] font-bold text-brand-green hover:text-primary transition-colors"
                            >
                              {row.client.displayName}
                            </Link>
                            {row.client.internalCode ? (
                              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                                {row.client.internalCode}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-3.5 px-4 text-right tabular-nums text-[13px] font-medium text-muted-foreground sm:table-cell">
                          {row.matterCount}
                        </TableCell>
                        <TableCell className="hidden py-3.5 px-4 text-right tabular-nums text-[13px] font-medium text-muted-foreground md:table-cell">
                          {formatInvoiceMoney(row.totalBillableAmount, currency)}
                        </TableCell>
                        <TableCell className="hidden py-3.5 px-4 text-right tabular-nums text-[13px] font-medium text-muted-foreground lg:table-cell">
                          {formatInvoiceMoney(row.unbilledAmount, currency)}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right font-bold tabular-nums text-[13px] text-brand-green">
                          {formatInvoiceMoney(
                            isTrueMargin ? row.totalMargin : row.totalRevenue,
                            currency,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {data.clients.length > preview.length ? (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] font-semibold text-muted-foreground/70 tracking-tight italic">
                  {t('widgets.clientProfitability.showingTop', {
                    shown: preview.length,
                    total: data.clients.length,
                    basis: isTrueMargin
                      ? t('widgets.clientProfitability.basisMargin')
                      : t('widgets.clientProfitability.basisRevenue'),
                  })}
                </p>
                <Link
                  to="/clients"
                  className="text-[11px] font-bold text-primary hover:underline underline-offset-4"
                >
                  {t('widgets.clientProfitability.viewLeaderboard')}
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </ReportPanel>
  )
}
