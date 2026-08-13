import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, Search } from 'lucide-react'
import { MattersTable } from '@/components/matters/MattersTable'
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
import {
  isOtherMatterType,
  isPrimaryMatterType,
  OTHER_MATTER_TYPES,
} from '@/features/matters/work-file-groups'
import { ALL_MATTER_TYPES, matterStatusLabel, matterTypeLabel } from '@/features/matters/utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'

const ALL_STATUSES = 'all'
const ALL_TYPES = 'all'

const MATTER_STATUSES: MatterStatus[] = ['active', 'on_hold', 'closed', 'abandoned']
const MATTER_STATUS_SET = new Set<string>([
  'draft',
  'active',
  'on_hold',
  'closed',
  'abandoned',
])
const MATTER_TYPE_SET = new Set<string>(ALL_MATTER_TYPES)

function parseMatterType(value: string | null): MatterType | undefined {
  if (!value || !MATTER_TYPE_SET.has(value)) return undefined
  return value as MatterType
}

function parseMatterStatus(value: string | null): MatterStatus | undefined {
  if (!value || !MATTER_STATUS_SET.has(value)) return undefined
  return value as MatterStatus
}

export function MatterListPage() {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const isPortalClient = user?.roles.includes('portal_client') ?? false
  const [searchParams, setSearchParams] = useSearchParams()

  const typeFilter = parseMatterType(searchParams.get('matterType'))
  const statusFilter = parseMatterStatus(searchParams.get('status'))
  const archivedOnly = searchParams.get('archived') === '1'
  const draftsOnly = searchParams.get('drafts') === '1'
  const othersGroup = searchParams.get('group') === 'others'

  const primaryShelf =
    !archivedOnly &&
    !draftsOnly &&
    !othersGroup &&
    typeFilter &&
    isPrimaryMatterType(typeFilter)
      ? typeFilter
      : undefined

  const othersTypeFilter =
    othersGroup && typeFilter && isOtherMatterType(typeFilter) ? typeFilter : undefined

  const showTypeFilter =
    !isPortalClient && !primaryShelf && !archivedOnly && !draftsOnly
  const showStatusFilter = !draftsOnly && !archivedOnly
  const typeFilterOptions = othersGroup ? OTHER_MATTER_TYPES : ALL_MATTER_TYPES

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [
    debouncedSearch,
    statusFilter,
    typeFilter,
    pageSize,
    archivedOnly,
    draftsOnly,
    othersGroup,
  ])

  const setTypeFilter = (value: MatterType | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('matterType', value)
        else next.delete('matterType')
        return next
      },
      { replace: true },
    )
  }

  const setStatusFilter = (value: MatterStatus | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('status', value)
        else next.delete('status')
        return next
      },
      { replace: true },
    )
  }

  const filters: MatterFilters = {
    search: debouncedSearch || undefined,
    status: draftsOnly ? 'draft' : statusFilter,
    matterType: primaryShelf ?? othersTypeFilter,
    matterTypes:
      othersGroup && !othersTypeFilter ? OTHER_MATTER_TYPES.join(',') : undefined,
    archivedOnly: archivedOnly || undefined,
    draftsOnly: draftsOnly || undefined,
    excludeDrafts:
      !draftsOnly && !archivedOnly && !statusFilter ? true : undefined,
    page,
    limit: pageSize,
  }

  const { data, isLoading, isError, isFetching } = useMatters(filters)

  const title = isPortalClient
    ? t('list.titlePortal')
    : draftsOnly
      ? t('list.titleDrafts')
      : archivedOnly
        ? t('list.titleArchived')
        : othersGroup
          ? t('list.titleOthers')
          : primaryShelf
            ? matterTypeLabel(primaryShelf)
            : t('list.title')

  const description = isPortalClient
    ? t('list.descriptionPortal')
    : draftsOnly
      ? t('list.descriptionDrafts')
      : archivedOnly
        ? t('list.descriptionArchived')
        : othersGroup
          ? t('list.descriptionOthers')
          : primaryShelf
            ? t('list.descriptionType', { type: matterTypeLabel(primaryShelf) })
            : t('list.description')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        <PermissionGate resource="intake" action="read">
          <Link to="/intake" className={buttonVariants({ variant: 'outline' })}>
            <Inbox className="size-4" />
            {t('list.intakeQueue')}
          </Link>
        </PermissionGate>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/15 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full flex-1 sm:min-w-[220px] sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('list.searchPlaceholder')}
            className="bg-background pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {showTypeFilter ? (
          <Select
            value={(othersGroup ? othersTypeFilter : typeFilter) ?? ALL_TYPES}
            onValueChange={(v) =>
              setTypeFilter(v === ALL_TYPES ? undefined : (v as MatterType))
            }
          >
            <SelectTrigger className="w-full bg-background sm:w-[200px]">
              <SelectValue
                placeholder={
                  othersGroup ? t('list.filters.allOtherTypes') : t('list.filters.allTypes')
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>
                {othersGroup ? t('list.filters.allOtherTypes') : t('list.filters.allTypes')}
              </SelectItem>
              {typeFilterOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {matterTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {showStatusFilter ? (
        <Select
          value={statusFilter ?? ALL_STATUSES}
          onValueChange={(v) =>
            setStatusFilter(v === ALL_STATUSES ? undefined : (v as MatterStatus))
          }
        >
          <SelectTrigger className="w-full bg-background sm:w-[160px]">
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
        ) : null}
      </div>

      <MattersTable
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
        compact={isPortalClient}
      />
    </div>
  )
}
