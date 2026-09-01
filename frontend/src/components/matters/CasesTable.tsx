import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Folder, FolderOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { MatterListItem } from '@/features/matters/types'
import {
  formatCaseCourt,
  formatCaseNumber,
  formatCaseParties,
  formatCaseStatus,
} from '@/features/matters/case-list-utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'

export const CASES_PAGE_SIZE = DEFAULT_PAGE_SIZE

type CasesTableProps = {
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
          {Array.from({ length: 5 }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 animate-pulse rounded bg-muted/80" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function CasesTable({
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
}: CasesTableProps) {
  const { t } = useTranslation(['matters', 'common'])
  const navigate = useNavigate()
  const colCount = 5

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = (page - 1) * pageSize + items.length

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
            <TableHead className="min-w-[220px]">{t('caseList.columns.parties')}</TableHead>
            <TableHead className="min-w-[140px]">{t('caseList.columns.caseNumber')}</TableHead>
            <TableHead className="min-w-[160px]">{t('caseList.columns.court')}</TableHead>
            <TableHead className="min-w-[140px]">{t('caseList.columns.status')}</TableHead>
            <TableHead className="min-w-[120px] text-right">
              {t('caseList.columns.actions')}
            </TableHead>
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
                      {t('caseList.emptyDescription')}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            !isError &&
            items.map((matter, index) => {
              const summary = matter.caseSummary
              const parties = formatCaseParties(summary ?? null)

              return (
                <TableRow
                  key={matter.id}
                  className={cn(
                    'border-border/40 transition-colors',
                    index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
                  )}
                >
                  <TableCell className="whitespace-normal py-3">
                    <div className="text-sm font-medium">{parties.client}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('caseList.vrs')}
                    </div>
                    <div className="text-sm">{parties.opposing}</div>
                  </TableCell>
                  <TableCell className="whitespace-normal font-mono text-sm">
                    {formatCaseNumber(summary ?? null)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {formatCaseCourt(summary ?? null)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="normal-case font-medium tracking-normal">
                      {formatCaseStatus(summary ?? null)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t('caseList.viewAria', { title: matter.title })}
                        onClick={() => navigate(`/matters/${matter.id}/overview`)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="relative size-8"
                        aria-label={t('caseList.filesAria', {
                          title: matter.title,
                          count: matter.documentCount ?? 0,
                        })}
                        onClick={() => navigate(`/matters/${matter.id}/documents`)}
                      >
                        <Folder className="size-4" />
                        {(matter.documentCount ?? 0) > 0 ? (
                          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                            {matter.documentCount}
                          </span>
                        ) : null}
                      </Button>
                    </div>
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
