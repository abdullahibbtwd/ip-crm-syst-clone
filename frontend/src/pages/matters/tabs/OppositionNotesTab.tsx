import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  readOppositionFields,
  type OppositionNote,
} from '@/features/matters/opposition-matter'
import { formatDocumentDate } from '@/features/documents/utils'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import type { MatterTabContext } from '../MatterLayout'

function nextNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export function OppositionNotesTab() {
  const { t } = useTranslation(['matters', 'common'])
  const { user } = useAuth()
  const { matter } = useOutletContext<MatterTabContext>()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const notes = readOppositionFields(matter).notes

  const [regarding, setRegarding] = useState('')
  const [details, setDetails] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const persistNotes = async (nextNotes: OppositionNote[]) => {
    await updateMatter.mutateAsync({
      attributes: {
        ...attrs,
        oppositionNotes: nextNotes,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canUpdate) return
    setError(null)
    if (!regarding.trim()) {
      setError(t('oppositionView.notes.regardingRequired'))
      return
    }

    try {
      if (editingId) {
        const next = notes.map((n) =>
          n.id === editingId
            ? { ...n, regarding: regarding.trim(), details: details.trim() }
            : n,
        )
        await persistNotes(next)
        setEditingId(null)
      } else {
        const entry: OppositionNote = {
          id: nextNoteId(),
          createdAt: new Date().toISOString(),
          regarding: regarding.trim(),
          details: details.trim(),
          userName: user?.fullName ?? undefined,
        }
        await persistNotes([entry, ...notes])
      }
      setRegarding('')
      setDetails('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.notes.saveFailed')))
    }
  }

  const startEdit = (note: OppositionNote) => {
    setEditingId(note.id)
    setRegarding(note.regarding)
    setDetails(note.details)
    setError(null)
  }

  const handleDelete = async (id: string) => {
    if (!canUpdate) return
    setError(null)
    try {
      await persistNotes(notes.filter((n) => n.id !== id))
      if (editingId === id) {
        setEditingId(null)
        setRegarding('')
        setDetails('')
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.notes.saveFailed')))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('oppositionView.notes.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('oppositionView.notes.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('oppositionView.notes.date')}</TableHead>
                  <TableHead>{t('oppositionView.notes.regarding')}</TableHead>
                  <TableHead>{t('oppositionView.notes.details')}</TableHead>
                  {canUpdate ? <TableHead className="w-20" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>{formatDocumentDate(note.createdAt)}</TableCell>
                    <TableCell>{note.regarding}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{note.details || '—'}</TableCell>
                    {canUpdate ? (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(note)}
                            aria-label={t('oppositionView.notes.editAria')}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => void handleDelete(note.id)}
                            aria-label={t('oppositionView.notes.deleteAria')}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {canUpdate ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <label className="block space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t('oppositionView.notes.regarding')}
                </span>
                <Input value={regarding} onChange={(e) => setRegarding(e.target.value)} />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {t('oppositionView.notes.details')}
                </span>
                <Textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} />
              </label>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null)
                      setRegarding('')
                      setDetails('')
                      setError(null)
                    }}
                  >
                    {t('oppositionView.cancel')}
                  </Button>
                ) : null}
                <Button type="submit" disabled={updateMatter.isPending}>
                  {updateMatter.isPending
                    ? t('common:loading.saving')
                    : editingId
                      ? t('oppositionView.save')
                      : t('oppositionView.notes.submit')}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
