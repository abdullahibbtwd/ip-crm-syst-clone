import { Wallet } from 'lucide-react'
import { formatMoney } from '@/features/billing/utils'
import { usePortalRetainer } from '@/features/retainers/hooks/useRetainers'

export function PortalRetainerBalance() {
  const { data, isLoading, isError } = usePortalRetainer()

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading retainer balance…</p>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Could not load retainer balance.
      </p>
    )
  }

  const balance = data?.balance ?? 0
  const currency = data?.currency ?? 'EUR'

  return (
    <div className="rounded-lg border border-brand-green/10 bg-brand-light/40 p-4">
      <div className="flex items-center gap-2 text-brand-green">
        <Wallet className="size-4" />
        <h2 className="text-sm font-medium">Retainer balance</h2>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">
        {formatMoney(balance, currency)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {balance > 0
          ? 'Remaining prepaid balance available for future invoices.'
          : 'No prepaid retainer on file. Contact your attorney if you expect a credit balance.'}
      </p>
    </div>
  )
}
