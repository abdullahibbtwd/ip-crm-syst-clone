import { useState } from 'react'
import { Banknote, Download, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RecordPaymentDrawer } from '@/features/invoices/components/RecordPaymentDrawer'
import {
  useInvoicePdf,
  useIssueInvoice,
  useVoidInvoice,
} from '@/features/invoices/hooks/useInvoices'
import type { Invoice } from '@/features/invoices/types'
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  PAYMENT_STATUS_LABELS,
} from '@/features/invoices/utils'

type InvoiceListTableProps = {
  invoices: Invoice[]
  matterId?: string
  portal?: boolean
  showMatter?: boolean
  enableFinanceActions?: boolean
}

export function InvoiceListTable({
  invoices,
  matterId,
  portal = false,
  showMatter = false,
  enableFinanceActions = false,
}: InvoiceListTableProps) {
  const { confirm, showError } = useAppAlert()
  const downloadPdf = useInvoicePdf(portal)
  const issueInvoice = useIssueInvoice(matterId)
  const voidInvoice = useVoidInvoice(matterId)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)

  const showActions = !portal && (enableFinanceActions || Boolean(matterId))

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-10 text-center">
        <FileText className="mx-auto size-8 text-muted-foreground/60" />
        <p className="mt-3 font-medium">No invoices yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {portal
            ? 'When your matter is invoiced, your invoices and their payment status will appear here.'
            : 'Create an invoice from unbilled time entries and fixed fees.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {portal ? (
        <ul className="space-y-3 md:hidden">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{invoice.invoiceNumber ?? 'Draft'}</p>
                  {showMatter ? (
                    <Link
                      to={`/matters/${invoice.matterId}/billing`}
                      className="text-sm text-primary hover:underline"
                    >
                      {invoice.matter.title}
                    </Link>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant={invoice.status === 'issued' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                    <Badge
                      variant={
                        invoice.paymentStatus === 'paid'
                          ? 'default'
                          : invoice.paymentStatus === 'partial'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {PAYMENT_STATUS_LABELS[invoice.paymentStatus]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatInvoiceDate(invoice.issueDate)} ·{' '}
                    {formatInvoiceMoney(invoice.totalAmount, invoice.currency)}
                  </p>
                </div>
                {invoice.status === 'issued' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={downloadPdf.isPending}
                    onClick={() => downloadPdf.mutate(invoice.id)}
                    aria-label="Download invoice"
                  >
                    <Download className="size-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={portal ? 'hidden md:block' : undefined}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              {showMatter && <TableHead>Matter</TableHead>}
              <TableHead>Issue date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[160px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const canRecordPayment =
                invoice.status === 'issued' &&
                (invoice.paymentStatus === 'unpaid' || invoice.paymentStatus === 'partial')

              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber ?? 'Draft'}
                  </TableCell>
                  {showMatter && (
                    <TableCell>
                      <Link
                        to={`/matters/${invoice.matterId}/billing`}
                        className="text-primary hover:underline"
                      >
                        {invoice.matter.title}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {formatInvoiceDate(invoice.issueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === 'issued' ? 'default' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.paymentStatus === 'paid'
                          ? 'default'
                          : invoice.paymentStatus === 'partial'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {PAYMENT_STATUS_LABELS[invoice.paymentStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatInvoiceMoney(invoice.totalAmount, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {invoice.status === 'issued' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={downloadPdf.isPending}
                          onClick={() => downloadPdf.mutate(invoice.id)}
                          aria-label="Download invoice"
                        >
                          <Download className="size-3.5" />
                        </Button>
                      )}
                      {showActions && (
                        <PermissionGate resource="invoice" action="update">
                          {canRecordPayment && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setPaymentInvoice(invoice)}
                            >
                              <Banknote className="mr-1 size-3.5" />
                              Pay
                            </Button>
                          )}
                          {invoice.status === 'draft' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={issueInvoice.isPending}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Issue invoice?',
                                  message: 'Billable lines will be locked and cannot be edited.',
                                  variant: 'warning',
                                  confirmLabel: 'Issue',
                                })
                                if (!ok) return
                                issueInvoice.mutate(invoice.id, {
                                  onError: (err) => showError(err, 'Failed to issue invoice'),
                                })
                              }}
                            >
                              Issue
                            </Button>
                          )}
                          {invoice.status !== 'void' && invoice.paymentStatus === 'unpaid' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={voidInvoice.isPending}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Void invoice?',
                                  message:
                                    'This releases billed lines back to unbilled work in progress.',
                                  variant: 'danger',
                                  confirmLabel: 'Void invoice',
                                })
                                if (!ok) return
                                voidInvoice.mutate(invoice.id, {
                                  onError: (err) => showError(err, 'Failed to void invoice'),
                                })
                              }}
                            >
                              Void
                            </Button>
                          )}
                        </PermissionGate>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <RecordPaymentDrawer
        invoice={paymentInvoice}
        open={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
      />
    </>
  )
}
