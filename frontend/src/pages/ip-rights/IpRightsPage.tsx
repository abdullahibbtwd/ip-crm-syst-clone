import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

import { useClients } from '@/features/crm/hooks/useClients'
import { clientDisplayName } from '@/features/crm/utils'
import { JURISDICTION_OPTIONS } from '@/features/deadlines/utils'
import { formatMatterDate, ipRightStatusLabel, matterTypeLabel } from '@/features/matters/utils'
import type { MatterType, IpRightStatus } from '@/features/matters/types'

import { ipRightsApi } from '@/features/ip-rights/api'
import type { IpRightsFilters, IpRightsListItem } from '@/features/ip-rights/types'

const PAGE_SIZE = 50
const ALL = 'All'

const MATTER_TYPES: MatterType[] = [
  'trademark',
  'patent',
  'utility_model',
  'industrial_design',
  'copyright',
  'geographical_indication',
  'border_measures',
  'fto_analysis',
  'valuation',
  'dispute_opposition',
]

const STATUS_OPTIONS: IpRightStatus[] = ['pending', 'filed', 'registered', 'expired', 'cancelled']

export function IpRightsPage() {
  const { t } = useTranslation(['matters', 'common'])
  const [clientId, setClientId] = useState<string | undefined>()
  const [jurisdiction, setJurisdiction] = useState<string | undefined>()
  const [status, setStatus] = useState<IpRightStatus | undefined>()
  const [matterType, setMatterType] = useState<MatterType | undefined>()
  const [expiryFrom, setExpiryFrom] = useState<string>('')
  const [expiryTo, setExpiryTo] = useState<string>('')

  const { data: clientsData } = useClients({ limit: 200 })
  const clients = clientsData?.items ?? []

  const filters: IpRightsFilters = useMemo(
    () => ({
      clientId,
      jurisdiction,
      status,
      matterType,
      expiryFrom: expiryFrom || undefined,
      expiryTo: expiryTo || undefined,
      limit: PAGE_SIZE,
    }),
    [clientId, jurisdiction, status, matterType, expiryFrom, expiryTo],
  )

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ip-rights', filters],
    queryFn: () => ipRightsApi.list(filters),
    staleTime: 30_000,
  })

  const items: IpRightsListItem[] = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">{t('ipRightsRegister.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t('ipRightsRegister.description')}
          </p>
        </div>
        {isError ? (
          <Button type="button" onClick={() => void refetch()}>
            {t('actions.retry', { ns: 'common' })}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/15 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('ipRightsRegister.filters.client')}
          </label>
          <Select
            value={clientId ?? ALL}
            onValueChange={(v) => {
              if (!v || v === ALL) setClientId(undefined)
              else setClientId(v)
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('ipRightsRegister.filters.allClients')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('ipRightsRegister.filters.all')}</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {clientDisplayName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('ipRightsRegister.filters.jurisdiction')}
          </label>
          <Select
            value={jurisdiction ?? ALL}
            onValueChange={(v) => {
              if (!v || v === ALL) setJurisdiction(undefined)
              else setJurisdiction(v)
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('ipRightsRegister.filters.allJurisdictions')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('ipRightsRegister.filters.all')}</SelectItem>
              {JURISDICTION_OPTIONS.map((j) => (
                <SelectItem key={j.value} value={j.value}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('ipRightsRegister.filters.matterType')}
          </label>
          <Select
            value={matterType ?? ALL}
            onValueChange={(v) => setMatterType(v === ALL ? undefined : (v as MatterType))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('ipRightsRegister.filters.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('ipRightsRegister.filters.all')}</SelectItem>
              {MATTER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {matterTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('ipRightsRegister.filters.status')}
          </label>
          <Select
            value={status ?? ALL}
            onValueChange={(v) => setStatus(v === ALL ? undefined : (v as IpRightStatus))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t('ipRightsRegister.filters.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('ipRightsRegister.filters.all')}</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {ipRightStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('ipRightsRegister.filters.expiryFrom')}
          </label>
          <Input type="date" value={expiryFrom} onChange={(e) => setExpiryFrom(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('ipRightsRegister.filters.expiryTo')}
          </label>
          <Input type="date" value={expiryTo} onChange={(e) => setExpiryTo(e.target.value)} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ipRightsRegister.table.ipRight')}</TableHead>
            <TableHead>{t('ipRightsRegister.table.type')}</TableHead>
            <TableHead>{t('ipRightsRegister.table.applicationNo')}</TableHead>
            <TableHead>{t('ipRightsRegister.table.jurisdiction')}</TableHead>
            <TableHead>{t('ipRightsRegister.table.expiry')}</TableHead>
            <TableHead>{t('ipRightsRegister.table.status')}</TableHead>
            <TableHead>{t('ipRightsRegister.table.matter')}</TableHead>
            <TableHead>{t('ipRightsRegister.table.client')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {t('ipRightsRegister.loading')}
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {t('ipRightsRegister.empty')}
              </TableCell>
            </TableRow>
          ) : (
            items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <Link to={`/matters/${row.matterId}/ip-rights`} className="hover:underline">
                    {row.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{matterTypeLabel(row.matterType)}</TableCell>
                <TableCell>{row.applicationNumber ?? row.registrationNumber ?? '-'}</TableCell>
                <TableCell>{row.jurisdiction}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.expiryDate ? formatMatterDate(row.expiryDate) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ipRightStatusLabel(row.status)}</Badge>
                </TableCell>
                <TableCell>
                  <Link to={`/matters/${row.matterId}`} className="hover:underline">
                    {row.matterTitle}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.clientName}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
