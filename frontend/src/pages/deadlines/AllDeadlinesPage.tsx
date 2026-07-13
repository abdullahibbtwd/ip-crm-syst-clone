import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Plus } from 'lucide-react'
import { DueTodayAlert } from '@/components/deadlines/DueTodayAlert'
import { DueTodayBadge } from '@/components/deadlines/DueTodayBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { CreateDeadlineDrawer } from '@/features/deadlines/components/CreateDeadlineDrawer'
import { DeadlineExplanationButton } from '@/features/deadlines/components/DeadlineExplanationButton'
import { DeadlineStatusButton } from '@/features/deadlines/components/DeadlineStatusButton'
import {
  useAllDeadlines,
  useDeadlineAssignees,
  useFirmTodayDeadlineCount,
} from '@/features/deadlines/hooks/useDeadlines'
import type { DeadlineStatus } from '@/features/deadlines/types'
import {
  deadlineJurisdiction,
  deadlineStatusLabel,
  deadlineUrgency,
  formatDeadlineDate,
  JURISDICTION_OPTIONS,
  jurisdictionLabel,
  URGENCY_ROW_CLASS,
} from '@/features/deadlines/utils'
import type { MatterType } from '@/features/matters/types'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import { hasAnyRole, type SystemRole } from '@/lib/rbac'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50
const ALL = 'All'

type LayoutContext = {
  activeRole: SystemRole
}

const MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]
const STATUSES: DeadlineStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'missed',
  'escalated',
  'superseded',
]
const STATUS_SET = new Set<string>(STATUSES)

function parseDeadlineStatus(value: string | null): DeadlineStatus | undefined {
  if (!value || !STATUS_SET.has(value)) return undefined
  return value as DeadlineStatus
}

export function AllDeadlinesPage() {
  const { t } = useTranslation('deadlines')
  const { activeRole } = useOutletContext<LayoutContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(searchParams.get('new') === '1')
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])

  const status = parseDeadlineStatus(searchParams.get('status'))
  const hasGraceOnly = searchParams.get('hasGrace') === '1'

  const [assignedToId, setAssignedToId] = useState<string | undefined>()
  const [matterType, setMatterType] = useState<MatterType | undefined>()
  const [jurisdiction, setJurisdiction] = useState<string | undefined>()
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)

  const canCreate = hasAnyRole([activeRole], ['managing_partner', 'docketing_admin'])

  const { data: assignees } = useDeadlineAssignees()
  const { data: todayData } = useFirmTodayDeadlineCount()
  const firmTodayCount = todayData?.count ?? 0

  const setStatus = (value: DeadlineStatus | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('status', value)
        else next.delete('status')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    setPageIndex(0)
    setCursors([undefined])
  }, [assignedToId, matterType, jurisdiction, status, dueFrom, dueTo, overdueOnly, hasGraceOnly])

  const { data, isLoading, isError, isFetching } = useAllDeadlines({
    assignedToId,
    matterType,
    jurisdiction,
    status: overdueOnly ? undefined : status,
    dueFrom: dueFrom || undefined,
    dueTo: dueTo || undefined,
    overdue: overdueOnly || undefined,
    limit: PAGE_SIZE,
    cursor: cursors[pageIndex],
  })

  const deadlines = (data?.items ?? []).filter((d) => (hasGraceOnly ? Boolean(d.graceDate) : true))

  const openDrawer = () => {
    setDrawerOpen(true)
    setSearchParams((prev) => {
      prev.set('new', '1')
      return prev
    })
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setSearchParams((prev) => {
      prev.delete('new')
      return prev
    })
  }

  const handleNextPage = () => {
    if (!data?.nextCursor) return
    setCursors((prev) => {
      const next = [...prev]
      next[pageIndex + 1] = data.nextCursor ?? undefined
      return next
    })
    setPageIndex((p) => p + 1)
  }

  const handlePreviousPage = () => {
    if (pageIndex > 0) setPageIndex((p) => p - 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('allDeadlines.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t('allDeadlines.description')}
          </p>
        </div>
        {canCreate && (
          <Button type="button" onClick={openDrawer}>
            <Plus className="size-4" />
            {t('allDeadlines.newDeadline')}
          </Button>
        )}
      </div>

      <DueTodayAlert
        count={firmTodayCount}
        linkTo="/deadlines"
        label={t('allDeadlines.firmDueToday', { count: firmTodayCount })}
      />

      <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/15 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('allDeadlines.filters.attorney')}</Label>
          <Select
            value={assignedToId ?? ALL}
            onValueChange={(v) => setAssignedToId(v === ALL ? undefined : (v ?? undefined))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('allDeadlines.filters.allAttorneys')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allDeadlines.filters.allAttorneys')}</SelectItem>
              {assignees?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('allDeadlines.filters.matterType')}</Label>
          <Select
            value={matterType ?? ALL}
            onValueChange={(v) => setMatterType(v === ALL ? undefined : (v as MatterType))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('allDeadlines.filters.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allDeadlines.filters.allTypes')}</SelectItem>
              {MATTER_TYPES.map((mt) => (
                <SelectItem key={mt} value={mt}>
                  {MATTER_TYPE_LABELS[mt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('allDeadlines.filters.jurisdiction')}</Label>
          <Select
            value={jurisdiction ?? ALL}
            onValueChange={(v) => setJurisdiction(v === ALL ? undefined : (v ?? undefined))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('allDeadlines.filters.allJurisdictions')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allDeadlines.filters.allJurisdictions')}</SelectItem>
              {JURISDICTION_OPTIONS.map((j) => (
                <SelectItem key={j.value} value={j.value}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('allDeadlines.filters.status')}</Label>
          <Select
            value={overdueOnly ? 'overdue' : (status ?? ALL)}
            onValueChange={(v) => {
              if (v === 'overdue') {
                setOverdueOnly(true)
                setStatus(undefined)
                return
              }
              setOverdueOnly(false)
              setStatus(v === ALL ? undefined : (v as DeadlineStatus))
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('allDeadlines.filters.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('allDeadlines.filters.allStatuses')}</SelectItem>
              <SelectItem value="overdue">{t('allDeadlines.filters.overdue')}</SelectItem>
              {STATUSES.filter((s) => s !== 'superseded').map((s) => (
                <SelectItem key={s} value={s}>
                  {deadlineStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="due-from" className="text-xs text-muted-foreground">
            {t('allDeadlines.filters.dueFrom')}
          </Label>
          <Input
            id="due-from"
            type="date"
            className="bg-background"
            value={dueFrom}
            onChange={(e) => setDueFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="due-to" className="text-xs text-muted-foreground">
            {t('allDeadlines.filters.dueTo')}
          </Label>
          <Input
            id="due-to"
            type="date"
            className="bg-background"
            value={dueTo}
            onChange={(e) => setDueTo(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('allDeadlines.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('allDeadlines.error')}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('allDeadlines.table.matter')}</TableHead>
                <TableHead>{t('allDeadlines.table.attorney')}</TableHead>
                <TableHead>{t('allDeadlines.table.type')}</TableHead>
                <TableHead>{t('allDeadlines.table.jurisdiction')}</TableHead>
                <TableHead>{t('allDeadlines.table.dueDate')}</TableHead>
                <TableHead>{t('allDeadlines.table.grace')}</TableHead>
                <TableHead>{t('allDeadlines.table.status')}</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    {t('allDeadlines.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                deadlines.map((d) => {
                  const urgency = deadlineUrgency(d.dueDate, d.status)
                  const matterTypeKey = d.matter?.matterType as MatterType | undefined
                  return (
                    <TableRow key={d.id} className={cn(URGENCY_ROW_CLASS[urgency])}>
                      <TableCell>
                        <Link
                          to={`/matters/${d.matterId}/deadlines`}
                          className="font-medium text-primary hover:underline"
                        >
                          {d.matter?.title ?? d.title}
                        </Link>
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          {d.title}
                          <DeadlineExplanationButton deadlineId={d.id} />
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.assignedTo.fullName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {matterTypeKey ? MATTER_TYPE_LABELS[matterTypeKey] : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {jurisdictionLabel(deadlineJurisdiction(d))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {urgency === 'today' && <DueTodayBadge />}
                          {urgency === 'overdue' && (
                            <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                          )}
                          <span>{formatDeadlineDate(d.dueDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.graceDate ? formatDeadlineDate(d.graceDate) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="normal-case">
                          {urgency === 'today'
                            ? t('urgency.dueToday')
                            : urgency === 'overdue' && d.status !== 'completed'
                              ? t('urgency.overdue')
                              : deadlineStatusLabel(d.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DeadlineStatusButton
                          deadlineId={d.id}
                          status={d.status}
                          matterId={d.matterId}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {(pageIndex > 0 || data?.nextCursor) && (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageIndex === 0 || isFetching}
                onClick={handlePreviousPage}
              >
                {t('allDeadlines.previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data?.nextCursor || isFetching}
                onClick={handleNextPage}
              >
                {t('allDeadlines.next')}
              </Button>
            </div>
          )}
        </>
      )}

      <CreateDeadlineDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  )
}
