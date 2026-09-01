import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FilePlus2, Search } from 'lucide-react'
import { MattersTable } from '@/components/matters/MattersTable'
import { CancellationsTable } from '@/components/matters/CancellationsTable'
import { DeletionsTable } from '@/components/matters/DeletionsTable'
import { ObjectionsTable } from '@/components/matters/ObjectionsTable'
import { OppositionsTable } from '@/components/matters/OppositionsTable'
import { TrademarksTable } from '@/components/matters/TrademarksTable'
import { PatentsTable } from '@/components/matters/PatentsTable'
import { DesignsTable } from '@/components/matters/DesignsTable'
import { UtilityModelsTable } from '@/components/matters/UtilityModelsTable'
import { SpcTable } from '@/components/matters/SpcTable'
import { GiTable } from '@/components/matters/GiTable'
import { CasesTable } from '@/components/matters/CasesTable'
import { OthersTable } from '@/components/matters/OthersTable'
import { PatentListFilters } from '@/components/matters/PatentListFilters'
import { DesignListFilters } from '@/components/matters/DesignListFilters'
import { UtilityModelListFilters } from '@/components/matters/UtilityModelListFilters'
import { SpcListFilters } from '@/components/matters/SpcListFilters'
import { GiListFilters } from '@/components/matters/GiListFilters'
import { TrademarkListFilters } from '@/components/matters/TrademarkListFilters'
import { otherMatterCreatePath } from '@/features/create-file/other-matter-routes'
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
import {
  DEFAULT_TRADEMARK_LIST_SHELF,
  normalizeTrademarkListShelf,
  TRADEMARK_PROCEDURE_QUERY_KEY,
} from '@/features/matters/trademark-procedures-nav'
import {
  EMPTY_TRADEMARK_LIST_FILTERS,
  parseTrademarkListFilters,
  trademarkListFiltersToApi,
  writeTrademarkListFilters,
  type TrademarkListFilterState,
} from '@/features/matters/trademark-list-filters'
import {
  EMPTY_PATENT_LIST_FILTERS,
  parsePatentListFilters,
  patentListFiltersToApi,
  writePatentListFilters,
  type PatentListFilterState,
} from '@/features/matters/patent-list-filters'
import {
  EMPTY_DESIGN_LIST_FILTERS,
  parseDesignListFilters,
  designListFiltersToApi,
  writeDesignListFilters,
  type DesignListFilterState,
} from '@/features/matters/design-list-filters'
import {
  EMPTY_UTILITY_MODEL_LIST_FILTERS,
  parseUtilityModelListFilters,
  utilityModelListFiltersToApi,
  writeUtilityModelListFilters,
  type UtilityModelListFilterState,
} from '@/features/matters/utility-model-list-filters'
import {
  EMPTY_SPC_LIST_FILTERS,
  parseSpcListFilters,
  spcListFiltersToApi,
  writeSpcListFilters,
  type SpcListFilterState,
} from '@/features/matters/spc-list-filters'
import {
  EMPTY_GI_LIST_FILTERS,
  parseGiListFilters,
  giListFiltersToApi,
  writeGiListFilters,
  type GiListFilterState,
} from '@/features/matters/gi-list-filters'
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
  const spcOnly = searchParams.get('spcOnly') === '1'
  const statusFilter = parseMatterStatus(searchParams.get('status'))
  const archivedOnly = searchParams.get('archived') === '1'
  const draftsOnly = searchParams.get('drafts') === '1'
  const othersGroup = searchParams.get('group') === 'others'

  const rawTrademarkProcedure = searchParams.get(TRADEMARK_PROCEDURE_QUERY_KEY)
  const trademarkListShelf = normalizeTrademarkListShelf(rawTrademarkProcedure)

  const primaryShelf =
    !archivedOnly &&
    !draftsOnly &&
    !othersGroup &&
    typeFilter &&
    isPrimaryMatterType(typeFilter)
      ? typeFilter
      : undefined

  const effectiveTrademarkShelf =
    primaryShelf === 'trademark'
      ? trademarkListShelf ?? DEFAULT_TRADEMARK_LIST_SHELF
      : undefined

  const othersTypeFilter =
    othersGroup && typeFilter && isOtherMatterType(typeFilter) ? typeFilter : undefined

  useEffect(() => {
    if (primaryShelf !== 'trademark') return
    const canonical =
      trademarkListShelf ??
      (rawTrademarkProcedure ? null : DEFAULT_TRADEMARK_LIST_SHELF)
    if (!canonical || canonical === rawTrademarkProcedure) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(TRADEMARK_PROCEDURE_QUERY_KEY, canonical)
        return next
      },
      { replace: true },
    )
  }, [primaryShelf, rawTrademarkProcedure, trademarkListShelf, setSearchParams])

  const showTypeFilter =
    !isPortalClient && !primaryShelf && !archivedOnly && !draftsOnly
  const showStatusFilter = !draftsOnly && !archivedOnly
  const typeFilterOptions = othersGroup ? OTHER_MATTER_TYPES : ALL_MATTER_TYPES

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const appliedTrademarkFilters = parseTrademarkListFilters(searchParams)
  const [draftTrademarkFilters, setDraftTrademarkFilters] =
    useState<TrademarkListFilterState>(appliedTrademarkFilters)
  const appliedPatentFilters = parsePatentListFilters(searchParams)
  const [draftPatentFilters, setDraftPatentFilters] =
    useState<PatentListFilterState>(appliedPatentFilters)
  const appliedDesignFilters = parseDesignListFilters(searchParams)
  const [draftDesignFilters, setDraftDesignFilters] =
    useState<DesignListFilterState>(appliedDesignFilters)
  const appliedUtilityModelFilters = parseUtilityModelListFilters(searchParams)
  const [draftUtilityModelFilters, setDraftUtilityModelFilters] =
    useState<UtilityModelListFilterState>(appliedUtilityModelFilters)
  const appliedSpcFilters = parseSpcListFilters(searchParams)
  const [draftSpcFilters, setDraftSpcFilters] =
    useState<SpcListFilterState>(appliedSpcFilters)
  const appliedGiFilters = parseGiListFilters(searchParams)
  const [draftGiFilters, setDraftGiFilters] =
    useState<GiListFilterState>(appliedGiFilters)

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
    effectiveTrademarkShelf,
    pageSize,
    archivedOnly,
    draftsOnly,
    othersGroup,
    searchParams.toString(),
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

  useEffect(() => {
    setDraftTrademarkFilters(parseTrademarkListFilters(searchParams))
    setDraftPatentFilters(parsePatentListFilters(searchParams))
    setDraftDesignFilters(parseDesignListFilters(searchParams))
    setDraftUtilityModelFilters(parseUtilityModelListFilters(searchParams))
    setDraftSpcFilters(parseSpcListFilters(searchParams))
    setDraftGiFilters(parseGiListFilters(searchParams))
  }, [searchParams])

  const applyTrademarkFilters = () => {
    setSearchParams(
      (prev) => writeTrademarkListFilters(prev, draftTrademarkFilters),
      { replace: true },
    )
    setPage(1)
  }

  const clearTrademarkFilters = () => {
    setDraftTrademarkFilters(EMPTY_TRADEMARK_LIST_FILTERS)
    setSearchParams(
      (prev) => writeTrademarkListFilters(prev, EMPTY_TRADEMARK_LIST_FILTERS),
      { replace: true },
    )
    setPage(1)
  }

  const applyPatentFilters = () => {
    setSearchParams(
      (prev) => writePatentListFilters(prev, draftPatentFilters),
      { replace: true },
    )
    setPage(1)
  }

  const clearPatentFilters = () => {
    setDraftPatentFilters(EMPTY_PATENT_LIST_FILTERS)
    setSearchParams(
      (prev) => writePatentListFilters(prev, EMPTY_PATENT_LIST_FILTERS),
      { replace: true },
    )
    setPage(1)
  }

  const applyDesignFilters = () => {
    setSearchParams(
      (prev) => writeDesignListFilters(prev, draftDesignFilters),
      { replace: true },
    )
    setPage(1)
  }

  const clearDesignFilters = () => {
    setDraftDesignFilters(EMPTY_DESIGN_LIST_FILTERS)
    setSearchParams(
      (prev) => writeDesignListFilters(prev, EMPTY_DESIGN_LIST_FILTERS),
      { replace: true },
    )
    setPage(1)
  }

  const applyUtilityModelFilters = () => {
    setSearchParams(
      (prev) => writeUtilityModelListFilters(prev, draftUtilityModelFilters),
      { replace: true },
    )
    setPage(1)
  }

  const clearUtilityModelFilters = () => {
    setDraftUtilityModelFilters(EMPTY_UTILITY_MODEL_LIST_FILTERS)
    setSearchParams(
      (prev) => writeUtilityModelListFilters(prev, EMPTY_UTILITY_MODEL_LIST_FILTERS),
      { replace: true },
    )
    setPage(1)
  }

  const applySpcFilters = () => {
    setSearchParams(
      (prev) => writeSpcListFilters(prev, draftSpcFilters),
      { replace: true },
    )
    setPage(1)
  }

  const clearSpcFilters = () => {
    setDraftSpcFilters(EMPTY_SPC_LIST_FILTERS)
    setSearchParams(
      (prev) => writeSpcListFilters(prev, EMPTY_SPC_LIST_FILTERS),
      { replace: true },
    )
    setPage(1)
  }

  const applyGiFilters = () => {
    setSearchParams(
      (prev) => writeGiListFilters(prev, draftGiFilters),
      { replace: true },
    )
    setPage(1)
  }

  const clearGiFilters = () => {
    setDraftGiFilters(EMPTY_GI_LIST_FILTERS)
    setSearchParams(
      (prev) => writeGiListFilters(prev, EMPTY_GI_LIST_FILTERS),
      { replace: true },
    )
    setPage(1)
  }

  const effectiveStatusFilter =
    draftsOnly ? 'draft' : statusFilter === 'draft' ? undefined : statusFilter

  const filters: MatterFilters = {
    search: debouncedSearch || undefined,
    status: effectiveStatusFilter,
    matterType: primaryShelf ?? othersTypeFilter,
    trademarkProcedure: effectiveTrademarkShelf,
    matterTypes:
      othersGroup && !othersTypeFilter ? OTHER_MATTER_TYPES.join(',') : undefined,
    archivedOnly: archivedOnly || undefined,
    draftsOnly: draftsOnly || undefined,
    excludeDrafts: draftsOnly ? undefined : true,
    ...trademarkListFiltersToApi(appliedTrademarkFilters),
    ...patentListFiltersToApi(appliedPatentFilters),
    ...designListFiltersToApi(appliedDesignFilters),
    ...utilityModelListFiltersToApi(appliedUtilityModelFilters),
    ...spcListFiltersToApi(appliedSpcFilters),
    ...giListFiltersToApi(appliedGiFilters),
    spcOnly: spcOnly || undefined,
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
          : primaryShelf === 'trademark' && effectiveTrademarkShelf
            ? effectiveTrademarkShelf === 'marks'
              ? t('trademarkShelf.marks')
              : t(`createFile.procedures.${effectiveTrademarkShelf}`)
            : primaryShelf === 'patent' && spcOnly
              ? t('spcShelf.title')
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
          : primaryShelf === 'trademark' && effectiveTrademarkShelf
            ? effectiveTrademarkShelf === 'marks'
              ? t('trademarkList.descriptionMarks')
              : t('trademarkList.descriptionProcedure', {
                  procedure: t(`createFile.procedures.${effectiveTrademarkShelf}`),
                })
            : primaryShelf === 'trademark'
              ? t('trademarkList.descriptionMarks')
              : primaryShelf === 'patent' && spcOnly
                ? t('spcList.description')
                : primaryShelf === 'geographical_indication'
                  ? t('giList.description')
                  : primaryShelf === 'cases'
                    ? t('caseList.description')
                    : primaryShelf === 'patent'
                      ? t('patentList.description')
                      : primaryShelf === 'industrial_design'
                        ? t('designList.description')
                        : primaryShelf === 'utility_model'
                          ? t('utilityModelList.description')
                          : primaryShelf
                            ? t('list.descriptionType', { type: matterTypeLabel(primaryShelf) })
                            : t('list.description')

  const isPatentShelf = primaryShelf === 'patent' && !spcOnly
  const isSpcShelf = primaryShelf === 'patent' && spcOnly
  const isDesignShelf = primaryShelf === 'industrial_design'
  const isUtilityModelShelf = primaryShelf === 'utility_model'
  const isGiShelf = primaryShelf === 'geographical_indication'
  const isCaseShelf = primaryShelf === 'cases'
  const isOthersShelf = othersGroup && !isPortalClient
  const isTrademarkShelf = primaryShelf === 'trademark'
  const isMarksShelf = isTrademarkShelf && effectiveTrademarkShelf === 'marks'
  const isObjectionShelf = isTrademarkShelf && effectiveTrademarkShelf === 'objection'
  const isOppositionShelf = isTrademarkShelf && effectiveTrademarkShelf === 'opposition'
  const isCancellationShelf = isTrademarkShelf && effectiveTrademarkShelf === 'cancellation'
  const isDeletionShelf = isTrademarkShelf && effectiveTrademarkShelf === 'deletion'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        {/* Hidden — restore by uncommenting:
        <PermissionGate resource="intake" action="read">
          <Link to="/intake" className={buttonVariants({ variant: 'outline' })}>
            <Inbox className="size-4" />
            {t('list.intakeQueue')}
          </Link>
        </PermissionGate>
        */}
        {isOthersShelf ? (
          <Link
            to={othersTypeFilter ? otherMatterCreatePath(othersTypeFilter) : '/files/new/other'}
            className={buttonVariants({ variant: 'default' })}
          >
            <FilePlus2 className="size-4" />
            {t('createFile.otherFilesTitle')}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/15 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        {!isMarksShelf && !isPatentShelf && !isDesignShelf && !isUtilityModelShelf && !isSpcShelf && !isGiShelf && !isCaseShelf ? (
          <>
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
          </>
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

      {isMarksShelf && !isPortalClient ? (
        <TrademarkListFilters
          value={draftTrademarkFilters}
          onChange={setDraftTrademarkFilters}
          onApply={applyTrademarkFilters}
          onClear={clearTrademarkFilters}
        />
      ) : null}

      {isPatentShelf && !isPortalClient ? (
        <PatentListFilters
          value={draftPatentFilters}
          onChange={setDraftPatentFilters}
          onApply={applyPatentFilters}
          onClear={clearPatentFilters}
        />
      ) : null}

      {isDesignShelf && !isPortalClient ? (
        <DesignListFilters
          value={draftDesignFilters}
          onChange={setDraftDesignFilters}
          onApply={applyDesignFilters}
          onClear={clearDesignFilters}
        />
      ) : null}

      {isUtilityModelShelf && !isPortalClient ? (
        <UtilityModelListFilters
          value={draftUtilityModelFilters}
          onChange={setDraftUtilityModelFilters}
          onApply={applyUtilityModelFilters}
          onClear={clearUtilityModelFilters}
        />
      ) : null}

      {isSpcShelf && !isPortalClient ? (
        <SpcListFilters
          value={draftSpcFilters}
          onChange={setDraftSpcFilters}
          onApply={applySpcFilters}
          onClear={clearSpcFilters}
        />
      ) : null}

      {isGiShelf && !isPortalClient ? (
        <GiListFilters
          value={draftGiFilters}
          onChange={setDraftGiFilters}
          onApply={applyGiFilters}
          onClear={clearGiFilters}
        />
      ) : null}

      {isCaseShelf && !isPortalClient && data?.total != null ? (
        <p className="text-sm font-medium text-foreground">
          {t('caseList.searchResults', { count: data.total })}
        </p>
      ) : null}

      {isGiShelf && !isPortalClient && data?.total != null ? (
        <p className="text-sm font-medium text-foreground">
          {t('giList.searchResults', { count: data.total })}
        </p>
      ) : null}

      {isSpcShelf && !isPortalClient && data?.total != null ? (
        <p className="text-sm font-medium text-foreground">
          {t('spcList.searchResults', { count: data.total })}
        </p>
      ) : null}

      {isUtilityModelShelf && !isPortalClient && data?.total != null ? (
        <p className="text-sm font-medium text-foreground">
          {t('utilityModelList.searchResults', { count: data.total })}
        </p>
      ) : null}

      {isDesignShelf && !isPortalClient && data?.total != null ? (
        <p className="text-sm font-medium text-foreground">
          {t('designList.searchResults', { count: data.total })}
        </p>
      ) : null}

      {isObjectionShelf && !isPortalClient ? (
        <ObjectionsTable
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
      ) : isOppositionShelf && !isPortalClient ? (
        <OppositionsTable
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
      ) : isCancellationShelf && !isPortalClient ? (
        <CancellationsTable
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
      ) : isDeletionShelf && !isPortalClient ? (
        <DeletionsTable
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
      ) : isCaseShelf && !isPortalClient ? (
        <CasesTable
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
      ) : isOthersShelf ? (
        <OthersTable
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
      ) : isGiShelf && !isPortalClient ? (
        <GiTable
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
      ) : isSpcShelf && !isPortalClient ? (
        <SpcTable
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
      ) : isUtilityModelShelf && !isPortalClient ? (
        <UtilityModelsTable
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
      ) : isDesignShelf && !isPortalClient ? (
        <DesignsTable
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
      ) : isPatentShelf && !isPortalClient ? (
        <PatentsTable
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
      ) : isTrademarkShelf && !isPortalClient ? (
        <TrademarksTable
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
      ) : (
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
      )}
    </div>
  )
}
