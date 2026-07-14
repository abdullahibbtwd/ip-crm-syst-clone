import { Link, useOutletContext } from 'react-router-dom'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { SummaryBar } from '@/features/billing/components/SummaryBar'
import { useClientBillingSummary } from '@/features/billing/hooks/useBilling'
import { formatHours, formatMoney } from '@/features/billing/utils'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientRetainerCard } from '@/features/retainers/components/ClientRetainerCard'
import type { ClientTabContext } from '../ClientLayout'

export function ClientBillingTab() {
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading, isError } = useClientBillingSummary(clientId)

  return (
    <PermissionGate
      resource="billing"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">
          You do not have permission to view billing for this client.
        </p>
      }
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading billing…</p>}
      {isError && (
        <p className="text-sm text-destructive">Failed to load billing data.</p>
      )}

      <ClientRetainerCard clientId={clientId} />

      {data && (
        <div className="space-y-6">
          <div>
            <h2 className="font-medium">Billing</h2>
            <p className="text-sm text-muted-foreground">
              Work in progress and billable totals across all matters for this client.
            </p>
          </div>

          <SummaryBar
            totalHours={data.totals.totalHours}
            totalBillableHours={data.totals.totalBillableHours}
            totalBillableAmount={data.totals.totalBillableAmount}
            totalFixedFees={data.totals.totalFixedFees}
            totalAmount={data.totals.totalAmount}
            unbilledAmount={data.totals.unbilledAmount}
          />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">By matter</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Billable hours</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Unbilled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.matters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No matters yet. Open a matter to start tracking billable work.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.matters.map((matter) => (
                    <TableRow key={matter.matterId}>
                      <TableCell>
                        <Link
                          to={`/matters/${matter.matterId}/billing`}
                          className="font-medium text-primary hover:underline"
                        >
                          {matter.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {MATTER_TYPE_LABELS[matter.matterType as keyof typeof MATTER_TYPE_LABELS] ??
                          matter.matterType}
                      </TableCell>
                      <TableCell>
                        <MatterStatusBadge status={matter.status as never} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatHours(matter.totalBillableHours)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(matter.totalAmount)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(matter.unbilledAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      )}
    </PermissionGate>
  )
}
