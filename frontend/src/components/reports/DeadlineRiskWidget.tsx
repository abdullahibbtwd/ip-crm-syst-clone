import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  Clock,
  Flame,
} from 'lucide-react'
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
import { clientDisplayName } from '@/features/crm/utils'
import {
  formatDeadlineDate,
  jurisdictionLabel,
  URGENCY_DOT_CLASS,
  URGENCY_ROW_CLASS,
} from '@/features/deadlines/utils'
import { useDeadlineRiskReport } from '@/features/reports/hooks/useReports'
import type { DeadlineRiskClientGroup, UrgencyTier } from '@/features/reports/types'
import { ReportStatCard, ReportPanel } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

const DEFAULT_WINDOW = 30
const PREVIEW_LIMIT = 6
const CLIENT_PREVIEW_LIMIT = 5

const URGENCY_SORT: Record<UrgencyTier, number> = {
  overdue: 0,
  today: 1,
  urgent: 2,
  soon: 3,
  ok: 4,
  completed: 5,
}

type PreviewRow = {
  id: string
  title: string
  dueDate: string
  urgency: UrgencyTier
  matterId: string
  clientName: string
  jurisdiction: string
  assigneeName: string
}

function buildPreviewRows(groups: DeadlineRiskClientGroup[]): PreviewRow[] {
  const rows: PreviewRow[] = []

  for (const group of groups) {
    const clientName = clientDisplayName(group.client)
    for (const jurisdiction of group.jurisdictions) {
      for (const assignee of jurisdiction.assignees) {
        for (const deadline of assignee.deadlines) {
          if (deadline.urgency === 'ok' || deadline.urgency === 'completed') continue
          rows.push({
            id: deadline.id,
            title: deadline.title,
            dueDate: deadline.dueDate,
            urgency: deadline.urgency,
            matterId: deadline.matterId,
            clientName,
            jurisdiction: jurisdiction.jurisdiction,
            assigneeName: assignee.assignee.fullName,
          })
        }
      }
    }
  }

  return rows
    .sort(
      (a, b) =>
        URGENCY_SORT[a.urgency] - URGENCY_SORT[b.urgency] ||
        a.dueDate.localeCompare(b.dueDate),
    )
    .slice(0, PREVIEW_LIMIT)
}

function topClientsByCritical(groups: DeadlineRiskClientGroup[]) {
  return [...groups]
    .filter((g) => g.counts.critical > 0)
    .sort((a, b) => b.counts.critical - a.counts.critical)
    .slice(0, CLIENT_PREVIEW_LIMIT)
}

export function DeadlineRiskWidget() {
  const { t } = useTranslation('reports')
  const { data, isLoading, isError } = useDeadlineRiskReport({
    dueWithinDays: DEFAULT_WINDOW,
  })

  const previewRows = useMemo(
    () => (data ? buildPreviewRows(data.groups) : []),
    [data],
  )
  const topClients = useMemo(
    () => (data ? topClientsByCritical(data.groups) : []),
    [data],
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportStatCard
          icon={Flame}
          label={t('widgets.deadlineRisk.critical')}
          value={data?.summary.critical ?? 0}
          hint={t('widgets.deadlineRisk.criticalHint')}
          tone="alert"
          to="/reports/deadline-risk"
          loading={isLoading}
          compact
        />
        <ReportStatCard
          icon={AlertTriangle}
          label={t('widgets.deadlineRisk.overdue')}
          value={data?.summary.overdue ?? 0}
          hint={t('widgets.deadlineRisk.actionRequired')}
          tone="alert"
          loading={isLoading}
          compact
        />
        <ReportStatCard
          icon={CalendarClock}
          label={t('widgets.deadlineRisk.dueToday')}
          value={data?.summary.today ?? 0}
          hint={t('widgets.deadlineRisk.requiresSignOff')}
          tone="primary"
          loading={isLoading}
          compact
        />
        <ReportStatCard
          icon={Clock}
          label={t('widgets.deadlineRisk.nextDays', { days: data?.windowDays ?? DEFAULT_WINDOW })}
          value={data?.summary.total ?? 0}
          hint={
            data
              ? t('widgets.deadlineRisk.clientsInWindow', { count: data.summary.clients })
              : t('widgets.deadlineRisk.windowSummary')
          }
          tone="green"
          loading={isLoading}
          compact
        />
      </div>

      <ReportPanel className="p-0 overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-3 p-5 md:px-6">
          <div>
            <h3 className="flex items-center gap-2.5 font-serif text-lg text-brand-green leading-none">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <AlertTriangle className="size-5" />
              </span>
              {t('widgets.deadlineRisk.priorityDeadlines')}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground font-medium">
              {t('widgets.deadlineRisk.prioritySubtitle')}
            </p>
          </div>
          <Link
            to="/reports/deadline-risk"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-[11px] font-bold h-8' })}
          >
            {t('widgets.deadlineRisk.openReport')}
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="px-5 pb-6 md:px-6 md:pb-8">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground italic">
              {t('widgets.deadlineRisk.loading')}
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-sm text-destructive font-medium">
              {t('widgets.deadlineRisk.error')}
            </div>
          ) : !data ? null : (
            <div className="space-y-8">
              {topClients.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green/60">
                    {t('widgets.deadlineRisk.highestExposure')}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {topClients.map((group) => (
                      <Link
                        key={group.client.id}
                        to="/reports/deadline-risk"
                        className="group inline-flex items-center gap-3 rounded-xl border border-brand-green/10 bg-brand-green/[0.04] px-3.5 py-2 text-[12px] transition-all hover:border-primary/40 hover:bg-primary/[0.04]"
                      >
                        <Building2 className="size-3.5 text-brand-green/60 group-hover:text-primary transition-colors" />
                        <span className="font-bold text-brand-green group-hover:text-primary transition-colors">
                          {clientDisplayName(group.client)}
                        </span>
                        <Badge
                          variant="secondary"
                          className="h-5 border-none bg-primary text-white px-2 text-[9px] font-black uppercase tracking-tighter"
                        >
                          {t('widgets.deadlineRisk.criticalCount', { count: group.counts.critical })}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {previewRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-brand-green/15 bg-brand-green/[0.02] py-12 text-center">
                  <p className="text-sm font-bold text-brand-green">{t('widgets.deadlineRisk.portfolioClear')}</p>
                  <p className="mt-1 text-xs text-muted-foreground font-medium">
                    {t('widgets.deadlineRisk.noCriticalInWindow', { days: data.windowDays })}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest">
                          {t('widgets.deadlineRisk.table.priorityDeadline')}
                        </TableHead>
                        <TableHead className="py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest">
                          {t('widgets.deadlineRisk.table.clientJurisdiction')}
                        </TableHead>
                        <TableHead className="hidden py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest sm:table-cell text-right">
                          {t('widgets.deadlineRisk.table.dueDate')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn('transition-colors', URGENCY_ROW_CLASS[row.urgency])}
                        >
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <span
                                className={cn(
                                  'mt-1.5 size-2 shrink-0 rounded-full shadow-sm',
                                  URGENCY_DOT_CLASS[row.urgency],
                                )}
                              />
                              <div className="flex flex-col gap-0.5">
                                <Link
                                  to={`/matters/${row.matterId}/deadlines`}
                                  className="text-[13px] font-bold text-brand-green hover:text-primary transition-colors leading-tight"
                                >
                                  {row.title}
                                </Link>
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase opacity-80">
                                  {row.assigneeName}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-medium text-foreground/80">{row.clientName}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                {jurisdictionLabel(row.jurisdiction)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden py-3.5 px-4 text-right tabular-nums text-[13px] font-bold text-brand-green sm:table-cell">
                            {formatDeadlineDate(row.dueDate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {data.summary.total > previewRows.length ? (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground/70 tracking-tight italic">
                    {t('widgets.deadlineRisk.showingOf', {
                      shown: previewRows.length,
                      total: data.summary.total,
                    })}
                  </p>
                  <Link
                    to="/reports/deadline-risk"
                    className="text-[11px] font-bold text-primary hover:underline underline-offset-4"
                  >
                    {t('widgets.deadlineRisk.viewCrossTab')}
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
