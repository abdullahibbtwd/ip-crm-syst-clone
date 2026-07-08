import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Flame, Inbox, RefreshCw, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { jurisdictionLabel, formatDeadlineDate } from '@/features/deadlines/utils'
import { useRenewalsSummaryReport } from '@/features/reports/hooks/useReports'
import {
  defaultRenewalsDueBefore,
  RENEWAL_URGENCY_DOT_CLASS,
  RENEWAL_URGENCY_ROW_CLASS,
} from '@/features/reports/renewal-urgency'
import { renewalStatusLabel } from '@/features/renewals/utils'
import type { RenewalStatus } from '@/features/renewals/types'
import {
  RenewalUrgencyPills,
  ReportPanel,
  WidgetBody,
  WidgetDateBadge,
  WidgetEmptyState,
  WidgetErrorState,
  WidgetInsetPanel,
  WidgetLoadingSkeleton,
  WidgetMiniStat,
  WidgetPanelHeader,
  WidgetSection,
  WidgetStatRail,
  WidgetTableSection,
  WIDGET_TABLE_HEAD,
  WIDGET_TABLE_ROW,
  WidgetTableShell,
} from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 5

const RENEWAL_DOT_GLOW: Partial<Record<string, string>> = {
  overdue: 'shadow-[0_0_8px_rgba(197,48,48,0.75)]',
  today: 'shadow-[0_0_8px_rgba(232,98,26,0.65)]',
  urgent: 'shadow-[0_0_6px_rgba(232,98,26,0.55)]',
}

export function RenewalsSummaryWidget() {
  const { t } = useTranslation('renewals')
  const filters = { dueBefore: defaultRenewalsDueBefore() }
  const { data, isLoading, isError } = useRenewalsSummaryReport(filters)
  const preview = data?.preview.slice(0, PREVIEW_LIMIT) ?? []
  const hasCritical = (data?.summary.critical ?? 0) > 0

  return (
    <ReportPanel className="overflow-hidden p-0">
      <WidgetPanelHeader
        icon={RefreshCw}
        title={t('widget.title')}
        subtitle={t('widget.subtitle')}
        to="/reports/renewals-summary"
        linkLabel={t('widget.viewPipeline')}
        accent="brand"
        pulse={hasCritical}
      />

      <WidgetBody>
        {isLoading ? (
          <WidgetLoadingSkeleton rows={4} />
        ) : isError ? (
          <WidgetErrorState message={t('widget.error')} />
        ) : !data ? null : (
          <div className="space-y-6">
            <WidgetStatRail wash="mixed">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <WidgetMiniStat
                  icon={RefreshCw}
                  label={t('widget.stats.totalPipeline')}
                  value={data.summary.pipelineTotal}
                  hint={t('widget.stats.activeWindows')}
                  tone="green"
                />
                <WidgetMiniStat
                  icon={Clock}
                  label={t('widget.stats.awaiting')}
                  value={data.summary.upcoming}
                  hint={t('widget.stats.noInstruction')}
                  tone="brand"
                />
                <WidgetMiniStat
                  icon={Flame}
                  label={t('widget.stats.urgent')}
                  value={data.summary.critical}
                  hint={t('widget.stats.due7Days')}
                  tone="alert"
                />
                <WidgetMiniStat
                  icon={AlertTriangle}
                  label={t('widget.stats.instructed')}
                  value={data.summary.instructed}
                  hint={t('widget.stats.proceedConfirmed')}
                  tone="green"
                />
              </div>
            </WidgetStatRail>

            <WidgetInsetPanel>
              <WidgetSection title={t('widget.subtitle')}>
                <RenewalUrgencyPills urgency={data.urgency} />
              </WidgetSection>
            </WidgetInsetPanel>

            {preview.length === 0 ? (
              <WidgetEmptyState icon={Inbox} title={t('widget.empty')} />
            ) : (
              <WidgetTableSection title={t('widget.table.ipAsset')} count={preview.length}>
                <WidgetTableShell>
                  <Table>
                    <TableHeader className={WIDGET_TABLE_HEAD}>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {t('widget.table.ipAsset')}
                        </TableHead>
                        <TableHead className="hidden px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-green/70 sm:table-cell">
                          {t('widget.table.client')}
                        </TableHead>
                        <TableHead className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-brand-green/70">
                          {t('widget.table.dueStatus')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn(WIDGET_TABLE_ROW, RENEWAL_URGENCY_ROW_CLASS[row.urgency])}
                        >
                          <TableCell className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              <span
                                className={cn(
                                  'mt-2 size-2.5 shrink-0 rounded-full',
                                  RENEWAL_URGENCY_DOT_CLASS[row.urgency],
                                  RENEWAL_DOT_GLOW[row.urgency],
                                )}
                              />
                              <div className="flex flex-col gap-1">
                                <Link
                                  to="/renewals"
                                  className="text-[13px] font-bold leading-tight text-brand-green transition-colors group-hover:text-primary"
                                >
                                  {row.ipRightTitle}
                                </Link>
                                <span className="text-[10px] font-semibold uppercase tracking-tight text-muted-foreground/80">
                                  {jurisdictionLabel(row.jurisdiction)} ·{' '}
                                  {t('widget.cycle', { number: row.cycleNumber })}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden px-4 py-4 text-[13px] font-medium text-foreground/80 sm:table-cell">
                            {row.clientName}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <WidgetDateBadge>
                                {formatDeadlineDate(row.dueDate)}
                              </WidgetDateBadge>
                              <Badge
                                variant="secondary"
                                className="h-5 border-none bg-gradient-to-r from-brand-green/12 to-brand-green/6 px-2 text-[9px] font-black uppercase tracking-tighter text-brand-green"
                              >
                                {renewalStatusLabel(row.status as RenewalStatus)}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
