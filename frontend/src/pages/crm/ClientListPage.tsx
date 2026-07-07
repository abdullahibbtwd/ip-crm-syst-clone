import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { CLIENT_PAGE_SIZE, ClientsTable } from '@/components/crm/ClientsTable'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/features/crm/hooks/useClients'
import type { ClientFilters, ClientStatus, ClientType } from '@/features/crm/types'
import { clientStatusLabel, clientTypeLabel } from '@/features/crm/utils'

const ALL_STATUSES = 'All'
const ALL_TYPES = 'All'

export function ClientListPage() {
  const { t } = useTranslation(['crm', 'common'])
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<ClientType | undefined>()
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPageIndex(0)
    setCursors([undefined])
  }, [debouncedSearch, statusFilter, typeFilter])

  const filters: ClientFilters = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    type: typeFilter,
    limit: CLIENT_PAGE_SIZE,
    cursor: cursors[pageIndex],
  }

  const { data, isLoading, isError, isFetching } = useClients(filters)

  const handleNextPage = () => {
    if (!data?.nextCursor) return
    setCursors((prev) => {
      const next = [...prev]
      next[pageIndex + 1] = data.nextCursor ?? undefined
      return next
    })
    setPageIndex((p) => p + 1)
  }

  const handlePreviousPage = () => {
    if (pageIndex > 0) setPageIndex((p) => p - 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('clients.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t('clients.description')}{' '}
            {t('clients.perPage', { count: CLIENT_PAGE_SIZE })}
          </p>
        </div>
        <PermissionGate resource="intake" action="create">
          <Link to="/intake/new" className={buttonVariants({ variant: 'default' })}>
            <Plus className="size-4" />
            {t('clients.newViaIntake')}
          </Link>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/15 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('clients.searchPlaceholder')}
            className="bg-background pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter ?? ALL_STATUSES}
          onValueChange={(v) =>
            setStatusFilter(v === ALL_STATUSES ? undefined : (v as ClientStatus))
          }
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder={t('filters.allStatuses', { ns: 'common' })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>{t('filters.allStatuses', { ns: 'common' })}</SelectItem>
            {(['active', 'prospect', 'inactive', 'archived'] as ClientStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {clientStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter ?? ALL_TYPES}
          onValueChange={(v) => setTypeFilter(v === ALL_TYPES ? undefined : (v as ClientType))}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder={t('filters.allTypes', { ns: 'common' })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>{t('filters.allTypes', { ns: 'common' })}</SelectItem>
            {(['company', 'individual'] as ClientType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {clientTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ClientsTable
        items={data?.items ?? []}
        isLoading={isLoading || (isFetching && !data)}
        isError={isError}
        pageIndex={pageIndex}
        hasNextPage={Boolean(data?.nextCursor)}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
      />
    </div>
  )
}
