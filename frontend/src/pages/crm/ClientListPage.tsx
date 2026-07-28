import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { ClientsTable } from '@/components/crm/ClientsTable'
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
import {
  CLIENT_SORT_OPTIONS,
  DEFAULT_CLIENT_PAGE_SIZE,
  DEFAULT_CLIENT_SORT,
  clientSortLabelKey,
  parseClientSort,
} from '@/features/crm/clientListOptions'
import { useClients } from '@/features/crm/hooks/useClients'
import type { ClientFilters, ClientSort, ClientStatus, ClientType } from '@/features/crm/types'
import { clientStatusLabel, clientTypeLabel } from '@/features/crm/utils'

const ALL_STATUSES = 'all'
const ALL_TYPES = 'all'

export function ClientListPage() {
  const { t } = useTranslation(['crm', 'common'])
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<ClientType | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_CLIENT_PAGE_SIZE)
  const [sort, setSort] = useState<ClientSort>(DEFAULT_CLIENT_SORT)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, typeFilter, pageSize, sort])

  const { sortBy, sortOrder } = parseClientSort(sort)

  const filters: ClientFilters = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    type: typeFilter,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  }

  const { data, isLoading, isError, isFetching } = useClients(filters)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('clients.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('clients.description')}</p>
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
        <Select value={sort} onValueChange={(v) => setSort((v as ClientSort) ?? DEFAULT_CLIENT_SORT)}>
          <SelectTrigger className="w-[190px] bg-background">
            <SelectValue placeholder={t('clients.sort.label')}>
              {(value) => t(clientSortLabelKey(String(value)))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CLIENT_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} label={t(option.labelKey)}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ClientsTable
        items={data?.items ?? []}
        isLoading={isLoading || (isFetching && !data)}
        isError={isError}
        page={data?.page ?? page}
        pageSize={data?.limit ?? pageSize}
        total={data?.total}
        pageCount={data?.pageCount}
        onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => current + 1)}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
