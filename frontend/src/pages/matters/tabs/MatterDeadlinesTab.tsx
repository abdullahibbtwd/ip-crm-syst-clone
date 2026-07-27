import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  deadlineJurisdiction,
  deadlineStatusLabel,
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
  const { t } = useTranslation(['matters', 'common'])
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

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('deadlines.loading')}</p>
  if (isError) return <p className="text-sm text-destructive">{t('deadlines.error')}</p>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">{t('deadlines.title')}</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('deadlines.table.title')}</TableHead>
            <TableHead>{t('deadlines.table.jurisdiction')}</TableHead>
            <TableHead>{t('deadlines.table.due')}</TableHead>
            <TableHead>{t('deadlines.table.grace')}</TableHead>
            <TableHead>{t('deadlines.table.assigned')}</TableHead>
            <TableHead>{t('deadlines.table.status')}</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                {t('deadlines.empty')}
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
                          ? t('deadlines.daysOverdue', { count: Math.abs(days) })
                          : days === 0
                            ? t('deadlines.dueToday')
                            : t('deadlines.daysLeft', { count: days })}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.graceDate ? formatDeadlineDate(d.graceDate) : t('yesNo.dash', { ns: 'common' })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.assignedTo.fullName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="normal-case">
                      {deadlineStatusLabel(d.status)}
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
                          {d.status === 'pending' ? t('deadlines.start') : t('deadlines.complete')}
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
