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
  ShieldCheck,
  Sparkles,
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
import { SWEEP } from '@/components/dashboard/dashboard-shell'
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

const CRITICAL_DOT_GLOW: Partial<Record<UrgencyTier, string>> = {
  overdue: 'shadow-[0_0_8px_rgba(197,48,48,0.75)]',
  today: 'shadow-[0_0_8px_rgba(232,98,26,0.65)]',
  urgent: 'shadow-[0_0_6px_rgba(232,98,26,0.45)]',
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

  const hasCritical = (data?.summary.critical ?? 0) > 0

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-brand-green/10 bg-white/50 p-3 shadow-[0_8px_32px_rgba(26,60,52,0.05)] backdrop-blur-sm md:p-4">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-destructive/[0.04] via-primary/[0.03] to-transparent"
          aria-hidden
        />
        <div className="relative grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>

      <ReportPanel className="overflow-hidden p-0">
        <div className="relative flex flex-row items-center justify-between gap-3 border-b border-brand-green/8 bg-gradient-to-r from-brand-green/[0.04] via-white/40 to-primary/[0.04] p-5 md:px-6">
          <div
            className="pointer-events-none absolute left-0 top-4 h-10 w-1 rounded-r-full bg-primary opacity-80 shadow-[0_0_10px_rgba(232,98,26,0.55)]"
            aria-hidden
          />
          <div className="pl-3">
            <h3 className="flex items-center gap-2.5 font-serif text-lg leading-none">
              <span className="relative flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-white/60 text-primary shadow-[0_0_16px_rgba(232,98,26,0.18)] transition-transform duration-500 hover:scale-105">
                <AlertTriangle className="size-5" />
                {hasCritical ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(197,48,48,0.7)] animate-pulse" />
                ) : null}
              </span>
              <span className="bg-gradient-to-r from-brand-green via-brand-green to-primary bg-clip-text text-transparent">
                {t('widgets.deadlineRisk.priorityDeadlines')}
              </span>
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3 text-primary/60" />
              {t('widgets.deadlineRisk.prioritySubtitle')}
            </p>
          </div>
          <Link
            to="/reports/deadline-risk"
            className={cn(
              'group',
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 border-brand-green/20 bg-white/80 text-[11px] font-bold backdrop-blur-sm',
              'transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.05] hover:text-primary hover:shadow-[0_0_16px_rgba(232,98,26,0.12)]',
            )}
          >
            {t('widgets.deadlineRisk.openReport')}
            <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="px-5 pb-6 md:px-6 md:pb-8">
          {isLoading ? (
            <div className="space-y-3 py-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-gradient-to-r from-brand-green/[0.06] via-muted/30 to-brand-green/[0.04]"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-sm text-destructive font-medium">
              {t('widgets.deadlineRisk.error')}
            </div>
          ) : !data ? null : (
            <div className="space-y-8">
              {topClients.length > 0 ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-green/60">
                    <span className="size-1 rounded-full bg-primary shadow-[0_0_6px_rgba(232,98,26,0.5)]" />
                    {t('widgets.deadlineRisk.highestExposure')}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {topClients.map((group) => (
                      <Link
                        key={group.client.id}
                        to="/reports/deadline-risk"
                        className={cn(
                          'group relative inline-flex items-center gap-3 overflow-hidden rounded-xl border border-brand-green/15 bg-white/70 px-3.5 py-2 text-[12px] backdrop-blur-sm',
                          'transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_24px_rgba(232,98,26,0.1)]',
                          SWEEP,
                        )}
                      >
                        <Building2 className="size-3.5 text-brand-green/60 transition-colors duration-300 group-hover:text-primary" />
                        <span className="font-bold text-brand-green transition-colors duration-300 group-hover:text-primary">
                          {clientDisplayName(group.client)}
                        </span>
                        <Badge
                          variant="secondary"
                          className="h-5 border-none bg-gradient-to-r from-primary to-orange-500 px-2 text-[9px] font-black uppercase tracking-tighter text-white shadow-[0_0_10px_rgba(232,98,26,0.35)]"
                        >
                          {t('widgets.deadlineRisk.criticalCount', { count: group.counts.critical })}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {previewRows.length === 0 ? (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-brand-green/20 bg-gradient-to-br from-brand-green/[0.04] via-white/60 to-primary/[0.03] py-12 text-center">
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-brand-green/8 blur-2xl"
                    aria-hidden
                  />
                  <div className="relative mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-brand-green/15 bg-white/90 text-brand-green shadow-[0_8px_24px_rgba(26,60,52,0.08)]">
                    <ShieldCheck className="size-6" />
                  </div>
                  <p className="relative text-sm font-bold text-brand-green">
                    {t('widgets.deadlineRisk.portfolioClear')}
                  </p>
                  <p className="relative mt-1 text-xs font-medium text-muted-foreground">
                    {t('widgets.deadlineRisk.noCriticalInWindow', { days: data.windowDays })}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-brand-green/10 bg-white/60 shadow-[0_4px_24px_rgba(26,60,52,0.05)] backdrop-blur-sm">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-brand-green/[0.06] via-muted/25 to-primary/[0.04]">
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
                          className={cn(
                            'transition-all duration-300 hover:bg-white/80',
                            URGENCY_ROW_CLASS[row.urgency],
                          )}
                        >
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <span
                                className={cn(
                                  'mt-1.5 size-2 shrink-0 rounded-full',
                                  URGENCY_DOT_CLASS[row.urgency],
                                  CRITICAL_DOT_GLOW[row.urgency],
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
                <div className="flex items-center justify-between rounded-xl border border-brand-green/8 bg-brand-green/[0.03] px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-tight text-muted-foreground/80 italic">
                    {t('widgets.deadlineRisk.showingOf', {
                      shown: previewRows.length,
                      total: data.summary.total,
                    })}
                  </p>
                  <Link
                    to="/reports/deadline-risk"
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-[11px] font-bold text-primary transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.06] hover:shadow-[0_0_12px_rgba(232,98,26,0.15)]"
                  >
                    {t('widgets.deadlineRisk.viewCrossTab')}
                    <ArrowRight className="size-3" />
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
