import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RoleGate } from '@/components/permissions/RoleGate'
import { apiClient } from '@/lib/api-client'
import { useState } from 'react'

type ClientRow = {
  id: string
  displayName: string
  internalCode: string | null
  gdprConsent: boolean
  gdprConsentDate: string | null
}

type ClientsResponse = {
  items: ClientRow[]
  nextCursor: string | null
}

export function ConsentRegisterPage() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const [filter, setFilter] = useState<'all' | 'true' | 'false'>('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['consent-register', filter],
    queryFn: () =>
      apiClient.get<ClientsResponse>('/clients', {
        limit: 100,
        ...(filter === 'all' ? {} : { gdprConsent: filter === 'true' }),
      }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">
            {t('consent.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('consent.subtitle')}
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.all', { ns: 'common' })}</SelectItem>
            <SelectItem value="true">{t('consent.filters.consented')}</SelectItem>
            <SelectItem value="false">{t('consent.filters.missing')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <RoleGate
        roles={['managing_partner', 'dpo_compliance']}
        fallback={
          <p className="text-sm text-muted-foreground">{tCommon('noPermission')}</p>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{tCommon('loading.default')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('consent.failedToLoad')}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('consent.table.client')}</TableHead>
                  <TableHead>{t('consent.table.code')}</TableHead>
                  <TableHead>{t('consent.table.consent')}</TableHead>
                  <TableHead>{t('consent.table.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {t('consent.noClientsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.items ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          to={`/clients/${c.id}/overview`}
                          className="text-primary hover:underline"
                        >
                          {c.displayName}
                        </Link>
                      </TableCell>
                      <TableCell>{c.internalCode || '—'}</TableCell>
                      <TableCell>
                        {c.gdprConsent ? tCommon('yesNo.yes') : tCommon('yesNo.no')}
                      </TableCell>
                      <TableCell>
                        {c.gdprConsentDate
                          ? new Date(c.gdprConsentDate).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </RoleGate>
    </div>
  )
}
