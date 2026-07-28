import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Loader2,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { HoldingGroup } from '@/features/crm/types'
import { formatCrmDateTime } from '@/features/crm/utils'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

export const HOLDING_GROUP_PAGE_SIZE = 20

type HoldingGroupsTableProps = {
  items: HoldingGroup[]
  isLoading?: boolean
  isError?: boolean
  pageIndex: number
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

function GroupNameCell({ group }: { group: HoldingGroup }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-amber-200/80 bg-amber-50 text-amber-800">
        <Building className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{group.name}</p>
        {group.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{group.description}</p>
        )}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
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

export function HoldingGroupsTable({
  items,
  isLoading,
  isError,
  pageIndex,
  hasNextPage,
  onPreviousPage,
  onNextPage,
}: HoldingGroupsTableProps) {
  const { t } = useTranslation(['crm', 'common'])
  const navigate = useNavigate()

  const rangeStart = items.length === 0 ? 0 : pageIndex * HOLDING_GROUP_PAGE_SIZE + 1
  const rangeEnd = pageIndex * HOLDING_GROUP_PAGE_SIZE + items.length

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
          <TableHead className="w-[40%]">{t('table.holdingGroup')}</TableHead>
          <TableHead>{t('table.country')}</TableHead>
          <TableHead>{t('table.created')}</TableHead>
          <TableHead className="text-right">{t('table.action')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <TableSkeleton />}

        {!isLoading && isError && (
          <TableRow>
            <TableCell colSpan={4} className="py-16 text-center">
              <p className="text-sm font-medium text-destructive">Failed to load holding groups.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check your connection and permissions, then try again.
              </p>
            </TableCell>
          </TableRow>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="py-16 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Landmark className="size-5 text-muted-foreground" />
                </span>
                <div>
                  <p className="font-medium text-foreground">No holding groups found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting search or create a new holding group.
                  </p>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          !isError &&
          items.map((group, index) => (
            <TableRow
              key={group.id}
              className={cn(
                'cursor-pointer border-border/40 transition-colors',
                index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
              )}
              tabIndex={0}
              role="link"
              aria-label={`View ${group.name}`}
              onClick={() => navigate(`/holding-groups/${group.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/holding-groups/${group.id}`)
                }
              }}
            >
              <TableCell className="whitespace-normal py-4">
                <GroupNameCell group={group} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {getCountryLabel(group.country)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <time dateTime={group.createdAt}>{formatCrmDateTime(group.createdAt)}</time>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  to={`/holding-groups/${group.id}`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  onClick={(e) => e.stopPropagation()}
                >
                  View
                  <ChevronRight className="size-4 opacity-60" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
      <TableFooter className="bg-muted/20">
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="py-3">
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
