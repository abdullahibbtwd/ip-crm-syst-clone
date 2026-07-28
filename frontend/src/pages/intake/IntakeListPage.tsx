import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { IntakeLeadsTable } from '@/components/intake/IntakeLeadsTable'
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
import { useIntakeLeads } from '@/features/intake/hooks/useIntake'
import type { IntakeFilters, IntakeStatus } from '@/features/intake/types'
import { intakeStatusLabel } from '@/features/intake/utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'

const ALL_STATUSES = 'all'
const INTAKE_STATUSES: IntakeStatus[] = [
  'new',
  'reviewing',
  'conflict_check',
  'conflict_flagged',
  'approved',
  'rejected',
  'converted',
]

const INTAKE_STATUS_SET = new Set<string>(INTAKE_STATUSES)

function parseIntakeStatus(value: string | null): IntakeStatus | undefined {
  if (!value || !INTAKE_STATUS_SET.has(value)) return undefined
  return value as IntakeStatus
}

export function IntakeListPage() {
  const { t } = useTranslation(['intake', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = parseIntakeStatus(searchParams.get('status'))

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
  }, [debouncedSearch, statusFilter, pageSize])

  const setStatusFilter = (value: IntakeStatus | undefined) => {
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

  const filters: IntakeFilters = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    page,
    limit: pageSize,
  }

  const { data, isLoading, isError, isFetching } = useIntakeLeads(filters)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('list.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('list.description')}</p>
        </div>
        <PermissionGate resource="intake" action="create">
          <Link to="/intake/new" className={buttonVariants({ variant: 'default' })}>
            <Plus className="size-4" />
            {t('list.new')}
          </Link>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/15 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('list.searchPlaceholder')}
            className="bg-background pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter ?? ALL_STATUSES}
          onValueChange={(v) =>
            setStatusFilter(v === ALL_STATUSES ? undefined : (v as IntakeStatus))
          }
        >
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder={t('filters.allStatuses', { ns: 'common' })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>{t('filters.allStatuses', { ns: 'common' })}</SelectItem>
            {INTAKE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {intakeStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <IntakeLeadsTable
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
