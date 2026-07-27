import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { useAuth } from '@/features/auth/AuthProvider'
import { Drawer } from '@/components/crm/Drawer'
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
  useBillingSummary,
  useCreateFixedFee,
  useCreateTimeEntry,
  useDeleteFixedFee,
  useDeleteTimeEntry,
  useMatterFixedFees,
  useMatterTimeEntries,
  useResolveRate,
  useUpdateFixedFee,
  useUpdateTimeEntry,
} from '@/features/billing/hooks/useBilling'
import type { FixedFee, FixedFeeCategory, TimeEntry } from '@/features/billing/types'
import { SummaryBar } from '@/features/billing/components/SummaryBar'
import { MatterInvoicesSection } from '@/features/invoices/components/MatterInvoicesSection'
import { InvoiceListTable } from '@/features/invoices/components/InvoiceListTable'
import { usePortalInvoices } from '@/features/invoices/hooks/useInvoices'
import type { Invoice } from '@/features/invoices/types'
import {
  FIXED_FEE_CATEGORIES,
  fixedFeeCategoryLabel,
  formatBillingDate,
  formatHours,
  formatMoney,
  previewTimeAmount,
} from '@/features/billing/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import type { MatterTabContext } from '../MatterLayout'

export function MatterBillingTab() {
  const { user } = useAuth()
  const isPortalClient = user?.roles.includes('portal_client') ?? false

  if (isPortalClient) {
    return <PortalBillingView />
  }

  return <InternalBillingView />
}

/**
 * Client-facing billing view. Portal clients must not see internal time
 * entries, hourly rates, or attorney workload (spec: "protected").
 */
function PortalBillingView() {
  const { t } = useTranslation(['matters', 'common'])
  const { matterId } = useOutletContext<MatterTabContext>()
  const { data: invoices, isLoading, isError } = usePortalInvoices()
  const matterInvoices = (invoices ?? []).filter(
    (invoice: Invoice) => invoice.matterId === matterId,
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">{t('matters:billing.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('matters:billing.portalDescription')}</p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('matters:billing.loadingInvoices')}</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">{t('matters:billing.loadInvoicesFailed')}</p>
      )}
      {!isLoading && !isError && (
        <InvoiceListTable invoices={matterInvoices} portal />
      )}
    </div>
  )
}

function InternalBillingView() {
  const { t } = useTranslation(['matters', 'finance', 'common'])
  const { matterId } = useOutletContext<MatterTabContext>()
  const { confirm } = useAppAlert()
  const { data: summary, isLoading: summaryLoading } = useBillingSummary(matterId)
  const {
    data: timeEntries,
    isLoading: entriesLoading,
    isError: entriesError,
  } = useMatterTimeEntries(matterId)
  const {
    data: fixedFees,
    isLoading: feesLoading,
    isError: feesError,
  } = useMatterFixedFees(matterId)

  const [timeDrawerOpen, setTimeDrawerOpen] = useState(false)
  const [feeDrawerOpen, setFeeDrawerOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [editingFee, setEditingFee] = useState<FixedFee | null>(null)
  const deleteEntry = useDeleteTimeEntry(matterId)
  const deleteFee = useDeleteFixedFee(matterId)
  const canManageBilling = usePermission('billing', 'update')
  const tableColSpan = canManageBilling ? 8 : 7
  const feeTableColSpan = canManageBilling ? 6 : 5

  const isLoading = summaryLoading || entriesLoading || feesLoading
  const isError = entriesError || feesError

  if (isLoading && !timeEntries && !fixedFees) {
    return <p className="text-sm text-muted-foreground">{t('matters:billing.loading')}</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">{t('matters:billing.error')}</p>
  }

  const summaryData = summary ?? {
    matterId,
    totalHours: 0,
    totalBillableHours: 0,
    totalBillableAmount: 0,
    totalFixedFees: 0,
    totalAmount: 0,
    unbilledAmount: 0,
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-medium">{t('matters:billing.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('matters:billing.description')}</p>
      </div>

      <SummaryBar
        totalHours={summaryData.totalHours}
        totalBillableHours={summaryData.totalBillableHours}
        totalBillableAmount={summaryData.totalBillableAmount}
        totalFixedFees={summaryData.totalFixedFees}
        totalAmount={summaryData.totalAmount}
        unbilledAmount={summaryData.unbilledAmount}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t('matters:billing.timeEntries')}</h3>
          <PermissionGate resource="billing" action="create">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingEntry(null)
                setTimeDrawerOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" />
              {t('matters:billing.addTime')}
            </Button>
          </PermissionGate>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('matters:billing.table.date')}</TableHead>
              <TableHead>{t('matters:billing.table.attorney')}</TableHead>
              <TableHead>{t('matters:billing.table.description')}</TableHead>
              <TableHead className="text-right">{t('matters:billing.table.hours')}</TableHead>
              <TableHead className="text-right">{t('matters:billing.table.rate')}</TableHead>
              <TableHead className="text-right">{t('matters:billing.table.amount')}</TableHead>
              <TableHead>{t('matters:billing.table.billable')}</TableHead>
              <PermissionGate resource="billing" action="update">
                <TableHead className="w-[88px]" />
              </PermissionGate>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(timeEntries ?? []).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tableColSpan}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t('matters:billing.emptyTime')}
                </TableCell>
              </TableRow>
            ) : (
              (timeEntries ?? []).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatBillingDate(entry.date)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.loggedBy.fullName}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="line-clamp-2">{entry.description}</span>
                    {entry.isBillable && entry.rateSnapshot === 0 && (
                      <Badge variant="destructive" className="mt-1 normal-case">
                        {t('matters:billing.billableWithoutRate')}
                      </Badge>
                    )}
                    {!entry.isBillable && entry.rateSnapshot === 0 && (
                      <Badge variant="outline" className="mt-1 normal-case text-muted-foreground">
                        {t('matters:billing.noRateCard')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatHours(entry.hours)}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(entry.rateSnapshot)}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(entry.amount)}</TableCell>
                  <TableCell>
                    {entry.isBillable ? (
                      <Check className="size-4 text-emerald-600" aria-label={t('matters:billing.billableAria')} />
                    ) : (
                      <X className="size-4 text-muted-foreground" aria-label={t('matters:billing.nonBillableAria')} />
                    )}
                  </TableCell>
                  <PermissionGate resource="billing" action="update">
                    <TableCell>
                      {!entry.invoiceId && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditingEntry(entry)
                              setTimeDrawerOpen(true)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <PermissionGate resource="billing" action="delete">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={deleteEntry.isPending}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: t('matters:billing.confirmDeleteTimeTitle'),
                                  message: t('matters:billing.confirmDeleteTimeMessage'),
                                  variant: 'danger',
                                  confirmLabel: t('common:actions.remove'),
                                })
                                if (ok) deleteEntry.mutate(entry.id)
                              }}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </PermissionGate>
                        </div>
                      )}
                    </TableCell>
                  </PermissionGate>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t('matters:billing.fixedFees')}</h3>
          <PermissionGate resource="billing" action="create">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingFee(null)
                setFeeDrawerOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" />
              {t('matters:billing.addFee')}
            </Button>
          </PermissionGate>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('matters:billing.table.date')}</TableHead>
              <TableHead>{t('matters:billing.table.description')}</TableHead>
              <TableHead>{t('matters:billing.table.category')}</TableHead>
              <TableHead className="text-right">{t('matters:billing.table.amount')}</TableHead>
              <TableHead>{t('matters:billing.table.billable')}</TableHead>
              <PermissionGate resource="billing" action="update">
                <TableHead className="w-[88px]" />
              </PermissionGate>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(fixedFees ?? []).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={feeTableColSpan}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t('matters:billing.emptyFees')}
                </TableCell>
              </TableRow>
            ) : (
              (fixedFees ?? []).map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell>{formatBillingDate(fee.date)}</TableCell>
                  <TableCell className="max-w-[320px]">
                    <span className="line-clamp-2">{fee.description}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fixedFeeCategoryLabel(fee.category)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(fee.amount, fee.currency)}
                  </TableCell>
                  <TableCell>
                    {fee.isBillable ? (
                      <Check className="size-4 text-emerald-600" aria-label={t('matters:billing.billableAria')} />
                    ) : (
                      <X className="size-4 text-muted-foreground" aria-label={t('matters:billing.nonBillableAria')} />
                    )}
                  </TableCell>
                  <PermissionGate resource="billing" action="update">
                    <TableCell>
                      {!fee.invoiceId && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditingFee(fee)
                              setFeeDrawerOpen(true)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <PermissionGate resource="billing" action="delete">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={deleteFee.isPending}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: t('matters:billing.confirmDeleteFeeTitle'),
                                  message: t('matters:billing.confirmDeleteFeeMessage'),
                                  variant: 'danger',
                                  confirmLabel: t('common:actions.remove'),
                                })
                                if (ok) deleteFee.mutate(fee.id)
                              }}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </PermissionGate>
                        </div>
                      )}
                    </TableCell>
                  </PermissionGate>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <MatterInvoicesSection matterId={matterId} />

      <TimeEntryDrawer
        matterId={matterId}
        open={timeDrawerOpen}
        entry={editingEntry}
        onClose={() => {
          setTimeDrawerOpen(false)
          setEditingEntry(null)
        }}
      />

      <FixedFeeDrawer
        matterId={matterId}
        open={feeDrawerOpen}
        fee={editingFee}
        onClose={() => {
          setFeeDrawerOpen(false)
          setEditingFee(null)
        }}
      />
    </div>
  )
}

function TimeEntryDrawer({
  matterId,
  open,
  entry,
  onClose,
}: {
  matterId: string
  open: boolean
  entry: TimeEntry | null
  onClose: () => void
}) {
  const { t } = useTranslation(['matters', 'finance', 'common'])
  const isEdit = Boolean(entry)
  const createEntry = useCreateTimeEntry(matterId)
  const updateEntry = useUpdateTimeEntry(matterId)
  const { data: resolvedRate, isLoading: rateLoading } = useResolveRate(
    matterId,
    open && !isEdit,
  )

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('1')
  const [description, setDescription] = useState('')
  const [isBillable, setIsBillable] = useState(true)
  const [rate, setRate] = useState('')
  const [noRateCard, setNoRateCard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (entry) {
      setDate(entry.date.slice(0, 10))
      setHours(String(entry.hours))
      setDescription(entry.description)
      setIsBillable(entry.isBillable)
      setRate(String(entry.rateSnapshot))
      setNoRateCard(entry.rateSnapshot === 0)
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setHours('1')
      setDescription('')
      setIsBillable(true)
      setRate('')
      setNoRateCard(false)
    }
    setError(null)
  }, [open, entry])

  useEffect(() => {
    if (!open || isEdit || rateLoading || !resolvedRate) return
    setRate(String(resolvedRate.hourlyRate))
    setNoRateCard(resolvedRate.isUnrated)
    if (resolvedRate.isUnrated) {
      setIsBillable(false)
    }
  }, [open, isEdit, rateLoading, resolvedRate])

  const hoursNum = Number(hours)
  const rateNum = Number(rate)

  useEffect(() => {
    if (Number(rate) === 0 && isBillable) {
      setIsBillable(false)
    }
  }, [rate, isBillable])

  const previewAmount = previewTimeAmount(hoursNum, rateNum, isBillable)
  const showUnratedWarning = noRateCard && rateNum === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!description.trim()) {
      setError(t('matters:billing.timeDrawer.errors.descriptionRequired'))
      return
    }
    if (!Number.isFinite(hoursNum) || hoursNum < 0.25) {
      setError(t('matters:billing.timeDrawer.errors.hoursMin'))
      return
    }
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setError(t('matters:billing.timeDrawer.errors.rateMin'))
      return
    }
    if (isBillable && rateNum === 0) {
      setError(t('matters:billing.timeDrawer.errors.billableRequiresRate'))
      return
    }

    const payload = {
      date,
      hours: hoursNum,
      description: description.trim(),
      isBillable,
      rateSnapshot: rateNum,
    }

    try {
      if (entry) {
        await updateEntry.mutateAsync({ id: entry.id, data: payload })
      } else {
        await createEntry.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('matters:billing.timeDrawer.saveFailed')))
    }
  }

  const pending = createEntry.isPending || updateEntry.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        isEdit ? t('matters:billing.timeDrawer.editTitle') : t('matters:billing.timeDrawer.createTitle')
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="te-date">{t('matters:billing.table.date')}</Label>
          <Input
            id="te-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="te-hours">{t('matters:billing.table.hours')}</Label>
          <Input
            id="te-hours"
            type="number"
            min={0.25}
            step={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">{t('matters:billing.timeDrawer.hoursHint')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="te-description">{t('matters:billing.table.description')}</Label>
          <Input
            id="te-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('matters:billing.timeDrawer.descriptionPlaceholder')}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="te-billable"
            type="checkbox"
            checked={isBillable}
            disabled={rateNum === 0}
            onChange={(e) => setIsBillable(e.target.checked)}
            className="size-4 rounded border disabled:opacity-50"
          />
          <Label htmlFor="te-billable" className={rateNum === 0 ? 'text-muted-foreground' : undefined}>
            {t('matters:billing.timeDrawer.billable')}
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="te-rate">{t('matters:billing.timeDrawer.hourlyRate')}</Label>
          <Input
            id="te-rate"
            type="number"
            min={0}
            step={0.01}
            value={rate}
            onChange={(e) => {
              const next = e.target.value
              setRate(next)
              if (Number(next) > 0) setNoRateCard(false)
            }}
            required
          />
          {!isEdit && rateLoading && (
            <p className="text-xs text-muted-foreground">{t('matters:billing.timeDrawer.resolvingRate')}</p>
          )}
          {showUnratedWarning && (
            <div
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              {t('matters:billing.timeDrawer.noRateCardWarning')}
            </div>
          )}
          {rateNum === 0 && !showUnratedWarning && (
            <p className="text-xs text-muted-foreground">
              {t('matters:billing.timeDrawer.billableDisabledHint')}
            </p>
          )}
        </div>

        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {t('matters:billing.timeDrawer.amount')}{' '}
          <span className="font-medium">{formatMoney(previewAmount)}</span>
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? t('common:loading.saving')
              : isEdit
                ? t('common:actions.saveChanges')
                : t('matters:billing.addTime')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function FixedFeeDrawer({
  matterId,
  open,
  fee,
  onClose,
}: {
  matterId: string
  open: boolean
  fee: FixedFee | null
  onClose: () => void
}) {
  const { t } = useTranslation(['matters', 'finance', 'common'])
  const isEdit = Boolean(fee)
  const createFee = useCreateFixedFee(matterId)
  const updateFee = useUpdateFixedFee(matterId)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<FixedFeeCategory>('professional_fee')
  const [isBillable, setIsBillable] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (fee) {
      setDate(fee.date.slice(0, 10))
      setDescription(fee.description)
      setAmount(String(fee.amount))
      setCategory(fee.category)
      setIsBillable(fee.isBillable)
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setDescription('')
      setAmount('')
      setCategory('professional_fee')
      setIsBillable(true)
    }
    setError(null)
  }, [open, fee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!description.trim()) {
      setError(t('matters:billing.feeDrawer.errors.descriptionRequired'))
      return
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setError(t('matters:billing.feeDrawer.errors.amountMin'))
      return
    }

    const payload = {
      date,
      description: description.trim(),
      amount: amountNum,
      category,
      isBillable,
    }

    try {
      if (fee) {
        await updateFee.mutateAsync({ id: fee.id, data: payload })
      } else {
        await createFee.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('matters:billing.feeDrawer.saveFailed')))
    }
  }

  const pending = createFee.isPending || updateFee.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? t('matters:billing.feeDrawer.editTitle') : t('matters:billing.feeDrawer.createTitle')}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="ff-date">{t('matters:billing.table.date')}</Label>
          <Input
            id="ff-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ff-description">{t('matters:billing.table.description')}</Label>
          <Input
            id="ff-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('matters:billing.feeDrawer.descriptionPlaceholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ff-category">{t('matters:billing.table.category')}</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as FixedFeeCategory)}>
            <SelectTrigger id="ff-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIXED_FEE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {fixedFeeCategoryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ff-amount">{t('matters:billing.feeDrawer.amount')}</Label>
          <Input
            id="ff-amount"
            type="number"
            min={0}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="ff-billable"
            type="checkbox"
            checked={isBillable}
            onChange={(e) => setIsBillable(e.target.checked)}
            className="size-4 rounded border"
          />
          <Label htmlFor="ff-billable">{t('matters:billing.feeDrawer.billable')}</Label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? t('common:loading.saving')
              : isEdit
                ? t('common:actions.saveChanges')
                : t('matters:billing.addFee')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
