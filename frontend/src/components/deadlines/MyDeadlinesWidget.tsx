import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock } from 'lucide-react'
import { DueTodayBadge } from '@/components/deadlines/DueTodayBadge'
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
import { useMyDeadlines } from '@/features/deadlines/hooks/useDeadlines'
import {
  deadlineStatusLabel,
  deadlineUrgency,
  formatDeadlineDate,
  URGENCY_DOT_CLASS,
} from '@/features/deadlines/utils'
import { ReportPanel } from '@/components/reports/report-ui'
import { cn } from '@/lib/utils'

export function MyDeadlinesWidget() {
  const { t } = useTranslation('deadlines')
  const { data, isLoading, isError } = useMyDeadlines({ limit: 8 })
  const deadlines = data?.items ?? []

  return (
    <ReportPanel className="p-0 overflow-hidden">
      <div className="flex flex-row items-center justify-between gap-3 p-5 md:px-6">
        <h3 className="flex items-center gap-2.5 font-serif text-lg text-brand-green">
          <CalendarClock className="size-5 text-primary" />
          {t('widget.title')}
        </h3>
        <Link to="/deadlines/my" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-xs font-semibold' })}>
          {t('widget.viewAll')}
        </Link>
      </div>
      <div className="px-0">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground italic">{t('widget.loading')}</div>
        ) : isError ? (
          <div className="p-10 text-center text-sm text-destructive font-medium">{t('widget.error')}</div>
        ) : deadlines.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground italic">{t('widget.empty')}</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 px-6 text-[10px] uppercase tracking-widest font-bold">
                  {t('widget.table.matterClient')}
                </TableHead>
                <TableHead className="py-3 px-6 text-[10px] uppercase tracking-widest font-bold">
                  {t('widget.table.deadline')}
                </TableHead>
                <TableHead className="py-3 px-6 text-[10px] uppercase tracking-widest font-bold">
                  {t('widget.table.dueDateStatus')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((d) => {
                const urgency = deadlineUrgency(d.dueDate, d.status)
                return (
                  <TableRow
                    key={d.id}
                    className={cn(
                      'group transition-colors',
                      urgency === 'overdue' && 'bg-destructive/[0.03] hover:bg-destructive/[0.06]',
                      urgency === 'today' && 'bg-primary/[0.03] hover:bg-primary/[0.06]',
                      urgency === 'urgent' && 'bg-amber-500/[0.02] hover:bg-amber-500/[0.05]',
                    )}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        {d.matter ? (
                          <Link
                            to={`/matters/${d.matter.id}/overview`}
                            className="font-semibold text-brand-green hover:text-primary transition-colors"
                          >
                            {d.matter.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {d.matter?.client ? (
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                            {clientDisplayName(d.matter.client)}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn('size-2 shrink-0 rounded-full shadow-sm', URGENCY_DOT_CLASS[urgency])}
                        />
                        <span className="text-sm font-medium text-foreground">{d.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right sm:text-left">
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">{formatDeadlineDate(d.dueDate)}</span>
                          {urgency === 'today' && <DueTodayBadge />}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-5 px-2 text-[10px] font-bold uppercase tracking-wide border-transparent bg-muted/40',
                            urgency === 'today' && 'bg-primary/10 text-primary border-primary/20',
                            urgency === 'overdue' && 'bg-destructive/10 text-destructive border-destructive/20'
                          )}
                        >
                          {urgency === 'today' ? t('urgency.dueToday') : deadlineStatusLabel(d.status)}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </ReportPanel>
  )
}
