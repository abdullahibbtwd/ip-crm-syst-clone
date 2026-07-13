import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { apiClient } from '@/lib/api-client'

type FixedFeeRow = {
  id: string
  date: string
  description: string
  amount: number
  currency: string
  category: string
  matter: { id: string; title: string }
}

export function DisbursementsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['fixed-fees', 'disbursement'],
    queryFn: () =>
      apiClient.get<FixedFeeRow[]>('/fixed-fees', {
        category: 'disbursement',
        limit: 100,
      }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">Disbursements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Firm-wide fixed fees categorized as disbursements.
        </p>
      </div>

      <PermissionGate
        resource="billing"
        action="read"
        fallback={<p className="text-sm text-muted-foreground">No permission.</p>}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load disbursements.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No disbursements found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{String(row.date).slice(0, 10)}</TableCell>
                      <TableCell>
                        <Link
                          to={`/matters/${row.matter.id}/billing`}
                          className="text-primary hover:underline"
                        >
                          {row.matter.title}
                        </Link>
                      </TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>
                        {row.amount.toFixed(2)} {row.currency}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </PermissionGate>
    </div>
  )
}
