import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Search } from 'lucide-react'
import { MattersTable, MATTER_PAGE_SIZE } from '@/components/matters/MattersTable'
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
import { useAuth } from '@/features/auth/AuthProvider'
import { useMatters } from '@/features/matters/hooks/useMatters'
import type { MatterFilters, MatterStatus, MatterType } from '@/features/matters/types'
import { MATTER_STATUS_LABELS, MATTER_TYPE_LABELS } from '@/features/matters/utils'

const ALL_STATUSES = 'All'
const ALL_TYPES = 'All'

const MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]
const MATTER_STATUSES = Object.keys(MATTER_STATUS_LABELS) as MatterStatus[]

export function MatterListPage() {
  const { user } = useAuth()
  const isPortalClient = user?.roles.includes('portal_client') ?? false
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MatterStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<MatterType | undefined>()
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

  const filters: MatterFilters = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    matterType: typeFilter,
    limit: MATTER_PAGE_SIZE,
    cursor: cursors[pageIndex],
  }

  const { data, isLoading, isError, isFetching } = useMatters(filters)

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
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">
            {isPortalClient ? 'My matters' : 'Matters'}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {isPortalClient
              ? 'Matters opened for your organisation after intake conversion.'
              : 'Portfolio view of all legal matters - search by title, client, or application number.'}{' '}
            {MATTER_PAGE_SIZE} per page.
          </p>
        </div>
        <PermissionGate resource="intake" action="read">
          <Link to="/intake" className={buttonVariants({ variant: 'outline' })}>
            <Inbox className="size-4" />
            Intake queue
          </Link>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/15 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, client, application no…"
            className="bg-background pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={typeFilter ?? ALL_TYPES}
          onValueChange={(v) => setTypeFilter(v === ALL_TYPES ? undefined : (v as MatterType))}
        >
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All types</SelectItem>
            {MATTER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {MATTER_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter ?? ALL_STATUSES}
          onValueChange={(v) =>
            setStatusFilter(v === ALL_STATUSES ? undefined : (v as MatterStatus))
          }
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {MATTER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {MATTER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MattersTable
        items={data?.items ?? []}
        isLoading={isLoading || (isFetching && !data)}
        isError={isError}
        pageIndex={pageIndex}
        hasNextPage={Boolean(data?.nextCursor)}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        compact={isPortalClient}
      />
    </div>
  )
}
