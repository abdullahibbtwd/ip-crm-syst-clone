import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  useCreatePartnerInstruction,
  useMatterPartnerInstructions,
  usePartners,
  useTransitionPartnerInstruction,
} from '@/features/partners/hooks/usePartners'
import type {
  PartnerInstruction,
  PartnerInstructionStatus,
} from '@/features/partners/types'
import { getApiErrorMessage } from '@/lib/api-client'
import type { MatterTabContext } from '../MatterLayout'

const NEXT_STATUS: Record<PartnerInstructionStatus, PartnerInstructionStatus | null> = {
  draft: 'sent',
  sent: 'acknowledged',
  acknowledged: 'complete',
  complete: null,
}

const TRANSITION_LABEL_KEY: Partial<Record<PartnerInstructionStatus, string>> = {
  sent: 'actions.send',
  acknowledged: 'actions.acknowledge',
  complete: 'actions.complete',
}

const STATUS_VARIANT: Record<
  PartnerInstructionStatus,
  'default' | 'secondary' | 'outline' | 'info' | 'success' | 'warning'
> = {
  draft: 'secondary',
  sent: 'info',
  acknowledged: 'warning',
  complete: 'success',
}

function CreateInstructionDrawer({
  open,
  onClose,
  matterId,
}: {
  open: boolean
  onClose: () => void
  matterId: string
}) {
  const { t } = useTranslation('partners')
  const { data: partners } = usePartners({ activeOnly: true })
  const createInstruction = useCreatePartnerInstruction(matterId)

  const [partnerId, setPartnerId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPartnerId(partners?.[0]?.id ?? '')
    setTitle('')
    setBody('')
    setError(null)
  }, [open, partners])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!partnerId || !title.trim()) {
      setError(t('instructions.errors.required'))
      return
    }
    try {
      await createInstruction.mutateAsync({
        partnerId,
        title: title.trim(),
        body: body.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('instructions.errors.saveFailed')))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('instructions.drawer.createTitle')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>{t('instructions.drawer.partner')}</Label>
          <Select value={partnerId} onValueChange={(v) => setPartnerId(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder={t('instructions.drawer.partnerPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {(partners ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.company ? ` · ${p.company}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="instr-title">{t('instructions.drawer.title')}</Label>
          <Input
            id="instr-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instr-body">{t('instructions.drawer.body')}</Label>
          <Textarea
            id="instr-body"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('instructions.drawer.cancel')}
          </Button>
          <Button type="submit" disabled={createInstruction.isPending}>
            {t('instructions.drawer.create')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function TransitionButton({
  instruction,
  matterId,
}: {
  instruction: PartnerInstruction
  matterId: string
}) {
  const { t } = useTranslation('partners')
  const transition = useTransitionPartnerInstruction(matterId)
  const next = NEXT_STATUS[instruction.status]
  if (!next) return null

  return (
    <PermissionGate resource="partner" action="update">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={transition.isPending}
        onClick={() => transition.mutate({ id: instruction.id, status: next })}
      >
        {t(TRANSITION_LABEL_KEY[next] ?? 'actions.send')}
      </Button>
    </PermissionGate>
  )
}

export function MatterInstructionsTab() {
  const { t } = useTranslation('partners')
  const { matterId } = useOutletContext<MatterTabContext>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: instructions, isLoading, isError } = useMatterPartnerInstructions(matterId)

  return (
    <PermissionGate
      resource="partner"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">{t('instructions.noPermission')}</p>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">{t('instructions.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('instructions.subtitle')}</p>
          </div>
          <PermissionGate resource="partner" action="create">
            <Button size="sm" onClick={() => setDrawerOpen(true)}>
              <Plus className="size-4" />
              {t('instructions.newDraft')}
            </Button>
          </PermissionGate>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t('instructions.loading')}</p>
        )}
        {isError && (
          <p className="text-sm text-destructive">{t('instructions.loadError')}</p>
        )}

        {instructions && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('instructions.columns.title')}</TableHead>
                <TableHead>{t('instructions.columns.partner')}</TableHead>
                <TableHead>{t('instructions.columns.status')}</TableHead>
                <TableHead>{t('instructions.columns.created')}</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('instructions.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                instructions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      {row.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {row.body}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{row.partner.name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>
                        {t(`instructions.status.${row.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <TransitionButton instruction={row} matterId={matterId} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <CreateInstructionDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          matterId={matterId}
        />
      </div>
    </PermissionGate>
  )
}
