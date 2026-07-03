import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { DueTodayAlert } from '@/components/deadlines/DueTodayAlert'
import { DueTodayBadge } from '@/components/deadlines/DueTodayBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeadlineStatusButton } from '@/features/deadlines/components/DeadlineStatusButton'
import { useMyDeadlines, useMyTodayDeadlineCount } from '@/features/deadlines/hooks/useDeadlines'
import type { MyDeadlinesTab } from '@/features/deadlines/types'
import {
  DEADLINE_STATUS_LABELS,
  deadlineJurisdiction,
  deadlineUrgency,
  formatDeadlineDate,
  jurisdictionLabel,
  URGENCY_ROW_CLASS,
} from '@/features/deadlines/utils'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

const TABS: { id: MyDeadlinesTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
]

export function MyDeadlinesPage() {
  const [tab, setTab] = useState<MyDeadlinesTab>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])

  useEffect(() => {
    setPageIndex(0)
    setCursors([undefined])
  }, [tab])

  const { data, isLoading, isError, isFetching } = useMyDeadlines({
    tab,
    limit: PAGE_SIZE,
    cursor: cursors[pageIndex],
  })
  const { data: todayData } = useMyTodayDeadlineCount()

  const deadlines = data?.items ?? []
  const todayCount = todayData?.count ?? 0

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
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">My deadlines</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Your personal worklist across all assigned matters. Update status here without opening
          each matter.
        </p>
      </div>

      <DueTodayAlert count={todayCount} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading deadlines…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load deadlines.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Grace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No deadlines in this view.
                  </TableCell>
                </TableRow>
              ) : (
                deadlines.map((d) => {
                  const urgency = deadlineUrgency(d.dueDate, d.status)
                  const matterType = d.matter?.matterType as MatterType | undefined
                  return (
                    <TableRow
                      key={d.id}
                      className={cn('cursor-pointer', URGENCY_ROW_CLASS[urgency])}
                    >
                      <TableCell>
                        <Link
                          to={`/matters/${d.matterId}/deadlines`}
                          className="font-medium text-primary hover:underline"
                        >
                          {d.matter?.title ?? d.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {matterType ? MATTER_TYPE_LABELS[matterType] : '-'}
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
                        {d.graceDate ? formatDeadlineDate(d.graceDate) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="normal-case">
                          {urgency === 'today'
                            ? 'Due today'
                            : urgency === 'overdue' && d.status !== 'completed'
                              ? 'Overdue'
                              : DEADLINE_STATUS_LABELS[d.status]}
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
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data?.nextCursor || isFetching}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
