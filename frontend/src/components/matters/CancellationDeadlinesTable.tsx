import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CancellationDeadline } from '@/features/matters/cancellation-matter'

type CancellationDeadlinesTableProps = {
  deadlines: CancellationDeadline[]
}

function formatDate(value: string): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function CancellationDeadlinesTable({
  deadlines,
}: CancellationDeadlinesTableProps) {
  const { t } = useTranslation('matters')

  if (deadlines.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>{t('cancellationView.deadlines.date')}</TableHead>
            <TableHead>{t('cancellationView.deadlines.deadline')}</TableHead>
            <TableHead>{t('cancellationView.deadlines.regarding')}</TableHead>
            <TableHead>{t('cancellationView.deadlines.details')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deadlines.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
              <TableCell className="text-sm">{formatDate(row.deadline)}</TableCell>
              <TableCell className="text-sm">{row.regarding}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.details?.trim() || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
