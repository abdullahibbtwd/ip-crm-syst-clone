import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { CLIENT_STATUS_LABELS, CLIENT_TYPE_LABELS } from '@/features/crm/utils'

const ALL_STATUSES = 'All'
const ALL_TYPES = 'All'

export function ClientListPage() {
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
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">Clients</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Manage company and individual client records. New clients are created via intake.{' '}
            {CLIENT_PAGE_SIZE} per page.
          </p>
        </div>
        <PermissionGate resource="intake" action="create">
          <Link to="/intake/new" className={buttonVariants({ variant: 'default' })}>
            <Plus className="size-4" />
            New client via intake
          </Link>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/15 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or code…"
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
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {CLIENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter ?? ALL_TYPES}
          onValueChange={(v) => setTypeFilter(v === ALL_TYPES ? undefined : (v as ClientType))}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All types</SelectItem>
            {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {CLIENT_TYPE_LABELS[type]}
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
