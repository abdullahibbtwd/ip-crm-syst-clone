import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRecordTrademarkAction } from '@/features/matters/hooks/useMatters'
import type { TrademarkSecondaryAction } from '@/features/matters/trademark-actions'
import type { MatterDetail } from '@/features/matters/types'
import { getApiErrorMessage } from '@/lib/api-client'

const AMOUNT_OPTIONS = Array.from({ length: 37 }, (_, i) => i)

type TrademarkActionDrawerProps = {
  open: boolean
  onClose: () => void
  matter: MatterDetail
  action: TrademarkSecondaryAction | null
}

function ReminderFields({
  label,
  amount,
  unit,
  onAmountChange,
  onUnitChange,
}: {
  label: string
  amount: number
  unit: 'months' | 'days'
  onAmountChange: (value: number) => void
  onUnitChange: (value: 'months' | 'days') => void
}) {
  const { t } = useTranslation('matters')
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-2">
      <label className="space-y-1.5 text-sm">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Select value={String(amount)} onValueChange={(v) => onAmountChange(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AMOUNT_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="text-xs text-muted-foreground">
          {t('trademarkActions.secondary.reminderUnit')}
        </span>
        <Select
          value={unit}
          onValueChange={(v) => onUnitChange(v as 'months' | 'days')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="months">
              {t('trademarkActions.secondary.months')}
            </SelectItem>
            <SelectItem value="days">{t('trademarkActions.secondary.days')}</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}

export function TrademarkActionDrawer({
  open,
  onClose,
  matter,
  action,
}: TrademarkActionDrawerProps) {
  const { t } = useTranslation(['matters', 'common'])
  const recordAction = useRecordTrademarkAction(matter.id)

  const [generateProforma, setGenerateProforma] = useState(false)
  const [governmentFee, setGovernmentFee] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [paymentRemindAmount, setPaymentRemindAmount] = useState(1)
  const [paymentRemindUnit, setPaymentRemindUnit] = useState<'months' | 'days'>('months')
  const [filingDeadline, setFilingDeadline] = useState('')
  const [filingRemindAmount, setFilingRemindAmount] = useState(1)
  const [filingRemindUnit, setFilingRemindUnit] = useState<'months' | 'days'>('months')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setGenerateProforma(false)
    setGovernmentFee('')
    setPaymentDueDate('')
    setPaymentRemindAmount(1)
    setPaymentRemindUnit('months')
    setFilingDeadline('')
    setFilingRemindAmount(1)
    setFilingRemindUnit('months')
    setError(null)
  }, [open, action])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!action) return
    setError(null)

    const fee = Number(String(governmentFee).replace(',', '.'))
    if (generateProforma && (!Number.isFinite(fee) || fee <= 0)) {
      setError(t('trademarkActions.secondary.errors.feeRequired'))
      return
    }

    try {
      await recordAction.mutateAsync({
        kind: action,
        generateProforma,
        governmentFeeAmount: Number.isFinite(fee) && fee > 0 ? fee : undefined,
        governmentFeeCurrency: 'EUR',
        paymentDueDate: paymentDueDate || undefined,
        paymentReminder:
          paymentDueDate && paymentRemindAmount > 0
            ? { unit: paymentRemindUnit, amount: paymentRemindAmount }
            : undefined,
        filingDeadline: filingDeadline || undefined,
        filingReminder:
          filingDeadline && filingRemindAmount > 0
            ? { unit: filingRemindUnit, amount: filingRemindAmount }
            : undefined,
      })
      onClose()
    } catch (err) {
      setError(
        getApiErrorMessage(err, t('trademarkActions.secondary.errors.saveFailed')),
      )
    }
  }

  if (!action) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t(`trademarkActions.secondary.titles.${action}`)}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {t('trademarkActions.secondary.description')}
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={generateProforma}
            onChange={(e) => setGenerateProforma(e.target.checked)}
            className="size-4 rounded border"
          />
          {t('trademarkActions.secondary.generateProforma')}
        </label>

        <label className="space-y-1.5 text-sm block">
          <span className="text-xs text-muted-foreground">
            {t('trademarkActions.secondary.governmentFee')}
          </span>
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={governmentFee}
            onChange={(e) => setGovernmentFee(e.target.value)}
            placeholder="0.00"
          />
        </label>

        <label className="space-y-1.5 text-sm block">
          <span className="text-xs text-muted-foreground">
            {t('trademarkActions.secondary.paymentDueDate')}
          </span>
          <Input
            type="date"
            value={paymentDueDate}
            onChange={(e) => setPaymentDueDate(e.target.value)}
          />
        </label>
        <ReminderFields
          label={t('trademarkActions.secondary.paymentReminder')}
          amount={paymentRemindAmount}
          unit={paymentRemindUnit}
          onAmountChange={setPaymentRemindAmount}
          onUnitChange={setPaymentRemindUnit}
        />

        <label className="space-y-1.5 text-sm block">
          <span className="text-xs text-muted-foreground">
            {t('trademarkActions.secondary.filingDeadline')}
          </span>
          <Input
            type="date"
            value={filingDeadline}
            onChange={(e) => setFilingDeadline(e.target.value)}
          />
        </label>
        <ReminderFields
          label={t('trademarkActions.secondary.filingReminder')}
          amount={filingRemindAmount}
          unit={filingRemindUnit}
          onAmountChange={setFilingRemindAmount}
          onUnitChange={setFilingRemindUnit}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={recordAction.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={recordAction.isPending}>
            {recordAction.isPending
              ? t('common:loading.saving')
              : t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
