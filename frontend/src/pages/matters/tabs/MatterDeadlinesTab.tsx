import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
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
import {
  useMatterDeadlines,
  useUpdateDeadlineStatus,
} from '@/features/deadlines/hooks/useDeadlines'
import type { DeadlineStatus } from '@/features/deadlines/types'
import {
  DEADLINE_STATUS_LABELS,
  deadlineJurisdiction,
  deadlineUrgency,
  daysUntilDue,
  formatDeadlineDate,
  jurisdictionLabel,
  URGENCY_ROW_CLASS,
} from '@/features/deadlines/utils'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { cn } from '@/lib/utils'
import { DeadlineExplanationButton } from '@/features/deadlines/components/DeadlineExplanationButton'
import type { MatterTabContext } from '../MatterLayout'

export function MatterDeadlinesTab() {
  const { matterId } = useOutletContext<MatterTabContext>()
  const { data: deadlines, isLoading, isError } = useMatterDeadlines(matterId)
  const updateStatus = useUpdateDeadlineStatus(matterId)

  const rows = useMemo(
    () =>
      [...(deadlines ?? [])].sort((a, b) => {
        const byCreated =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        if (byCreated !== 0) return byCreated
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      }),
    [deadlines],
  )

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading deadlines…</p>
  if (isError) return <p className="text-sm text-destructive">Failed to load deadlines.</p>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">Deadlines</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Grace</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                No deadlines yet. Ensure the matter has jurisdictions and an assigned attorney.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((d) => {
              const urgency = deadlineUrgency(d.dueDate, d.status)
              const days = daysUntilDue(d.dueDate)
              return (
                <TableRow key={d.id} className={cn(URGENCY_ROW_CLASS[urgency])}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1">
                      {d.title}
                      <DeadlineExplanationButton deadlineId={d.id} />
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jurisdictionLabel(deadlineJurisdiction(d))}
                  </TableCell>
                  <TableCell>
                    <div>{formatDeadlineDate(d.dueDate)}</div>
                    {d.status !== 'completed' && (
                      <p
                        className={cn(
                          'text-xs',
                          days < 0
                            ? 'text-destructive'
                            : days <= 7
                              ? 'text-amber-600'
                              : 'text-muted-foreground',
                        )}
                      >
                        {days < 0
                          ? `${Math.abs(days)} days overdue`
                          : days === 0
                            ? 'Due today'
                            : `${days} days left`}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.graceDate ? formatDeadlineDate(d.graceDate) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.assignedTo.fullName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="normal-case">
                      {DEADLINE_STATUS_LABELS[d.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate resource="deadline" action="update">
                      {d.status !== 'completed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              id: d.id,
                              status:
                                d.status === 'pending'
                                  ? ('in_progress' as DeadlineStatus)
                                  : ('completed' as DeadlineStatus),
                            })
                          }
                        >
                          {d.status === 'pending' ? 'Start' : 'Complete'}
                        </Button>
                      ) : null}
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
