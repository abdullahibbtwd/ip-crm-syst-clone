import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { matterStatusLabel, matterTypeLabel } from '@/features/matters/utils'

const ALL_STATUSES = 'All'
const ALL_TYPES = 'All'

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

const MATTER_STATUSES: MatterStatus[] = ['draft', 'active', 'on_hold', 'closed', 'abandoned']

export function MatterListPage() {
  const { t } = useTranslation('matters')
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
            {isPortalClient ? t('list.titlePortal') : t('list.title')}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {isPortalClient ? t('list.descriptionPortal') : t('list.description')}{' '}
            {t('list.perPage', { count: MATTER_PAGE_SIZE })}
          </p>
        </div>
        <PermissionGate resource="intake" action="read">
          <Link to="/intake" className={buttonVariants({ variant: 'outline' })}>
            <Inbox className="size-4" />
            {t('list.intakeQueue')}
          </Link>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/15 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('list.searchPlaceholder')}
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
            <SelectValue placeholder={t('list.filters.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>{t('list.filters.allTypes')}</SelectItem>
            {MATTER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {matterTypeLabel(type)}
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
            <SelectValue placeholder={t('list.filters.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>{t('list.filters.allStatuses')}</SelectItem>
            {MATTER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {matterStatusLabel(status)}
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
