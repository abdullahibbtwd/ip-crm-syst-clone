import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  Globe2,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clientDisplayName } from '@/features/crm/utils'
import { useDeadlineAssignees } from '@/features/deadlines/hooks/useDeadlines'
import {
  DEADLINE_STATUS_LABELS,
  formatDeadlineDate,
  JURISDICTION_OPTIONS,
  jurisdictionLabel,
  URGENCY_ROW_CLASS,
} from '@/features/deadlines/utils'
import type { DeadlineStatus } from '@/features/deadlines/types'
import { useDeadlineRiskReport } from '@/features/reports/hooks/useReports'
import {
  ReportPanel,
  ReportStatCard,
  UrgencyLegend,
  UrgencyPills,
} from '@/components/reports/report-ui'
import type {
  DeadlineRiskAssigneeGroup,
  DeadlineRiskClientGroup,
  DeadlineRiskJurisdictionGroup,
  UrgencyCounts,
} from '@/features/reports/types'
import { cn } from '@/lib/utils'

const ALL = 'all'
const DEFAULT_WINDOW = 30

function worklistHref(params: {
  jurisdiction?: string
  assignedToId?: string
}) {
  const search = new URLSearchParams()
  if (params.assignedToId) search.set('assignedToId', params.assignedToId)
  if (params.jurisdiction) search.set('jurisdiction', params.jurisdiction)
  const q = search.toString()
  return q ? `/deadlines?${q}` : '/deadlines'
}

function clientRiskAccent(counts: UrgencyCounts) {
  if (counts.overdue > 0) return 'border-l-destructive'
  if (counts.today > 0) return 'border-l-primary'
  if (counts.urgent > 0) return 'border-l-[#e8621a]'
  if (counts.critical > 0) return 'border-l-brand-green/40'
  return 'border-l-border'
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function AssigneeSection({ group }: { group: DeadlineRiskAssigneeGroup }) {
  const { t } = useTranslation('reports')
  const [open, setOpen] = useState(group.counts.critical > 0)

  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-background">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-brand-green/[0.03]"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {open ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-green/8 text-[10px] font-semibold text-brand-green">
            {initials(group.assignee.fullName)}
          </span>
          <span className="truncate font-medium text-brand-green">{group.assignee.fullName}</span>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {group.counts.total}
          </Badge>
        </div>
        <UrgencyPills counts={group.counts} size="sm" />
      </button>
      {open ? (
        <div className="border-t border-border/70 bg-muted/15 px-1 pb-1 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t('deadlineRisk.table.deadline')}</TableHead>
                <TableHead>{t('deadlineRisk.table.matter')}</TableHead>
                <TableHead>{t('deadlineRisk.table.due')}</TableHead>
                <TableHead>{t('deadlineRisk.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.deadlines.map((d) => (
                <TableRow key={d.id} className={cn(URGENCY_ROW_CLASS[d.urgency])}>
                  <TableCell className="font-medium text-brand-green">{d.title}</TableCell>
                  <TableCell>
                    <Link
                      to={`/matters/${d.matterId}/deadlines`}
                      className="text-primary hover:underline"
                    >
                      {d.matterTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatDeadlineDate(d.dueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {DEADLINE_STATUS_LABELS[d.status as DeadlineStatus] ?? d.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}

function JurisdictionSection({ group }: { group: DeadlineRiskJurisdictionGroup }) {
  const [open, setOpen] = useState(group.counts.critical > 0)

  return (
    <div className="rounded-xl border border-dashed border-brand-green/15 bg-brand-green/[0.02] p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <Globe2 className="size-4 text-brand-green/60" />
          <span className="font-medium text-brand-green">
            {jurisdictionLabel(group.jurisdiction)}
          </span>
          <Badge variant="outline" className="tabular-nums">
            {group.counts.total}
          </Badge>
        </div>
        <UrgencyPills counts={group.counts} size="sm" />
      </button>
      {open ? (
        <div className="mt-3 space-y-2 border-t border-brand-green/10 pt-3">
          {group.assignees.map((assignee) => (
            <AssigneeSection key={assignee.assignee.id} group={assignee} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ClientSection({
  group,
  index,
}: {
  group: DeadlineRiskClientGroup
  index: number
}) {
  const { t } = useTranslation('reports')
  const [open, setOpen] = useState(group.counts.critical > 0)
  const name = clientDisplayName(group.client)

  return (
    <Card
      className={cn(
        'overflow-hidden border-brand-green/10 border-l-4 bg-card shadow-sm',
        clientRiskAccent(group.counts),
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-green/8 font-serif text-sm text-brand-green">
            {index + 1}
          </span>
          {open ? (
            <ChevronDown className="mt-2 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="size-4 text-brand-green/60" />
              <h3 className="font-serif text-lg text-brand-green">{name}</h3>
            </div>
            {group.client.internalCode ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{group.client.internalCode}</p>
            ) : null}
            <div className="mt-2">
              <UrgencyPills counts={group.counts} />
            </div>
          </div>
        </button>
        <Link
          to={`/clients/${group.client.id}/matters`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          {t('deadlineRisk.clientMatters')}
        </Link>
      </div>
      {open ? (
        <CardContent className="space-y-3 border-t border-border/60 bg-muted/10 px-4 pb-5 pt-4 md:px-5">
          {group.jurisdictions.map((jurisdiction) => (
            <JurisdictionSection
              key={jurisdiction.jurisdiction}
              group={jurisdiction}
            />
          ))}
        </CardContent>
      ) : null}
    </Card>
  )
}

export function DeadlineRiskCrossTab() {
  const { t } = useTranslation(['reports', 'common'])
  const [windowDays, setWindowDays] = useState(String(DEFAULT_WINDOW))
  const [jurisdiction, setJurisdiction] = useState<string | undefined>()
  const [assignedToId, setAssignedToId] = useState<string | undefined>()

  const filters = useMemo(
    () => ({
      dueWithinDays: Number(windowDays) || DEFAULT_WINDOW,
      ...(jurisdiction ? { jurisdiction } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    }),
    [windowDays, jurisdiction, assignedToId],
  )

  const { data, isLoading, isError, refetch, isFetching } = useDeadlineRiskReport(filters)
  const { data: assignees } = useDeadlineAssignees()

  return (
    <div className="space-y-6">
      <ReportPanel className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[140px] flex-1 space-y-2">
            <Label htmlFor="risk-window" className="text-brand-green/80">
              {t('deadlineRisk.filters.portfolioWindow')}
            </Label>
            <Input
              id="risk-window"
              type="number"
              min={1}
              max={365}
              value={windowDays}
              onChange={(e) => setWindowDays(e.target.value)}
              className="border-brand-green/15 bg-background"
            />
          </div>
          <div className="min-w-[180px] flex-1 space-y-2">
            <Label className="text-brand-green/80">{t('deadlineRisk.filters.jurisdiction')}</Label>
            <Select
              value={jurisdiction ?? ALL}
              onValueChange={(v) => setJurisdiction(v === ALL ? undefined : v ?? undefined)}
            >
              <SelectTrigger className="border-brand-green/15 bg-background">
                <SelectValue placeholder={t('deadlineRisk.filters.allJurisdictions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('deadlineRisk.filters.allJurisdictions')}</SelectItem>
                {JURISDICTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label className="text-brand-green/80">{t('deadlineRisk.filters.responsibleAttorney')}</Label>
            <Select
              value={assignedToId ?? ALL}
              onValueChange={(v) => setAssignedToId(v === ALL ? undefined : v ?? undefined)}
            >
              <SelectTrigger className="border-brand-green/15 bg-background">
                <SelectValue placeholder={t('deadlineRisk.filters.allAssignees')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('deadlineRisk.filters.allAttorneys')}</SelectItem>
                {(assignees ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ReportPanel>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('deadlineRisk.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('deadlineRisk.error')}</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStatCard
              icon={Flame}
              label={t('deadlineRisk.stats.critical')}
              value={data.summary.critical}
              hint={t('deadlineRisk.stats.criticalHint')}
              tone="alert"
            />
            <ReportStatCard
              icon={AlertTriangle}
              label={t('deadlineRisk.stats.overdue')}
              value={data.summary.overdue}
              hint={t('deadlineRisk.stats.overdueHint')}
              tone="alert"
            />
            <ReportStatCard
              icon={CalendarClock}
              label={t('deadlineRisk.stats.dueToday')}
              value={data.summary.today}
              hint={t('deadlineRisk.stats.dueTodayHint')}
              tone="primary"
            />
            <ReportStatCard
              icon={Clock}
              label={t('deadlineRisk.stats.inWindow')}
              value={data.summary.total}
              hint={t('deadlineRisk.clientsInWindow', {
                clients: data.summary.clients,
                days: data.windowDays,
              })}
              tone="green"
            />
          </div>

          <UrgencyLegend />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <UserRound className="mr-1 inline size-3.5" />
              {t('deadlineRisk.generated', { date: formatDeadlineDate(data.generatedAt) })}
              {isFetching ? ` · ${t('common:loading.refreshing')}` : ''}
              <span className="mx-2 text-border">|</span>
              {t('deadlineRisk.clientGroups', { count: data.groups.length })}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
                {t('common:actions.refresh')}
              </Button>
              <Link
                to={worklistHref({ jurisdiction, assignedToId })}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('deadlineRisk.openWorklist')}
              </Link>
            </div>
          </div>

          {data.groups.length === 0 ? (
            <Card className="border-dashed border-brand-green/20 bg-brand-green/[0.03] shadow-none">
              <CardContent className="py-12 text-center">
                <p className="font-serif text-lg text-brand-green">{t('deadlineRisk.emptyTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('deadlineRisk.emptyDescription')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-widest text-brand-green/60">
                {t('deadlineRisk.crossTabTitle')}
              </p>
              {data.groups.map((group, index) => (
                <ClientSection key={group.client.id} group={group} index={index} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
