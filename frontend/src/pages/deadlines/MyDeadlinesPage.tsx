import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { DeadlineExplanationButton } from '@/features/deadlines/components/DeadlineExplanationButton'
import { DeadlineStatusButton } from '@/features/deadlines/components/DeadlineStatusButton'
import { useMyDeadlines, useMyTodayDeadlineCount } from '@/features/deadlines/hooks/useDeadlines'
import type { MyDeadlinesTab } from '@/features/deadlines/types'
import {
  deadlineJurisdiction,
  deadlineStatusLabel,
  deadlineUrgency,
  formatDeadlineDate,
  jurisdictionLabel,
  URGENCY_ROW_CLASS,
} from '@/features/deadlines/utils'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

const TAB_IDS: MyDeadlinesTab[] = ['all', 'pending', 'in_progress', 'overdue', 'completed']

export function MyDeadlinesPage() {
  const { t } = useTranslation('deadlines')
  const { user } = useAuth()
  const isPortalClient = user?.roles.includes('portal_client') ?? false
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
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('myDeadlines.title')}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          {isPortalClient
            ? t('myDeadlines.descriptionPortal')
            : t('myDeadlines.descriptionStaff')}
        </p>
      </div>

      <DueTodayAlert count={todayCount} />

      <div className="flex flex-wrap gap-2">
        {TAB_IDS.map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {t(`myDeadlines.tabs.${id}`)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('myDeadlines.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('myDeadlines.error')}</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('myDeadlines.table.matter')}</TableHead>
                <TableHead>{t('myDeadlines.table.type')}</TableHead>
                <TableHead>{t('myDeadlines.table.jurisdiction')}</TableHead>
                <TableHead>{t('myDeadlines.table.dueDate')}</TableHead>
                <TableHead>{t('myDeadlines.table.grace')}</TableHead>
                <TableHead>{t('myDeadlines.table.status')}</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    {t('myDeadlines.empty')}
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
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/matters/${d.matterId}/deadlines`}
                            className="font-medium text-primary hover:underline"
                          >
                            {d.matter?.title ?? d.title}
                          </Link>
                          <DeadlineExplanationButton deadlineId={d.id} />
                        </div>
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
                {t('myDeadlines.previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data?.nextCursor || isFetching}
                onClick={handleNextPage}
              >
                {t('myDeadlines.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
