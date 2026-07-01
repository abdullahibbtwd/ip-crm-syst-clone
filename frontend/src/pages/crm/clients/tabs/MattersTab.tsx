import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { CreateMatterDrawer } from '@/components/matters/CreateMatterDrawer'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMatters } from '@/features/matters/hooks/useMatters'
import { MATTER_TYPE_LABELS, formatJurisdictions } from '@/features/matters/utils'
import type { ClientTabContext } from '../ClientLayout'

export function MattersTab() {
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading } = useMatters({ clientId, limit: 50 })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const matters = data?.items ?? []

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading matters…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Matters</h2>
        <PermissionGate resource="matter" action="create">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            Open new matter
          </Button>
        </PermissionGate>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Jurisdictions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matters.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No matters yet. Open a matter to start prosecution work for this client.
              </TableCell>
            </TableRow>
          ) : (
            matters.map((matter) => (
              <TableRow key={matter.id}>
                <TableCell className="text-muted-foreground">
                  {MATTER_TYPE_LABELS[matter.matterType]}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/matters/${matter.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {matter.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <MatterStatusBadge status={matter.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {matter.assignedTo?.fullName ?? '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatJurisdictions(matter.jurisdictions.map((j) => j.countryCode))}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CreateMatterDrawer
        clientId={clientId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
