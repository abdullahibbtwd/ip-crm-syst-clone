import { InvoiceListTable } from '@/features/invoices/components/InvoiceListTable'
import { usePortalInvoices } from '@/features/invoices/hooks/useInvoices'

export function PortalInvoicesPage() {
  const { data: invoices, isLoading, isError } = usePortalInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My invoices</h1>
        <p className="text-sm text-muted-foreground">
          Invoices and payment status across all your matters.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading invoices…</p>}
      {isError && <p className="text-sm text-destructive">Failed to load invoices.</p>}
      {invoices && (
        <InvoiceListTable invoices={invoices} portal showMatter />
      )}
    </div>
  )
}
