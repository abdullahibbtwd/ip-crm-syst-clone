import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DEADLINE_STATUS_LABELS,
  deadlineUrgency,
  formatDeadlineDate,
  URGENCY_DOT_CLASS,
} from '@/features/deadlines/utils'
import { cn } from '@/lib/utils'

export function MyDeadlinesWidget() {
  const { data, isLoading, isError } = useMyDeadlines({ limit: 8 })
  const deadlines = data?.items ?? []

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4" />
          My deadlines
        </CardTitle>
        <Link to="/deadlines/my" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          View all
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading deadlines…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load deadlines.</p>
        ) : deadlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming deadlines assigned to you.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deadline</TableHead>
                <TableHead>Matter</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((d) => {
                const urgency = deadlineUrgency(d.dueDate, d.status)
                return (
                  <TableRow
                    key={d.id}
                    className={cn(
                      urgency === 'overdue' && 'bg-destructive/5',
                      urgency === 'urgent' && 'bg-amber-500/5',
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn('size-2 shrink-0 rounded-full', URGENCY_DOT_CLASS[urgency])}
                        />
                        <span className="font-medium">{d.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.matter ? (
                        <Link
                          to={`/matters/${d.matter.id}/overview`}
                          className="text-primary hover:underline"
                        >
                          {d.matter.title}
                        </Link>
                      ) : (
                        '-'
                      )}
                      {d.matter?.client ? (
                        <p className="text-xs text-muted-foreground">
                          {clientDisplayName(d.matter.client)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDeadlineDate(d.dueDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="normal-case">
                        {DEADLINE_STATUS_LABELS[d.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
