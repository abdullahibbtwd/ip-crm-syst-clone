import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuditTrail } from '@/features/compliance/hooks/useCompliance'
import type { AuditLogItem } from '@/features/compliance/api'

export const AUDIT_TRAIL_PAGE_SIZE = 25

export function AuditTrailPage() {
  const { t } = useTranslation('common')
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])

  const filters = useMemo(
    () => ({
      limit: AUDIT_TRAIL_PAGE_SIZE,
      cursor: cursors[pageIndex],
    }),
    [pageIndex, cursors],
  )

  const { data, isLoading, isFetching, isError } = useAuditTrail(filters)
  const items = data?.items ?? []
  const hasNextPage = Boolean(data?.nextCursor)

  const rangeStart = items.length === 0 ? 0 : pageIndex * AUDIT_TRAIL_PAGE_SIZE + 1
  const rangeEnd = pageIndex * AUDIT_TRAIL_PAGE_SIZE + items.length

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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading audit trail…</p>
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load audit trail.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Audit trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System-wide audit log for compliance review.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Module</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No audit entries found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((row: AuditLogItem) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{row.user?.fullName ?? row.userEmail ?? '—'}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>{row.resource}</TableCell>
                <TableCell className="text-muted-foreground">{row.module ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {!isLoading && items.length > 0 ? (
          <TableFooter>
            <TableRow className="bg-muted/25 hover:bg-muted/25">
              <TableCell colSpan={5}>
                <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                  <p className="text-sm text-muted-foreground">
                    {t('pagination.showing', {
                      start: rangeStart,
                      end: rangeEnd,
                    })}
                    {hasNextPage ? '+' : ''}
                    {pageIndex > 0 ? (
                      <span className="ml-2">· {t('pagination.page', { page: pageIndex + 1 })}</span>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isFetching || pageIndex === 0}
                      onClick={handlePreviousPage}
                    >
                      <ChevronLeft className="size-4" />
                      {t('actions.previous')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isFetching || !hasNextPage}
                      onClick={handleNextPage}
                    >
                      {t('actions.next')}
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  )
}
