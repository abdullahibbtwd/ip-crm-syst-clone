import { useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
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
import {
  useCreateRateCard,
  useRateCards,
  useUpdateRateCard,
} from '@/features/billing/hooks/useBilling'
import type { BillingRateRole, RateCard } from '@/features/billing/types'
import {
  BILLING_RATE_ROLES,
  BILLING_RATE_ROLE_LABELS,
  formatBillingDate,
  formatMoney,
} from '@/features/billing/utils'
import { useClients } from '@/features/crm/hooks/useClients'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import { getApiErrorMessage } from '@/lib/api-client'

const MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]

function clientLabel(card: RateCard) {
  if (!card.client) return 'Firm-wide'
  return (
    card.client.companyName ||
    [card.client.firstName, card.client.lastName].filter(Boolean).join(' ') ||
    card.client.internalCode ||
    'Client'
  )
}

function RateCardDrawer({
  open,
  onClose,
  card,
}: {
  open: boolean
  onClose: () => void
  card: RateCard | null
}) {
  const isEdit = Boolean(card)
  const createRateCard = useCreateRateCard()
  const updateRateCard = useUpdateRateCard()
  const { data: clientsData } = useClients({ limit: 100, status: 'active' })
  const clients = clientsData?.items ?? []

  const [role, setRole] = useState<BillingRateRole>('ip_attorney')
  const [matterType, setMatterType] = useState<string>('any')
  const [clientId, setClientId] = useState<string>('firm')
  const [hourlyRate, setHourlyRate] = useState('150')
  const [internalCostPerHour, setInternalCostPerHour] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [effectiveTo, setEffectiveTo] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (card) {
      setRole(card.role)
      setMatterType(card.matterType ?? 'any')
      setClientId(card.clientId ?? 'firm')
      setHourlyRate(String(card.hourlyRate))
      setInternalCostPerHour(
        card.internalCostPerHour != null ? String(card.internalCostPerHour) : '',
      )
      setEffectiveFrom(card.effectiveFrom.slice(0, 10))
      setEffectiveTo(card.effectiveTo?.slice(0, 10) ?? '')
    } else {
      setRole('ip_attorney')
      setMatterType('any')
      setClientId('firm')
      setHourlyRate('150')
      setInternalCostPerHour('')
      setEffectiveFrom(new Date().toISOString().slice(0, 10))
      setEffectiveTo('')
    }
    setError(null)
  }, [open, card])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const rate = Number(hourlyRate)
    if (!rate || rate < 0) {
      setError('Enter a valid hourly rate')
      return
    }
    const parsedInternalCost =
      internalCostPerHour.trim() === '' ? undefined : Number(internalCostPerHour)
    if (
      parsedInternalCost !== undefined &&
      (Number.isNaN(parsedInternalCost) || parsedInternalCost < 0)
    ) {
      setError('Enter a valid internal cost or leave blank')
      return
    }

    try {
      if (isEdit && card) {
        await updateRateCard.mutateAsync({
          id: card.id,
          data: {
            hourlyRate: rate,
            internalCostPerHour:
              internalCostPerHour.trim() === '' ? null : parsedInternalCost,
            effectiveTo: effectiveTo || undefined,
          },
        })
      } else {
        await createRateCard.mutateAsync({
          role,
          matterType: matterType === 'any' ? undefined : matterType,
          clientId: clientId === 'firm' ? undefined : clientId,
          hourlyRate: rate,
          internalCostPerHour: parsedInternalCost,
          effectiveFrom,
          effectiveTo: effectiveTo || undefined,
        })
      }
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save rate card'))
    }
  }

  const pending = createRateCard.isPending || updateRateCard.isPending

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit rate card' : 'New rate card'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {!isEdit && (
          <>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as BillingRateRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_RATE_ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {BILLING_RATE_ROLE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Matter type</Label>
              <Select value={matterType} onValueChange={(v) => setMatterType(v ?? 'any')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any matter type</SelectItem>
                  {MATTER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {MATTER_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client override</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? 'firm')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firm">Firm-wide default</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName ||
                        [client.firstName, client.lastName].filter(Boolean).join(' ') ||
                        client.internalCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective-from">Effective from</Label>
              <Input
                id="effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="hourly-rate">Billable rate (EUR/hr)</Label>
          <Input
            id="hourly-rate"
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="internal-cost">Internal cost (EUR/hr)</Label>
          <Input
            id="internal-cost"
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional - for margin reporting"
            value={internalCostPerHour}
            onChange={(e) => setInternalCostPerHour(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Mirrors billing rate resolution (client → firm + matter type → firm default). Snapshotted
            on new time entries as cost_snapshot.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="effective-to">Effective to (optional)</Label>
          <Input
            id="effective-to"
            type="date"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {isEdit ? 'Save changes' : 'Create rate card'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export function RateCardsPage() {
  const { data: cards, isLoading, isError } = useRateCards()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<RateCard | null>(null)

  return (
    <PermissionGate
      resource="billing"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">You do not have permission to view rate cards.</p>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-foreground md:text-3xl">Rate cards</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Firm price list by role, matter type, and optional client override. Billable rate is
              used when logging time; optional internal cost drives true-margin profitability.
            </p>
          </div>
          <PermissionGate resource="billing" action="create">
            <Button
              type="button"
              onClick={() => {
                setEditingCard(null)
                setDrawerOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" />
              New rate card
            </Button>
          </PermissionGate>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading rate cards…</p>}
        {isError && <p className="text-sm text-destructive">Failed to load rate cards.</p>}

        {cards && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Matter type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Internal cost</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No rate cards yet.
                  </TableCell>
                </TableRow>
              ) : (
                cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>{BILLING_RATE_ROLE_LABELS[card.role]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.matterType ? MATTER_TYPE_LABELS[card.matterType as MatterType] : 'Any'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={card.clientId ? 'info' : 'secondary'}>
                        {clientLabel(card)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(card.hourlyRate, card.currency)}/hr
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {card.internalCostPerHour != null
                        ? `${formatMoney(card.internalCostPerHour, card.currency)}/hr`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatBillingDate(card.effectiveFrom)}
                      {card.effectiveTo ? ` → ${formatBillingDate(card.effectiveTo)}` : ''}
                    </TableCell>
                    <TableCell>
                      <PermissionGate resource="billing" action="update">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingCard(card)
                            setDrawerOpen(true)
                          }}
                          aria-label="Edit rate card"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <RateCardDrawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false)
            setEditingCard(null)
          }}
          card={editingCard}
        />
      </div>
    </PermissionGate>
  )
}
