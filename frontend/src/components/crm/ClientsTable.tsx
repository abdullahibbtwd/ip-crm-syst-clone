import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  ChevronRight,
  Loader2,
  UserRound,
  Users,
} from 'lucide-react'
import { ClientStatusBadge } from '@/components/crm/ClientStatusBadge'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
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
import type { ClientListItem } from '@/features/crm/types'
import { clientTypeLabel } from '@/features/crm/utils'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

type ClientsTableProps = {
  items: ClientListItem[]
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

function ClientNameCell({ client }: { client: ClientListItem }) {
  const Icon = client.type === 'company' ? Building2 : UserRound

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
          client.type === 'company'
            ? 'border-sky-200/80 bg-sky-50 text-sky-700'
            : 'border-violet-200/80 bg-violet-50 text-violet-700',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{client.displayName}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {client.internalCode ?? '-'}
          {client.assignedUser ? ` · ${client.assignedUser.fullName}` : ''}
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

export function ClientsTable({
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
}: ClientsTableProps) {
  const { t } = useTranslation(['crm', 'common'])
  const navigate = useNavigate()

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = (page - 1) * pageSize + items.length

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
          <TableHead className="w-[30%]">{t('table.client')}</TableHead>
          <TableHead>{t('table.type')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.country')}</TableHead>
          <TableHead>{t('table.holdingGroup')}</TableHead>
          <TableHead className="text-right">{t('table.action')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <TableSkeleton />}

        {!isLoading && isError && (
          <TableRow>
            <TableCell colSpan={6} className="py-16 text-center">
              <p className="text-sm font-medium text-destructive">{t('clients.error')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('common:errors.retryHint')}</p>
            </TableCell>
          </TableRow>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-16 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Users className="size-5 text-muted-foreground" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{t('clients.emptyTitle')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('clients.emptyDescription')}
                  </p>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          !isError &&
          items.map((client, index) => (
            <TableRow
              key={client.id}
              className={cn(
                'cursor-pointer border-border/40 transition-colors',
                index % 2 === 0 ? 'bg-background hover:bg-muted/35' : 'bg-muted/20 hover:bg-muted/45',
              )}
              tabIndex={0}
              role="link"
              aria-label={t('clients.viewAria', { name: client.displayName })}
              onClick={() => navigate(`/clients/${client.id}/overview`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/clients/${client.id}/overview`)
                }
              }}
            >
              <TableCell className="whitespace-normal py-4">
                <ClientNameCell client={client} />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="normal-case font-medium tracking-normal">
                  {clientTypeLabel(client.type)}
                </Badge>
              </TableCell>
              <TableCell>
                <ClientStatusBadge status={client.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {getCountryLabel(client.country)}
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-muted-foreground">
                {client.holdingGroup?.name ?? '-'}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  to={`/clients/${client.id}/overview`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('common:actions.view')}
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
                        {t('clients.pagination.ofTotal', { total })}
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
  )
}
