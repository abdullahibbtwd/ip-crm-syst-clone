import { useEffect, useState } from 'react'
import { Drawer } from '@/components/crm/Drawer'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
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
import { useRecordInvoicePayment } from '@/features/invoices/hooks/useInvoices'
import type { Invoice } from '@/features/invoices/types'
import { formatInvoiceMoney } from '@/features/invoices/utils'
import {
  useApplyRetainerToInvoice,
  useClientRetainer,
} from '@/features/retainers/hooks/useRetainers'
import { getApiErrorMessage } from '@/lib/api-client'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'retainer', label: 'Retainer balance' },
  { value: 'other', label: 'Other' },
]

type RecordPaymentDrawerProps = {
  invoice: Invoice | null
  open: boolean
  onClose: () => void
}

export function RecordPaymentDrawer({ invoice, open, onClose }: RecordPaymentDrawerProps) {
  const { alert } = useAppAlert()
  const recordPayment = useRecordInvoicePayment(invoice?.matterId ?? '')
  const applyRetainer = useApplyRetainerToInvoice(
    invoice?.clientId ?? '',
    invoice?.matterId,
  )
  const { data: retainer } = useClientRetainer(invoice?.clientId ?? '')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)

  const remaining = invoice
    ? Math.max(0, invoice.totalAmount - invoice.paidAmount)
    : 0
  const retainerBalance = retainer?.balance ?? 0
  const isRetainer = method === 'retainer'
  const isPending = recordPayment.isPending || applyRetainer.isPending

  useEffect(() => {
    if (!open || !invoice) return
    setAmount(remaining > 0 ? String(remaining) : '')
    setPaidAt(new Date().toISOString().slice(0, 10))
    setMethod('bank_transfer')
    setReference('')
    setError(null)
  }, [open, invoice, remaining])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoice) return
    setError(null)

    const parsed = Number(amount)
    if (!parsed || parsed <= 0) {
      setError('Enter a valid payment amount')
      return
    }
    if (parsed > remaining) {
      setError(`Amount cannot exceed ${formatInvoiceMoney(remaining, invoice.currency)}`)
      return
    }
    if (isRetainer && parsed > retainerBalance) {
      setError('Amount exceeds available retainer balance')
      return
    }

    try {
      if (isRetainer) {
        await applyRetainer.mutateAsync({
          invoiceId: invoice.id,
          data: { amount: parsed },
        })
      } else {
        await recordPayment.mutateAsync({
          id: invoice.id,
          data: {
            amount: parsed,
            paidAt,
            method,
            reference: reference.trim() || undefined,
          },
        })
      }

      await alert({
        title: isRetainer ? 'Retainer applied' : 'Payment recorded',
        message: `${formatInvoiceMoney(parsed, invoice.currency)} applied to ${invoice.invoiceNumber ?? 'invoice'}.`,
        variant: 'success',
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to record payment'))
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={invoice ? `Record payment - ${invoice.invoiceNumber ?? 'Draft'}` : 'Record payment'}
    >
      {invoice && (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Outstanding balance</p>
            <p className="text-lg font-medium">
              {formatInvoiceMoney(remaining, invoice.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total {formatInvoiceMoney(invoice.totalAmount, invoice.currency)} · Paid{' '}
              {formatInvoiceMoney(invoice.paidAmount, invoice.currency)}
            </p>
            {retainerBalance > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Retainer available: {formatInvoiceMoney(retainerBalance, invoice.currency)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {!isRetainer && (
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v ?? 'bank_transfer')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.filter(
                  (item) => item.value !== 'retainer' || retainerBalance > 0,
                ).map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isRetainer && (
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference (optional)</Label>
              <Input
                id="payment-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ID, cheque no., etc."
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || remaining <= 0}>
              {isRetainer ? 'Apply from retainer' : 'Record payment'}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  )
}
