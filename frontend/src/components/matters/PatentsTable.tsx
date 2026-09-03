import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock, FolderOpen } from 'lucide-react'
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
import { useOpenMatter } from '@/features/matters/useOpenMatter'
import {
  formatPatentClaims,
  formatRefNumberDate,
  patentProsecutionStageLabel,
  patentTerritoryLabel,
} from '@/features/matters/patent-list-utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'

export const PATENT_PAGE_SIZE = DEFAULT_PAGE_SIZE

type PatentsTableProps = {
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
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className={cn(i % 2 === 0 ? 'bg-background' : 'bg-muted/25')}>
          {Array.from({ length: 8 }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 animate-pulse rounded bg-muted/80" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function ownerName(matter: MatterListItem): string {
  const summary = matter.patentSummary
  if (summary?.ownerName) return summary.ownerName
  const applicant = matter.applicantClient
  if (applicant) return clientDisplayName(applicant)
  return clientDisplayName(matter.client)
}

export function PatentsTable({
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
}: PatentsTableProps) {
  const { t } = useTranslation(['matters', 'common'])
  const { open: openMatter, linkState, onLinkClick } = useOpenMatter()
  const colCount = 8

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = (page - 1) * pageSize + items.length

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
            <TableHead className="min-w-[160px]">{t('patentList.columns.name')}</TableHead>
            <TableHead className="min-w-[100px]">{t('patentList.columns.territory')}</TableHead>
            <TableHead className="min-w-[130px]">{t('patentList.columns.incomingRef')}</TableHead>
            <TableHead className="min-w-[140px]">{t('patentList.columns.stage')}</TableHead>
            <TableHead className="min-w-[90px]">{t('patentList.columns.claims')}</TableHead>
            <TableHead className="min-w-[140px]">{t('patentList.columns.owner')}</TableHead>
            <TableHead className="min-w-[120px]">{t('patentList.columns.registration')}</TableHead>
            <TableHead className="min-w-[130px]">{t('patentList.columns.deadline')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeleton />}

          {!isLoading && isError && (
            <TableRow>
              <TableCell colSpan={colCount} className="py-16 text-center">
                <p className="text-sm font-medium text-destructive">{t('table.error')}</p>
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
                    <p className="font-medium text-foreground">{t('table.empty')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('patentList.emptyDescription')}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            !isError &&
            items.map((matter, index) => {
              const summary = matter.patentSummary
              const incoming = formatRefNumberDate(
                summary?.incomingNumber,
                summary?.incomingDate,
              )
              const registration = formatRefNumberDate(
                summary?.registrationNumber,
                summary?.registrationDate,
              )
              const openCount = matter.openDeadlineCount ?? 0
              const overdueCount = matter.overdueDeadlineCount ?? 0
              const hasDeadline = openCount > 0

              return (
                <TableRow
                  key={matter.id}
                  className={cn(
                    'cursor-pointer border-border/40 transition-colors',
                    index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
                    hasDeadline && 'border-l-4 border-l-destructive',
                  )}
                  tabIndex={0}
                  role="link"
                  aria-label={t('table.viewAria', { title: matter.title })}
                  onClick={() => openMatter(matter.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openMatter(matter.id)
                    }
                  }}
                >
                  <TableCell className="whitespace-normal py-3 font-medium">
                    <Link
                      to={`/matters/${matter.id}/overview`}
                      state={linkState}
                      className="text-primary hover:underline"
                      onClick={onLinkClick}
                    >
                      {matter.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {patentTerritoryLabel(summary?.territoryCode ?? null)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    <div className="font-mono text-xs font-semibold">{incoming.primary}</div>
                    {incoming.secondary ? (
                      <div className="text-xs text-muted-foreground">{incoming.secondary}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="normal-case font-medium tracking-normal">
                      {patentProsecutionStageLabel(
                        summary?.prosecutionStage ?? null,
                        summary?.patentProcedure ?? null,
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm font-medium tabular-nums">
                    {formatPatentClaims(summary ?? null)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">{ownerName(matter)}</TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    <div className="font-mono text-xs">{registration.primary}</div>
                    {registration.secondary ? (
                      <div className="text-xs text-muted-foreground">{registration.secondary}</div>
                    ) : null}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {hasDeadline ? (
                      <Link
                        to={`/matters/${matter.id}/deadlines`}
                        state={linkState}
                        onClick={onLinkClick}
                        className="block space-y-1"
                      >
                        <Badge
                          variant="destructive"
                          className="gap-1 normal-case font-bold tabular-nums"
                        >
                          <CalendarClock className="size-3" />
                          {t('patentList.deadlineOpen', { count: openCount })}
                        </Badge>
                        {overdueCount > 0 ? (
                          <p className="text-xs font-medium text-destructive">
                            {t('patentList.deadlineOverdue', { count: overdueCount })}
                          </p>
                        ) : matter.nextDeadlineDueDate ? (
                          <p className="text-xs text-muted-foreground">
                            {t('patentList.deadlineNext', {
                              date: new Intl.DateTimeFormat(undefined, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }).format(new Date(matter.nextDeadlineDueDate)),
                            })}
                          </p>
                        ) : null}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
        {!isLoading && !isError && items.length > 0 ? (
          <TableFooter className="bg-muted/20">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {items.length === 0 ? (
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
        ) : null}
      </Table>
    </div>
  )
}
