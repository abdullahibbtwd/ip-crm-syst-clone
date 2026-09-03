import { useOpenMatter } from '@/features/matters/useOpenMatter'
import { useTranslation } from 'react-i18next'
import { Eye, Folder } from 'lucide-react'
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
  formatOtherDeadline,
  formatOtherHeadline,
  formatOtherIncomingRef,
  formatOtherWorkflow,
  matterTypeLabelShort,
} from '@/features/matters/other-list-utils'
import { clientDisplayName } from '@/features/crm/utils'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'

export const OTHERS_PAGE_SIZE = DEFAULT_PAGE_SIZE

type OthersTableProps = {
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
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 animate-pulse rounded bg-muted/80" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function OthersTable({
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
}: OthersTableProps) {
  const { t } = useTranslation(['matters', 'common'])
  const { open: openMatter } = useOpenMatter()
  const colCount = 7

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = (page - 1) * pageSize + items.length

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
            <TableHead className="min-w-[160px]">{t('otherList.columns.type')}</TableHead>
            <TableHead className="min-w-[200px]">{t('otherList.columns.subject')}</TableHead>
            <TableHead className="min-w-[140px]">{t('otherList.columns.client')}</TableHead>
            <TableHead className="min-w-[140px]">{t('otherList.columns.incoming')}</TableHead>
            <TableHead className="min-w-[120px]">{t('otherList.columns.stage')}</TableHead>
            <TableHead className="min-w-[120px]">{t('otherList.columns.deadline')}</TableHead>
            <TableHead className="min-w-[100px] text-right">
              {t('otherList.columns.actions')}
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
                <p className="font-medium text-foreground">{t('table.empty')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('otherList.emptyDescription')}
                </p>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            !isError &&
            items.map((matter, index) => {
              const summary = matter.otherSummary
              return (
                <TableRow
                  key={matter.id}
                  className={cn(
                    'border-border/40 transition-colors',
                    index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
                  )}
                >
                  <TableCell className="text-sm">
                    {matterTypeLabelShort(matter.matterType)}
                  </TableCell>
                  <TableCell className="whitespace-normal font-medium">
                    {formatOtherHeadline(summary ?? null, matter.title)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {clientDisplayName(matter.client)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {formatOtherIncomingRef(summary ?? null)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info" className="normal-case font-medium tracking-normal">
                      {formatOtherWorkflow(matter.matterType, summary ?? null)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatOtherDeadline(summary ?? null)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t('otherList.viewAria', { title: matter.title })}
                        onClick={() => openMatter(matter.id)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="relative size-8"
                        aria-label={t('otherList.filesAria', {
                          title: matter.title,
                          count: matter.documentCount ?? 0,
                        })}
                        onClick={() => openMatter(matter.id, 'documents')}
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
                    {t('common:pagination.showing', { start: rangeStart, end: rangeEnd })}
                    {total != null ? ` ${t('list.pagination.ofTotal', { total })}` : null}
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
