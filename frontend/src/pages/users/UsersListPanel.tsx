import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { USERS_PAGE_SIZE, UsersTable } from '@/components/users/UsersTable'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { UserFilters, UserSegment } from '@/features/users/types'

const ALL_STATUSES = 'all'

type UsersListPanelProps = {
  segment: UserSegment
  title: string
  description: string
}

export function UsersListPanel({ segment, title, description }: UsersListPanelProps) {
  const { t } = useTranslation('users')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>()
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPageIndex(0)
    setCursors([undefined])
  }, [debouncedSearch, statusFilter, segment])

  const filters: UserFilters = {
    segment,
    search: debouncedSearch || undefined,
    isActive: statusFilter,
    limit: USERS_PAGE_SIZE,
    cursor: cursors[pageIndex],
  }

  const { data, isLoading, isError } = useUsers(filters)

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
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/15 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              segment === 'portal'
                ? t('filters.searchPortal')
                : t('filters.searchTeam')
            }
            className="bg-background pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={
            statusFilter === undefined
              ? ALL_STATUSES
              : statusFilter
                ? 'active'
                : 'inactive'
          }
          onValueChange={(v) => {
            if (v === ALL_STATUSES) setStatusFilter(undefined)
            else setStatusFilter(v === 'active')
          }}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder={t('filters.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>{t('filters.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('filters.activeOnly')}</SelectItem>
            <SelectItem value="inactive">{t('filters.inactiveOnly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <UsersTable
        segment={segment}
        items={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        pageIndex={pageIndex}
        hasNextPage={Boolean(data?.nextCursor)}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
      />
    </div>
  )
}
