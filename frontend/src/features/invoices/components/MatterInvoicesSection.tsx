import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { Button } from '@/components/ui/button'
import { useBillingSummary } from '@/features/billing/hooks/useBilling'
import { useCreateInvoice, useMatterInvoices } from '@/features/invoices/hooks/useInvoices'
import type { Invoice } from '@/features/invoices/types'
import { InvoiceListTable } from '@/features/invoices/components/InvoiceListTable'

export function MatterInvoicesSection({ matterId }: { matterId: string }) {
  const { showError } = useAppAlert()
  const { data: summary } = useBillingSummary(matterId)
  const { data: invoices, isLoading, isError } = useMatterInvoices(matterId)
  const createInvoice = useCreateInvoice(matterId)

  const unbilledAmount = summary?.unbilledAmount ?? 0

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Invoices</h3>
        <PermissionGate resource="invoice" action="create">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={createInvoice.isPending || unbilledAmount <= 0}
            onClick={() => {
              createInvoice.mutate(
                {},
                {
                  onError: (err) => showError(err, 'Failed to create invoice'),
                },
              )
            }}
          >
            Create invoice from unbilled
          </Button>
        </PermissionGate>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading invoices…</p>}
      {isError && <p className="text-sm text-destructive">Failed to load invoices.</p>}
      {invoices && (
        <InvoiceListTable
          invoices={invoices.filter((invoice: Invoice) => invoice.status !== 'void')}
          matterId={matterId}
          enableFinanceActions
        />
      )}
    </section>
  )
}
