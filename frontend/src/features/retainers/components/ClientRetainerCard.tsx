import { useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
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
import { formatMoney } from '@/features/billing/utils'
import { useClientRetainer, useRetainerDeposit } from '@/features/retainers/hooks/useRetainers'
import type { RetainerEntryType, RetainerLedgerEntry } from '@/features/retainers/types'
import { getApiErrorMessage } from '@/lib/api-client'

const ENTRY_LABELS: Record<RetainerEntryType, string> = {
  deposit: 'Deposit',
  draw_down: 'Draw-down',
  adjustment: 'Adjustment',
  refund: 'Refund',
}

type ClientRetainerCardProps = {
  clientId: string
}

export function ClientRetainerCard({ clientId }: ClientRetainerCardProps) {
  const { data, isLoading, isError } = useClientRetainer(clientId)
  const deposit = useRetainerDeposit(clientId)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [threshold, setThreshold] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsed = Number(amount)
    if (!parsed || parsed <= 0) {
      setError('Enter a valid deposit amount')
      return
    }

    try {
      await deposit.mutateAsync({
        amount: parsed,
        note: note.trim() || undefined,
        lowBalanceThreshold: threshold ? Number(threshold) : undefined,
      })
      setAmount('')
      setNote('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to record deposit'))
    }
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 size-5 text-primary" />
        <div>
          <h3 className="font-medium">Retainer account</h3>
          <p className="text-sm text-muted-foreground">
            Prepaid balance drawn down when invoices are paid from retainer.
          </p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading retainer…</p>}
      {isError && (
        <p className="text-sm text-destructive">
          Failed to load retainer balance. Ensure the database migration is applied
          and you have re-logged in after seeding permissions.
        </p>
      )}

      {data && (
        <>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Current balance</p>
              <p className="text-lg font-semibold">
                {formatMoney(data.balance, data.currency)}
              </p>
            </div>
            {data.lowBalanceThreshold != null && (
              <div>
                <p className="text-muted-foreground">Low-balance alert</p>
                <p className="font-medium">
                  {formatMoney(data.lowBalanceThreshold, data.currency)}
                </p>
              </div>
            )}
          </div>

          <PermissionGate resource="billing" action="update">
            <form onSubmit={handleDeposit} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="retainer-deposit-amount">Deposit amount</Label>
                <Input
                  id="retainer-deposit-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="retainer-threshold">Low-balance threshold</Label>
                <Input
                  id="retainer-threshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder={String(data.lowBalanceThreshold ?? '1000')}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="retainer-note">Note</Label>
                <Input
                  id="retainer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Q3 retainer top-up"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive sm:col-span-3" role="alert">
                  {error}
                </p>
              )}
              <div className="sm:col-span-3">
                <Button type="submit" disabled={deposit.isPending}>
                  {deposit.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Recording…
                    </>
                  ) : (
                    'Record deposit'
                  )}
                </Button>
              </div>
            </form>
          </PermissionGate>

          {data.entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((entry: RetainerLedgerEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{ENTRY_LABELS[entry.type]}</TableCell>
                    <TableCell>{entry.invoiceNumber ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(entry.amount, data.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(entry.balanceAfter, data.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No retainer activity yet. Record a deposit to create the account.
            </p>
          )}
        </>
      )}
    </section>
  )
}
