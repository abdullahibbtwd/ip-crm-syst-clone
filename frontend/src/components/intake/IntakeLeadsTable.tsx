import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  UserRound,
} from 'lucide-react'
import { IntakeStatusBadge } from '@/components/intake/IntakeStatusBadge'
import { Badge } from '@/components/ui/badge'
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
import type { IntakeLead } from '@/features/intake/types'
import {
  MATTER_TYPE_LABELS,
  formatIntakeDateTime,
  intakeDisplayName,
} from '@/features/intake/utils'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

export const INTAKE_PAGE_SIZE = 20

type IntakeLeadsTableProps = {
  items: IntakeLead[]
  isLoading?: boolean
  isError?: boolean
  pageIndex: number
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

function EnquirerCell({ lead }: { lead: IntakeLead }) {
  const Icon = lead.enquirerType === 'company' ? Building2 : UserRound
  const contact = lead.email ?? lead.phone

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
          lead.enquirerType === 'company'
            ? 'border-sky-200/80 bg-sky-50 text-sky-700'
            : 'border-violet-200/80 bg-violet-50 text-violet-700',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{intakeDisplayName(lead)}</p>
          {lead.source === 'portal' && (
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary normal-case tracking-normal">
              Portal
            </Badge>
          )}
          {lead.urgency === 'urgent' && (
            <Badge variant="destructive" className="normal-case tracking-normal">
              Urgent
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground capitalize">
          {lead.enquirerType}
          {contact ? ` · ${contact}` : ''}
        </p>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className={cn(i % 2 === 0 ? 'bg-background' : 'bg-muted/25')}>
          {Array.from({ length: 6 }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 animate-pulse rounded bg-muted/80" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function IntakeLeadsTable({
  items,
  isLoading,
  isError,
  pageIndex,
  hasNextPage,
  onPreviousPage,
  onNextPage,
}: IntakeLeadsTableProps) {
  const navigate = useNavigate()

  const rangeStart = items.length === 0 ? 0 : pageIndex * INTAKE_PAGE_SIZE + 1
  const rangeEnd = pageIndex * INTAKE_PAGE_SIZE + items.length

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
          <TableHead className="w-[32%]">Enquirer</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Matter</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {isLoading && <TableSkeleton />}

          {!isLoading && isError && (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center">
                <p className="text-sm font-medium text-destructive">Failed to load intake leads.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check your connection and permissions, then try again.
                </p>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-5 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">No intake leads found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting filters or create a new enquiry.
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            !isError &&
            items.map((lead, index) => (
              <TableRow
                key={lead.id}
                className={cn(
                  'cursor-pointer border-border/40 transition-colors',
                  index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
                )}
                tabIndex={0}
                role="link"
                aria-label={`View ${intakeDisplayName(lead)}`}
                onClick={() => navigate(`/intake/${lead.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/intake/${lead.id}`)
                  }
                }}
              >
                <TableCell className="whitespace-normal py-4">
                  <EnquirerCell lead={lead} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getCountryLabel(lead.country)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="normal-case font-medium tracking-normal">
                    {MATTER_TYPE_LABELS[lead.matterType]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <IntakeStatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <time dateTime={lead.createdAt}>{formatIntakeDateTime(lead.createdAt)}</time>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to={`/intake/${lead.id}`}
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
          <TableCell colSpan={6} className="py-3">
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
