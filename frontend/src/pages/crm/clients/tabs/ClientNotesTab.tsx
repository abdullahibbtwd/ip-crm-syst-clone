import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useClientDeadlines,
  useClientNotes,
  useCreateClientNote,
  useDeleteClientNote,
} from '@/features/crm/hooks/useClients'
import {
  daysUntilDue,
  deadlineStatusLabel,
  DEADLINE_STATUS_VARIANT,
  formatDeadlineDate,
  isDeadlineOpen,
  URGENCY_ROW_CLASS,
  deadlineUrgency,
} from '@/features/deadlines/utils'
import { DeadlineExplanationButton } from '@/features/deadlines/components/DeadlineExplanationButton'
import type { Deadline } from '@/features/deadlines/types'
import type { MatterType } from '@/features/matters/types'
import { matterTypeLabel } from '@/features/matters/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { ClientTabContext } from '../ClientLayout'

function remainingLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  dueDate: string,
): string {
  const days = daysUntilDue(dueDate)
  if (days < 0) return t('clientNotes.overdueBy', { count: Math.abs(days) })
  if (days === 0) return t('clientNotes.dueToday')
  return t('clientNotes.remaining', { count: days })
}

export function ClientNotesTab() {
  const { t } = useTranslation(['crm', 'common', 'matters'])
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data: notes, isLoading: notesLoading, isError: notesError } = useClientNotes(clientId)
  const { data: deadlines, isLoading: deadlinesLoading, isError: deadlinesError } =
    useClientDeadlines(clientId)
  const createNote = useCreateClientNote(clientId)
  const deleteNote = useDeleteClientNote(clientId)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const groupedDeadlines = useMemo(() => {
    const open = (deadlines ?? []).filter((row) => isDeadlineOpen(row.status))
    const trademark = open.filter((row) => row.matter?.matterType === 'trademark')
    const remaining = open.filter((row) => row.matter?.matterType !== 'trademark')
    return { trademark, remaining, open }
  }, [deadlines])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = body.trim()
    if (!next) return
    setError(null)
    try {
      await createNote.mutateAsync(next)
      setBody('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('clientNotes.error')))
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="font-medium">{t('clientNotes.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('clientNotes.description')}</p>
        </div>

        <PermissionGate resource="client" action="update">
          <form onSubmit={handleAdd} className="space-y-3">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder={t('clientNotes.placeholder')}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" size="sm" disabled={createNote.isPending || !body.trim()}>
              <Plus className="size-4" />
              {createNote.isPending ? t('clientNotes.saving') : t('clientNotes.add')}
            </Button>
          </form>
        </PermissionGate>

        {notesLoading ? (
          <p className="text-sm text-muted-foreground">{t('clientNotes.loading')}</p>
        ) : notesError ? (
          <p className="text-sm text-destructive">{t('clientNotes.errorLoad')}</p>
        ) : (notes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('clientNotes.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {(notes ?? []).map((note) => (
              <li key={note.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                  <PermissionGate resource="client" action="update">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-destructive"
                      disabled={deleteNote.isPending}
                      onClick={() => deleteNote.mutate(note.id)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">{t('clientNotes.delete')}</span>
                    </Button>
                  </PermissionGate>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {note.createdBy?.fullName ?? t('clientNotes.unknownAuthor')}
                  {' · '}
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-medium">{t('clientNotes.deadlinesTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('clientNotes.deadlinesDescription')}
          </p>
        </div>

        {deadlinesLoading ? (
          <p className="text-sm text-muted-foreground">{t('clientNotes.deadlinesLoading')}</p>
        ) : deadlinesError ? (
          <p className="text-sm text-destructive">{t('clientNotes.deadlinesError')}</p>
        ) : groupedDeadlines.open.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('clientNotes.deadlinesEmpty')}</p>
        ) : (
          <div className="space-y-6">
            <DeadlineGroup
              title={t('clientNotes.groupTrademark')}
              rows={groupedDeadlines.trademark}
              remainingLabel={(due) => remainingLabel(t, due)}
            />
            <DeadlineGroup
              title={t('clientNotes.groupRemaining')}
              rows={groupedDeadlines.remaining}
              remainingLabel={(due) => remainingLabel(t, due)}
            />
          </div>
        )}
      </section>
    </div>
  )
}

function DeadlineGroup({
  title,
  rows,
  remainingLabel: remaining,
}: {
  title: string
  rows: Deadline[]
  remainingLabel: (dueDate: string) => string
}) {
  const { t } = useTranslation(['crm', 'common'])

  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('clientNotes.columns.file')}</TableHead>
            <TableHead>{t('clientNotes.columns.deadline')}</TableHead>
            <TableHead>{t('clientNotes.columns.due')}</TableHead>
            <TableHead>{t('clientNotes.columns.remaining')}</TableHead>
            <TableHead>{t('clientNotes.columns.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(URGENCY_ROW_CLASS[deadlineUrgency(row.dueDate, row.status)])}
            >
              <TableCell>
                {row.matter ? (
                  <div>
                    <Link
                      to={`/matters/${row.matter.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.matter.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {matterTypeLabel(row.matter.matterType as MatterType)}
                    </p>
                  </div>
                ) : (
                  t('common:yesNo.dash')
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span>{row.title}</span>
                  <DeadlineExplanationButton deadlineId={row.id} />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDeadlineDate(row.dueDate)}
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {remaining(row.dueDate)}
              </TableCell>
              <TableCell>
                <Badge variant={DEADLINE_STATUS_VARIANT[row.status]}>
                  {deadlineStatusLabel(row.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
