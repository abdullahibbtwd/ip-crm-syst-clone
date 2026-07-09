import { useOutletContext } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClientDataAccess } from '@/features/compliance/hooks/useCompliance'
import type { AuditLogItem } from '@/features/compliance/api'
import type { ClientTabContext } from '../ClientLayout'

export function ClientAccessHistoryTab() {
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading, isError } = useClientDataAccess(clientId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading access history…</p>
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load access history.</p>
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg">Data access history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff who viewed or exported personal data for this client.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No access events recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            items.map((row: AuditLogItem) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {row.user?.fullName ?? row.userEmail ?? 'System'}
                </TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell className="text-muted-foreground">{row.ipAddress ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
