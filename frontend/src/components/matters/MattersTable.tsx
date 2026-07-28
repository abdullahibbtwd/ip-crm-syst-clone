import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { Badge } from '@/components/ui/badge'
import { ListTablePaginationControls } from '@/components/ui/list-table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { clientDisplayName } from '@/features/crm/utils'
import type { MatterListItem } from '@/features/matters/types'
import {
  MATTER_TYPE_LABELS,
  formatJurisdictions,
  formatMatterDate,
} from '@/features/matters/utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'

export const MATTER_PAGE_SIZE = DEFAULT_PAGE_SIZE

type MattersTableProps = {
  items: MatterListItem[]
  isLoading?: boolean
  isError?: boolean
  page: number
  pageSize: number
  total?: number
  pageCount?: number
  onPreviousPage: () => void
  onNextPage: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  /** Portal preview: hide client column */
  compact?: boolean
}

function TableSkeleton({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className={cn(i % 2 === 0 ? 'bg-background' : 'bg-muted/25')}>
          {Array.from({ length: colCount }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 animate-pulse rounded bg-muted/80" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function MattersTable({
  items,
  isLoading,
  isError,
  page,
  pageSize,
  total,
  pageCount,
  onPreviousPage,
  onNextPage,
  onPageChange,
  onPageSizeChange,
  compact = false,
}: MattersTableProps) {
  const { t } = useTranslation(['matters', 'common'])
  const navigate = useNavigate()
  const colCount = compact ? 7 : 8

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = (page - 1) * pageSize + items.length

  return (
    <div className="space-y-3">
      {compact && !isLoading && !isError && items.length > 0 ? (
        <ul className="space-y-3 md:hidden">
          {items.map((matter) => {
            const jurisdictionCodes = matter.jurisdictions.map((j) => j.countryCode)
            return (
              <li key={matter.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                  onClick={() => navigate(`/matters/${matter.id}/overview`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium leading-snug break-words">{matter.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {MATTER_TYPE_LABELS[matter.matterType]}
                        {jurisdictionCodes.length > 0
                          ? ` · ${formatJurisdictions(jurisdictionCodes)}`
                          : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <MatterStatusBadge status={matter.status} />
                        {(matter.upcomingDeadlineCount ?? 0) > 0 ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/50 bg-amber-500/10 font-medium normal-case text-amber-700"
                          >
                            <CalendarClock className="size-3" />
                            {matter.upcomingDeadlineCount} upcoming
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatMatterDate(matter.createdAt)}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div
        className={
          compact && !isLoading && !isError && items.length > 0
            ? 'hidden md:block'
            : undefined
        }
      >
    <Table>
      <TableHeader>
        <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
          <TableHead className="w-[26%]">{t('table.title')}</TableHead>
          {!compact && <TableHead>{t('table.client')}</TableHead>}
          <TableHead>{t('table.type')}</TableHead>
          <TableHead>{t('table.jurisdiction')}</TableHead>
          <TableHead>{t('table.leadAttorney')}</TableHead>
          <TableHead>{t('table.deadlines')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead className="text-right">{t('table.created')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <TableSkeleton colCount={colCount} />}

        {!isLoading && isError && (
          <TableRow>
            <TableCell colSpan={colCount} className="py-16 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load matters.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check your connection and permissions, then try again.
              </p>
            </TableCell>
          </TableRow>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <TableRow>
            <TableCell colSpan={colCount} className="py-16 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="size-5 text-muted-foreground" />
                </span>
                <div>
                  <p className="font-medium text-foreground">No matters yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {compact
                      ? 'Submit a filing enquiry - your matter will appear here after our team opens it.'
                      : 'Try adjusting filters or convert an approved intake enquiry.'}
                  </p>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          !isError &&
          items.map((matter, index) => {
            const jurisdictionCodes = matter.jurisdictions.map((j) => j.countryCode)
            const localRefs = matter.jurisdictions
              .map((j) => j.localRefNumber)
              .filter(Boolean) as string[]

            return (
              <TableRow
                key={matter.id}
                className={cn(
                  'cursor-pointer border-border/40 transition-colors',
                  index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
                  matter.status === 'on_hold' && 'border-l-2 border-l-amber-500',
                  matter.status === 'abandoned' && 'border-l-2 border-l-destructive/70',
                )}
                tabIndex={0}
                role="link"
                aria-label={`View ${matter.title}`}
                onClick={() => navigate(`/matters/${matter.id}/overview`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/matters/${matter.id}/overview`)
                  }
                }}
              >
                <TableCell className="whitespace-normal py-4">
                  <Link
                    to={`/matters/${matter.id}/overview`}
                    className="font-medium text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {matter.title}
                  </Link>
                  {localRefs.length > 0 ? (
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {localRefs.join(' · ')}
                    </p>
                  ) : null}
                </TableCell>
                {!compact && (
                  <TableCell className="whitespace-normal">
                    <Link
                      to={`/clients/${matter.clientId}/overview`}
                      className="text-foreground hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {clientDisplayName(matter.client)}
                    </Link>
                    {matter.client.internalCode ? (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {matter.client.internalCode}
                      </p>
                    ) : null}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className="normal-case font-medium tracking-normal">
                    {MATTER_TYPE_LABELS[matter.matterType]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatJurisdictions(jurisdictionCodes)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {matter.assignedTo?.fullName ?? '-'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {(matter.upcomingDeadlineCount ?? 0) > 0 ? (
                    <Link to={`/matters/${matter.id}/deadlines`}>
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/50 bg-amber-500/10 font-medium normal-case text-amber-700 dark:text-amber-400"
                      >
                        <CalendarClock className="size-3" />
                        {matter.upcomingDeadlineCount} upcoming
                      </Badge>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <MatterStatusBadge status={matter.status} />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMatterDate(matter.createdAt)}
                </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
      <TableFooter className="bg-muted/20">
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colCount} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t('common:loading.default')}
                  </span>
                ) : items.length === 0 ? (
                  t('common:pagination.noResults')
                ) : (
                  <>
                    {t('common:pagination.showing', { start: rangeStart, end: rangeEnd })}
                    {total != null ? (
                      <>
                        {' '}
                        {t('list.pagination.ofTotal', { total })}
                      </>
                    ) : null}
                  </>
                )}
              </p>
              <ListTablePaginationControls
                page={page}
                pageSize={pageSize}
                pageCount={pageCount}
                isLoading={isLoading}
                onPreviousPage={onPreviousPage}
                onNextPage={onNextPage}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            </div>
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
      </div>
    </div>
  )
}
