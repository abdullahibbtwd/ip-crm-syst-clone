import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['crm', 'common'])
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data: related, isLoading } = useRelatedCompanies(clientId)
  const removeRelated = useDeleteRelatedCompany(clientId)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('relatedCompanies.loading')}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{t('relatedCompanies.title')}</h2>
        <PermissionGate resource="client" action="update">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            {t('relatedCompanies.add')}
          </Button>
        </PermissionGate>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('relatedCompanies.table.name')}</TableHead>
            <TableHead>{t('relatedCompanies.table.relationship')}</TableHead>
            <TableHead>{t('relatedCompanies.table.notes')}</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(related ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t('relatedCompanies.empty')}
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
                  {row.notes ?? t('yesNo.dash', { ns: 'common' })}
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
                      {t('relatedCompanies.remove')}
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
