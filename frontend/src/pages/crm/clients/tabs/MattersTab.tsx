import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { matterTypeLabel, formatJurisdictions } from '@/features/matters/utils'
import type { ClientTabContext } from '../ClientLayout'

export function MattersTab() {
  const { t } = useTranslation('crm')
  const { t: tCommon } = useTranslation('common')
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading } = useMatters({ clientId, limit: 50 })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const matters = data?.items ?? []

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('matters.loading')}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{t('matters.title')}</h2>
        <PermissionGate resource="matter" action="create">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            {t('matters.openNew')}
          </Button>
        </PermissionGate>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('matters.table.type')}</TableHead>
            <TableHead>{t('matters.table.title')}</TableHead>
            <TableHead>{t('matters.table.status')}</TableHead>
            <TableHead>{t('matters.table.assigned')}</TableHead>
            <TableHead>{t('matters.table.jurisdictions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matters.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t('matters.empty')}
              </TableCell>
            </TableRow>
          ) : (
            matters.map((matter) => (
              <TableRow key={matter.id}>
                <TableCell className="text-muted-foreground">
                  {matterTypeLabel(matter.matterType)}
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
                  {matter.assignedTo?.fullName ?? tCommon('yesNo.dash')}
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
