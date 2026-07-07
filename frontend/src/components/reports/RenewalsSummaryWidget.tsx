import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Flame, RefreshCw, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { jurisdictionLabel } from '@/features/deadlines/utils'
import { formatDeadlineDate } from '@/features/deadlines/utils'
import { useRenewalsSummaryReport } from '@/features/reports/hooks/useReports'
import {
  defaultRenewalsDueBefore,
  RENEWAL_URGENCY_DOT_CLASS,
  RENEWAL_URGENCY_ROW_CLASS,
} from '@/features/reports/renewal-urgency'
import { renewalStatusLabel } from '@/features/renewals/utils'
import type { RenewalStatus } from '@/features/renewals/types'
import { RenewalUrgencyPills, ReportPanel } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 5

export function RenewalsSummaryWidget() {
  const { t } = useTranslation('renewals')
  const filters = { dueBefore: defaultRenewalsDueBefore() }
  const { data, isLoading, isError } = useRenewalsSummaryReport(filters)
  const preview = data?.preview.slice(0, PREVIEW_LIMIT) ?? []

  const Stat = ({ icon: Icon, label, value, hint, tone = 'brand' }: {
    icon: typeof RefreshCw
    label: string
    value: ReactNode
    hint?: string
    tone?: 'brand' | 'alert' | 'green'
  }) => {
    const isBrand = tone === 'brand'
    const isAlert = tone === 'alert'
    const isGreen = tone === 'green'

    return (
      <div className={cn(
        "group flex items-center gap-2 rounded-2xl border p-3 transition-all duration-300",
        isBrand && "border-primary/18 bg-primary/[0.05]",
        isAlert && "border-destructive/18 bg-destructive/[0.05]",
        isGreen && "border-brand-green/12 bg-brand-green/[0.04]"
      )}>
        <div className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          isBrand && "bg-primary/12 text-primary",
          isAlert && "bg-destructive/12 text-destructive",
          isGreen && "bg-brand-green/10 text-brand-green"
        )}>
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-[8px] font-black uppercase tracking-[0.1em]",
            isBrand && "text-primary/75",
            isAlert && "text-destructive/75",
            isGreen && "text-brand-green/65"
          )}>
            {label}
          </p>
          <p className={cn(
            "mt-0.5 font-serif text-lg font-bold leading-none tabular-nums",
            isAlert ? "text-destructive" : "text-brand-green"
          )}>
            {isLoading ? <span className="animate-pulse">···</span> : value}
          </p>
          {hint && (
            <p className="mt-1 text-[9px] font-extrabold text-muted-foreground/45 uppercase tracking-tighter truncate">
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
              <RefreshCw className="size-5" />
            </span>
            {t('widget.title')}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground font-medium">
            {t('widget.subtitle')}
          </p>
        </div>
        <Link
          to="/reports/renewals-summary"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-[11px] font-bold h-8' })}
        >
          {t('widget.viewPipeline')}
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="px-5 pb-6 md:px-6 md:pb-8">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground italic">
            {t('widget.loading')}
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm text-destructive font-medium">
            {t('widget.error')}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={RefreshCw}
                label={t('widget.stats.totalPipeline')}
                value={data.summary.pipelineTotal}
                hint={t('widget.stats.activeWindows')}
                tone="green"
              />
              <Stat
                icon={Clock}
                label={t('widget.stats.awaiting')}
                value={data.summary.upcoming}
                hint={t('widget.stats.noInstruction')}
                tone="brand"
              />
              <Stat
                icon={Flame}
                label={t('widget.stats.urgent')}
                value={data.summary.critical}
                hint={t('widget.stats.due7Days')}
                tone="alert"
              />
              <Stat
                icon={AlertTriangle}
                label={t('widget.stats.instructed')}
                value={data.summary.instructed}
                hint={t('widget.stats.proceedConfirmed')}
                tone="green"
              />
            </div>

            <div className="py-2">
              <RenewalUrgencyPills urgency={data.urgency} />
            </div>

            {preview.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-green/15 bg-brand-green/[0.02] py-10 text-center">
                <p className="text-sm font-bold text-brand-green opacity-60 italic">
                  {t('widget.empty')}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-brand-green/70">
                        {t('widget.table.ipAsset')}
                      </TableHead>
                      <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-brand-green/70 sm:table-cell">
                        {t('widget.table.client')}
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest text-right text-brand-green/70">
                        {t('widget.table.dueStatus')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn('group transition-colors', RENEWAL_URGENCY_ROW_CLASS[row.urgency])}
                      >
                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                'mt-2 size-2 shrink-0 rounded-full shadow-sm',
                                RENEWAL_URGENCY_DOT_CLASS[row.urgency],
                              )}
                            />
                            <div className="flex flex-col gap-0.5">
                              <Link
                                to={`/renewals`}
                                className="text-[13px] font-bold text-brand-green group-hover:text-primary transition-colors leading-tight"
                              >
                                {row.ipRightTitle}
                              </Link>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase opacity-80">
                                {jurisdictionLabel(row.jurisdiction)} · {t('widget.cycle', { number: row.cycleNumber })}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-3.5 px-4 text-[13px] font-medium text-foreground/80 sm:table-cell">
                          {row.clientName}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[13px] font-bold tabular-nums text-brand-green">
                              {formatDeadlineDate(row.dueDate)}
                            </span>
                            <Badge
                              variant="secondary"
                              className="h-4 border-none bg-brand-green/10 text-brand-green px-1.5 text-[9px] font-black uppercase tracking-tighter"
                            >
                              {renewalStatusLabel(row.status as RenewalStatus)}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </ReportPanel>
  )
}
