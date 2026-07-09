import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDataExports } from '@/features/compliance/hooks/useCompliance'
import type { AuditLogItem } from '@/features/compliance/api'

export function DataExportsPage() {
  const { data, isLoading, isError } = useDataExports()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading export log…</p>
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load export log.</p>
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Data exports log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal data exports and downloads tracked for GDPR compliance.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Client ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No exports recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            items.map((row: AuditLogItem) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{row.user?.fullName ?? row.userEmail ?? '—'}</TableCell>
                <TableCell>{row.resource}</TableCell>
                <TableCell className="font-mono text-xs">
                  {(row.metadata?.clientId as string) ?? row.resourceId ?? '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
