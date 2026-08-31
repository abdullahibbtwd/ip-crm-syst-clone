import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DeletionDeadline } from '@/features/matters/deletion-matter'

type DeletionDeadlinesTableProps = {
  deadlines: DeletionDeadline[]
  title?: string
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

export function DeletionDeadlinesTable({
  deadlines,
  title,
}: DeletionDeadlinesTableProps) {
  const { t } = useTranslation('matters')

  if (deadlines.length === 0) return null

  return (
    <div className="space-y-2">
      {title ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>{t('deletionView.deadlines.date')}</TableHead>
              <TableHead>{t('deletionView.deadlines.deadline')}</TableHead>
              <TableHead>{t('deletionView.deadlines.regarding')}</TableHead>
              <TableHead>{t('deletionView.deadlines.details')}</TableHead>
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
    </div>
  )
}
