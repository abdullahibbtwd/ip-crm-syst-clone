import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Send } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateApproval,
  useMatterApprovals,
  useSubmitApproval,
} from '@/features/approvals/hooks/useApprovals'
import type { ClientApprovalRequest, ClientApprovalStatus } from '@/features/approvals/types'
import { getApiErrorMessage } from '@/lib/api-client'
import type { MatterTabContext } from '../MatterLayout'

const STATUS_VARIANT: Record<
  ClientApprovalStatus,
  'default' | 'secondary' | 'outline' | 'info' | 'success' | 'warning'
> = {
  draft: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'outline',
}

function CreateApprovalDrawer({
  open,
  onClose,
  matterId,
}: {
  open: boolean
  onClose: () => void
  matterId: string
}) {
  const { t } = useTranslation('matters')
  const createApproval = useCreateApproval(matterId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setDueDate('')
    setError(null)
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError(t('approvals.errors.titleRequired'))
      return
    }
    try {
      await createApproval.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('approvals.errors.saveFailed')))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('approvals.drawer.createTitle')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="approval-title">{t('approvals.drawer.title')}</Label>
          <Input
            id="approval-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="approval-description">{t('approvals.drawer.description')}</Label>
          <Textarea
            id="approval-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="approval-due">{t('approvals.drawer.dueDate')}</Label>
          <Input
            id="approval-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('approvals.drawer.cancel')}
          </Button>
          <Button type="submit" disabled={createApproval.isPending}>
            {t('approvals.drawer.create')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function SubmitButton({
  approval,
  matterId,
}: {
  approval: ClientApprovalRequest
  matterId: string
}) {
  const { t } = useTranslation('matters')
  const submit = useSubmitApproval(matterId)
  if (approval.status !== 'draft') return null

  return (
    <PermissionGate resource="approval" action="update">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={submit.isPending}
        onClick={() => submit.mutate(approval.id)}
      >
        <Send className="size-3.5" />
        {t('approvals.actions.submit')}
      </Button>
    </PermissionGate>
  )
}

export function MatterApprovalsTab() {
  const { t } = useTranslation('matters')
  const { matterId } = useOutletContext<MatterTabContext>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: approvals, isLoading, isError } = useMatterApprovals(matterId)

  return (
    <PermissionGate
      resource="approval"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">{t('approvals.noPermission')}</p>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">{t('approvals.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('approvals.subtitle')}</p>
          </div>
          <PermissionGate resource="approval" action="create">
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="size-4" />
              {t('approvals.newDraft')}
            </Button>
          </PermissionGate>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t('approvals.loading')}</p>
        )}
        {isError && (
          <p className="text-sm text-destructive">{t('approvals.loadError')}</p>
        )}

        {approvals && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('approvals.columns.title')}</TableHead>
                <TableHead>{t('approvals.columns.status')}</TableHead>
                <TableHead>{t('approvals.columns.dueDate')}</TableHead>
                <TableHead>{t('approvals.columns.created')}</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('approvals.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                approvals.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      {row.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {row.description}
                        </p>
                      ) : null}
                      {row.decisionNote ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('approvals.decisionNote', { note: row.decisionNote })}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>
                        {t(`approvals.status.${row.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.dueDate
                        ? new Date(row.dueDate).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <SubmitButton approval={row} matterId={matterId} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <CreateApprovalDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          matterId={matterId}
        />
      </div>
    </PermissionGate>
  )
}
