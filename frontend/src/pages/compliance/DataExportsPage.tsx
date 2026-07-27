import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('compliance')
  const { t: tCommon } = useTranslation('common')
  const { data, isLoading, isError } = useDataExports()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('dataExports.loading')}</p>
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('dataExports.loadFailed')}</p>
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">{t('dataExports.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dataExports.subtitle')}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('dataExports.columns.when')}</TableHead>
            <TableHead>{t('dataExports.columns.user')}</TableHead>
            <TableHead>{t('dataExports.columns.resource')}</TableHead>
            <TableHead>{t('dataExports.columns.clientId')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t('dataExports.empty')}
              </TableCell>
            </TableRow>
          ) : (
            items.map((row: AuditLogItem) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{row.user?.fullName ?? row.userEmail ?? tCommon('yesNo.dash')}</TableCell>
                <TableCell>{row.resource}</TableCell>
                <TableCell className="font-mono text-xs">
                  {(row.metadata?.clientId as string) ?? row.resourceId ?? tCommon('yesNo.dash')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
