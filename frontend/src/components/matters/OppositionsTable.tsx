import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Folder, FolderOpen, Loader2 } from 'lucide-react'
import { OppositionStageBadge } from '@/components/matters/OppositionStageBadge'
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
import { clientDisplayName } from '@/features/crm/utils'
import type { MatterListItem } from '@/features/matters/types'
import { useOpenMatter } from '@/features/matters/useOpenMatter'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'

export const OPPOSITIONS_PAGE_SIZE = DEFAULT_PAGE_SIZE

type OppositionsTableProps = {
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
          {Array.from({ length: 4 }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 animate-pulse rounded bg-muted/80" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function OppositionsTable({
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
}: OppositionsTableProps) {
  const { t } = useTranslation(['matters', 'common'])
  const { open: openMatter, linkState, onLinkClick } = useOpenMatter()
  const colCount = 4

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = (page - 1) * pageSize + items.length

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
            <TableHead className="min-w-[140px]">
              {t('oppositionList.columns.againstMark')}
            </TableHead>
            <TableHead className="min-w-[140px]">
              {t('oppositionList.columns.client')}
            </TableHead>
            <TableHead className="min-w-[180px]">
              {t('oppositionList.columns.status')}
            </TableHead>
            <TableHead className="min-w-[140px] text-right">
              {t('oppositionList.columns.actions')}
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
                      {t('oppositionList.emptyDescription')}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            !isError &&
            items.map((matter, index) => {
              const stage = matter.trademarkSummary?.oppositionStage
              const docCount = matter.documentCount ?? 0

              return (
                <TableRow
                  key={matter.id}
                  className={cn(
                    'border-border/40 transition-colors',
                    index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
                  )}
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
                  <TableCell className="whitespace-normal text-sm">
                    {clientDisplayName(matter.client)}
                  </TableCell>
                  <TableCell>
                    <OppositionStageBadge stage={stage} matterStatus={matter.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openMatter(matter.id)}
                        aria-label={t('oppositionList.viewAria', { title: matter.title })}
                        title={t('oppositionList.view')}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="relative gap-1.5 px-2"
                        onClick={() =>
                          openMatter(matter.id, 'opposition-archive')
                        }
                        aria-label={t('oppositionList.filesAria', {
                          title: matter.title,
                          count: docCount,
                        })}
                        title={t('oppositionList.fileArchive')}
                      >
                        <Folder className="size-4" />
                        {docCount > 0 ? (
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                            {docCount}
                          </span>
                        ) : null}
                      </Button>
                    </div>
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
  )
}
