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
  daysUntilDue,
  DEADLINE_STATUS_VARIANT,
  formatDeadlineDate,
  isDeadlineOpen,
  jurisdictionLabel,
  MATTER_CLOSED_DEADLINE_ROW_CLASS,
  MATTER_OPEN_DEADLINE_ROW_CLASS,
} from '@/features/deadlines/utils'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { cn } from '@/lib/utils'
import { DeadlineExplanationButton } from '@/features/deadlines/components/DeadlineExplanationButton'
import type { MatterTabContext } from '../MatterLayout'

function sortMatterDeadlines<T extends { dueDate: string; status: DeadlineStatus }>(
  deadlines: T[],
): T[] {
  return [...deadlines].sort((a, b) => {
    const aOpen = isDeadlineOpen(a.status)
    const bOpen = isDeadlineOpen(b.status)
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })
}

export function MatterDeadlinesTab() {
  const { t } = useTranslation(['matters', 'common'])
  const { matterId } = useOutletContext<MatterTabContext>()
  const { data: deadlines, isLoading, isError } = useMatterDeadlines(matterId)
  const updateStatus = useUpdateDeadlineStatus(matterId)

  const rows = useMemo(
    () => sortMatterDeadlines(deadlines ?? []),
    [deadlines],
  )

  const openCount = rows.filter((d) => isDeadlineOpen(d.status)).length
  const overdueCount = rows.filter(
    (d) => isDeadlineOpen(d.status) && daysUntilDue(d.dueDate) < 0,
  ).length

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('deadlines.loading')}</p>
  if (isError) return <p className="text-sm text-destructive">{t('deadlines.error')}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-medium">{t('deadlines.title')}</h2>
        {rows.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <div
              className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-4 py-2 text-center"
              aria-label={t('deadlines.summary.open')}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive/90">
                {t('deadlines.summary.open')}
              </p>
              <p className="text-2xl font-bold tabular-nums text-destructive">{openCount}</p>
            </div>
            {overdueCount > 0 ? (
              <div
                className="rounded-lg border-2 border-destructive bg-destructive px-4 py-2 text-center text-white"
                aria-label={t('deadlines.summary.overdue')}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
                  {t('deadlines.summary.overdue')}
                </p>
                <p className="text-2xl font-bold tabular-nums">{overdueCount}</p>
              </div>
            ) : null}
          </div>
        ) : null}
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
              const open = isDeadlineOpen(d.status)
              const days = daysUntilDue(d.dueDate)
              const daysLabel =
                days < 0
                  ? t('deadlines.daysOverdue', { count: Math.abs(days) })
                  : days === 0
                    ? t('deadlines.dueToday')
                    : t('deadlines.daysLeft', { count: days })

              return (
                <TableRow
                  key={d.id}
                  className={cn(
                    open ? MATTER_OPEN_DEADLINE_ROW_CLASS : MATTER_CLOSED_DEADLINE_ROW_CLASS,
                  )}
                >
                  <TableCell className={cn('font-medium', open && 'text-destructive')}>
                    <span className="inline-flex items-center gap-1">
                      {d.title}
                      <DeadlineExplanationButton deadlineId={d.id} />
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jurisdictionLabel(deadlineJurisdiction(d))}
                  </TableCell>
                  <TableCell>
                    <div
                      className={cn(
                        'text-base font-bold tabular-nums',
                        open ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {formatDeadlineDate(d.dueDate)}
                    </div>
                    {open ? (
                      <Badge
                        variant="destructive"
                        className="mt-1 normal-case text-xs font-bold tabular-nums"
                      >
                        {daysLabel}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.graceDate ? formatDeadlineDate(d.graceDate) : t('yesNo.dash', { ns: 'common' })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.assignedTo.fullName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={DEADLINE_STATUS_VARIANT[d.status]}
                      className="normal-case"
                    >
                      {deadlineStatusLabel(d.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate resource="deadline" action="update">
                      {open ? (
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
