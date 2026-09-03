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
import { clientTabsForUser, formatTabCount, type ClientTabDef } from '@/config/client-tabs'
import { useAuth } from '@/features/auth/AuthProvider'
import type { ClientListItem, ClientTabCounts } from '@/features/crm/types'
import { clientTypeLabel } from '@/features/crm/utils'
import { canViewGdprCompliance } from '@/lib/rbac'
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
  const { user } = useAuth()
  const showCompliance = canViewGdprCompliance(user?.roles ?? [])
  const tabs = clientTabsForUser(showCompliance)
  const colSpan = 7

  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = (page - 1) * pageSize + items.length

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/80 bg-muted/50 hover:bg-muted/50">
          <TableHead>{t('table.client')}</TableHead>
          <TableHead>{t('table.tabs')}</TableHead>
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
            <TableCell colSpan={colSpan} className="py-16 text-center">
              <p className="text-sm font-medium text-destructive">{t('clients.error')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('common:errors.retryHint')}</p>
            </TableCell>
          </TableRow>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <TableRow>
            <TableCell colSpan={colSpan} className="py-16 text-center">
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
              <TableCell className="py-4">
                <ClientTabIcons
                  client={client}
                  tabs={tabs}
                  counts={client.tabCounts}
                />
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
          <TableCell colSpan={colSpan} className="py-3">
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

function ClientTabIcons({
  client,
  tabs,
  counts,
}: {
  client: ClientListItem
  tabs: ClientTabDef[]
  counts: ClientTabCounts | undefined
}) {
  const { t } = useTranslation('crm')

  return (
    <div className="flex max-w-[280px] flex-wrap gap-px">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const count = tab.countKey ? (counts?.[tab.countKey] ?? 0) : 0
        const deadlineCount = tab.to === 'notes' ? (counts?.deadlines ?? 0) : 0
        const hasItems = count > 0 || deadlineCount > 0

        return (
          <Link
            key={tab.to}
            to={`/clients/${client.id}/${tab.to}`}
            title={
              tab.to === 'notes' && deadlineCount > 0
                ? t('table.tabIconTitleNotes', {
                    tab: t(tab.labelKey),
                    count,
                    deadlines: deadlineCount,
                  })
                : t('table.tabIconTitle', { tab: t(tab.labelKey), count })
            }
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative inline-flex size-5 items-center justify-center rounded-sm border transition-colors',
              hasItems
                ? 'border-border bg-background text-foreground hover:bg-muted'
                : 'border-transparent text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground',
            )}
          >
            <Icon className="size-2.5" aria-hidden />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-2.5 min-w-2.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[7px] leading-none font-semibold text-background tabular-nums">
                {formatTabCount(count)}
              </span>
            ) : null}
            {deadlineCount > 0 ? (
              <span className="absolute -bottom-0.5 -right-0.5 inline-flex min-h-2.5 min-w-2.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[7px] leading-none font-semibold text-white tabular-nums">
                {formatTabCount(deadlineCount)}
              </span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
