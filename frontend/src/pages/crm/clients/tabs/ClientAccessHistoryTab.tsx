import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('crm')
  const { t: tCommon } = useTranslation('common')
  const { clientId } = useOutletContext<ClientTabContext>()
  const { data, isLoading, isError } = useClientDataAccess(clientId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('accessHistory.loading')}</p>
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('accessHistory.loadFailed')}</p>
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg">{t('accessHistory.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('accessHistory.subtitle')}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('accessHistory.columns.when')}</TableHead>
            <TableHead>{t('accessHistory.columns.user')}</TableHead>
            <TableHead>{t('accessHistory.columns.action')}</TableHead>
            <TableHead>{t('accessHistory.columns.ip')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t('accessHistory.empty')}
              </TableCell>
            </TableRow>
          ) : (
            items.map((row: AuditLogItem) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {row.user?.fullName ?? row.userEmail ?? t('accessHistory.systemUser')}
                </TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.ipAddress ?? tCommon('yesNo.dash')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
