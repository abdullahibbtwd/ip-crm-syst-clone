import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clientDisplayName } from '@/features/crm/utils'
import { useMatters } from '@/features/matters/hooks/useMatters'
import { matterTypeLabel } from '@/features/matters/utils'

export function BpoOwnersPage() {
  const { t } = useTranslation(['crm', 'common'])
  const { data, isLoading, isError } = useMatters({
    matterType: 'trademark',
    withoutRepresentative: true,
    limit: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('bpoOwners.title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('bpoOwners.description')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common:loading.default')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('bpoOwners.error')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bpoOwners.table.file')}</TableHead>
              <TableHead>{t('bpoOwners.table.owner')}</TableHead>
              <TableHead>{t('bpoOwners.table.type')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  {t('bpoOwners.empty')}
                </TableCell>
              </TableRow>
            ) : (
              (data?.items ?? []).map((matter) => (
                <TableRow key={matter.id}>
                  <TableCell>
                    <Link to={`/matters/${matter.id}/overview`} className="text-primary hover:underline">
                      {matter.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {matter.client ? (
                      <Link
                        to={`/clients/${matter.client.id}/overview`}
                        className="text-primary hover:underline"
                      >
                        {clientDisplayName(matter.client)}
                      </Link>
                    ) : (
                      t('yesNo.dash', { ns: 'common' })
                    )}
                  </TableCell>
                  <TableCell>{matterTypeLabel(matter.matterType)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
