import { useQuery } from '@tanstack/react-query'
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
  const { t } = useTranslation('finance')
  const { t: tCommon } = useTranslation('common')
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
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('disbursements.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('disbursements.subtitle')}</p>
      </div>

      <PermissionGate
        resource="billing"
        action="read"
        fallback={<p className="text-sm text-muted-foreground">{tCommon('noPermission')}</p>}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{tCommon('loading.default')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('disbursements.loadFailed')}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('disbursements.columns.date')}</TableHead>
                  <TableHead>{t('disbursements.columns.matter')}</TableHead>
                  <TableHead>{t('disbursements.columns.description')}</TableHead>
                  <TableHead>{t('disbursements.columns.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {t('disbursements.empty')}
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
