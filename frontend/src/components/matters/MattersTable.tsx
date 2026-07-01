import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { Badge } from '@/components/ui/badge'
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
import { clientDisplayName } from '@/features/crm/utils'
import type { MatterListItem } from '@/features/matters/types'
import {
  MATTER_TYPE_LABELS,
  formatJurisdictions,
  formatMatterDate,
} from '@/features/matters/utils'
import { cn } from '@/lib/utils'

export const MATTER_PAGE_SIZE = 20

type MattersTableProps = {
  items: MatterListItem[]
  isLoading?: boolean
  isError?: boolean
  pageIndex: number
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
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

export function MattersTable({
  items,
  isLoading,
  isError,
  pageIndex,
  hasNextPage,
  onPreviousPage,
  onNextPage,
}: MattersTableProps) {
  const navigate = useNavigate()

  const rangeStart = items.length === 0 ? 0 : pageIndex * MATTER_PAGE_SIZE + 1
  const rangeEnd = pageIndex * MATTER_PAGE_SIZE + items.length

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
          <TableHead className="w-[26%]">Title</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Jurisdiction</TableHead>
          <TableHead>Lead attorney</TableHead>
          <TableHead>Deadlines</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <TableSkeleton />}

        {!isLoading && isError && (
          <TableRow>
            <TableCell colSpan={8} className="py-16 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load matters.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check your connection and permissions, then try again.
              </p>
            </TableCell>
          </TableRow>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="py-16 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="size-5 text-muted-foreground" />
                </span>
                <div>
                  <p className="font-medium text-foreground">No matters found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting filters or convert an approved intake enquiry.
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
          <TableCell colSpan={8} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading…
                  </span>
                ) : items.length === 0 ? (
                  'No results'
                ) : (
                  <>
                    Showing{' '}
                    <span className="font-medium text-foreground">
                      {rangeStart}–{rangeEnd}
                    </span>
                    {pageIndex > 0 && (
                      <>
                        {' '}
                        · Page{' '}
                        <span className="font-medium text-foreground">{pageIndex + 1}</span>
                      </>
                    )}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading || pageIndex === 0}
                  onClick={onPreviousPage}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading || !hasNextPage}
                  onClick={onNextPage}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
