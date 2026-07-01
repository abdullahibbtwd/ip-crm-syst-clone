import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AddRelatedCompanyDrawer } from '@/components/crm/AddRelatedCompanyDrawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
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
import {
  useDeleteRelatedCompany,
  useRelatedCompanies,
} from '@/features/crm/hooks/useRelatedCompanies'
import { clientDisplayName, RELATIONSHIP_TYPE_LABELS } from '@/features/crm/utils'
import type { ClientTabContext } from '../ClientLayout'

export function RelatedCompaniesTab() {
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data: related, isLoading } = useRelatedCompanies(clientId)
  const removeRelated = useDeleteRelatedCompany(clientId)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Related companies</h2>
        <PermissionGate resource="client" action="update">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            Add related company
          </Button>
        </PermissionGate>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Relationship</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(related ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No related companies linked.
              </TableCell>
            </TableRow>
          ) : (
            related?.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {row.relatedClient
                    ? `${row.relatedClient.internalCode} - ${clientDisplayName(row.relatedClient)}`
                    : row.externalName}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="normal-case">
                    {RELATIONSHIP_TYPE_LABELS[
                      row.relationshipType as keyof typeof RELATIONSHIP_TYPE_LABELS
                    ] ?? row.relationshipType}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {row.notes ?? '-'}
                </TableCell>
                <TableCell>
                  <PermissionGate resource="client" action="update">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={removeRelated.isPending}
                      onClick={() => removeRelated.mutate(row.id)}
                    >
                      Remove
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddRelatedCompanyDrawer
        clientId={clientId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
