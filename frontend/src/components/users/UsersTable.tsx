import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
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
import type { UserListItem, UserSegment } from '@/features/users/types'
import {
  formatJoined,
  formatLastLogin,
  formatUserRole,
  roleBadgeVariant,
} from '@/features/users/utils'
import { initials, resolvePrimaryRole, type SystemRole } from '@/lib/rbac'
import { cn } from '@/lib/utils'

export const USERS_PAGE_SIZE = 20

type UsersTableProps = {
  segment: UserSegment
  items: UserListItem[]
  isLoading?: boolean
  isError?: boolean
  pageIndex: number
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
}

function UserAvatar({ name, segment }: { name: string; segment: UserSegment }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tracking-wide',
        segment === 'portal'
          ? 'border-violet-200/80 bg-violet-50 text-violet-800'
          : 'border-sky-200/80 bg-sky-50 text-sky-800',
      )}
    >
      {initials(name) || <UserRound className="size-4" />}
    </span>
  )
}

function AuthMethodBadge({
  method,
  passwordLabel,
  ssoLabel,
}: {
  method: UserListItem['authMethod']
  passwordLabel: string
  ssoLabel: string
}) {
  const isSso = method === 'sso'
  return (
    <Badge variant={isSso ? 'info' : 'outline'} className="gap-1 normal-case">
      {isSso ? <ShieldCheck className="size-3" /> : <KeyRound className="size-3" />}
      {isSso ? ssoLabel : passwordLabel}
    </Badge>
  )
}

function StatusBadge({
  isActive,
  activeLabel,
  inactiveLabel,
}: {
  isActive: boolean
  activeLabel: string
  inactiveLabel: string
}) {
  return (
    <Badge variant={isActive ? 'success' : 'secondary'}>{isActive ? activeLabel : inactiveLabel}</Badge>
  )
}

function RoleBadges({ roles }: { roles: string[] }) {
  const primary = resolvePrimaryRole(roles as SystemRole[])
  const extra = roles.filter((r) => r !== primary).length

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={roleBadgeVariant(primary)} className="normal-case">
        {formatUserRole(primary)}
      </Badge>
      {extra > 0 && (
        <Badge variant="ghost" className="normal-case">
          +{extra}
        </Badge>
      )}
    </div>
  )
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className={cn(i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 animate-pulse rounded bg-muted/80" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function UsersTable({
  segment,
  items,
  isLoading,
  isError,
  pageIndex,
  hasNextPage,
  onPreviousPage,
  onNextPage,
}: UsersTableProps) {
  const { t } = useTranslation(['users', 'common'])

  const isPortal = segment === 'portal'
  const colCount = isPortal ? 7 : 6

  const rangeStart = items.length === 0 ? 0 : pageIndex * USERS_PAGE_SIZE + 1
  const rangeEnd = pageIndex * USERS_PAGE_SIZE + items.length

  const passwordLabel = t('table.authMethod.password', { ns: 'users' })
  const ssoLabel = t('table.authMethod.sso', { ns: 'users' })
  const activeLabel = t('table.status.active', { ns: 'users' })
  const inactiveLabel = t('table.status.inactive', { ns: 'users' })
  const mfaEnabledLabel = t('table.mfa.enabled', { ns: 'users' })
  const mfaOffLabel = t('table.mfa.off', { ns: 'users' })

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[28%]">{t('table.headers.user', { ns: 'users' })}</TableHead>
            {isPortal && <TableHead>{t('table.clientRecord', { ns: 'users' })}</TableHead>}
            <TableHead>{t('table.headers.role', { ns: 'users' })}</TableHead>
            <TableHead>{t('table.headers.signIn', { ns: 'users' })}</TableHead>
            <TableHead>{t('table.headers.status', { ns: 'users' })}</TableHead>
            <TableHead>{t('table.headers.lastLogin', { ns: 'users' })}</TableHead>
            <TableHead>
              {isPortal
                ? t('table.headers.registered', { ns: 'users' })
                : t('table.headers.mfa', { ns: 'users' })}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeleton cols={colCount} />}

          {!isLoading && isError && (
            <TableRow>
              <TableCell colSpan={colCount} className="py-16 text-center">
                <p className="text-sm font-medium text-destructive">
                  {t('table.error', { ns: 'users' })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('errors.retryHint', { ns: 'common' })}
                </p>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <UsersRound className="size-5 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      {t('table.empty', { ns: 'users' })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('table.emptyDescription', { ns: 'users' })}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            !isError &&
            items.map((user, index) => (
              <TableRow
                key={user.id}
                className={cn(
                  'border-border/40 transition-colors',
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/15',
                )}
              >
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={user.fullName} segment={segment} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{user.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>

                {isPortal && (
                  <TableCell>
                    {user.client ? (
                      <Link
                        to={`/clients/${user.client.id}/overview`}
                        className="group block min-w-0"
                      >
                        <p className="truncate font-medium text-primary group-hover:underline">
                          {user.client.displayName}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {user.client.internalCode ?? '-'}
                        </p>
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}

                <TableCell>
                  <RoleBadges roles={user.roles} />
                </TableCell>

                <TableCell>
                  <AuthMethodBadge
                    method={user.authMethod}
                    passwordLabel={passwordLabel}
                    ssoLabel={ssoLabel}
                  />
                </TableCell>

                <TableCell>
                  <StatusBadge
                    isActive={user.isActive}
                    activeLabel={activeLabel}
                    inactiveLabel={inactiveLabel}
                  />
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {formatLastLogin(user.lastLoginAt)}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {isPortal ? (
                    formatJoined(user.createdAt)
                  ) : user.mfaEnabled ? (
                    <Badge variant="success" className="normal-case">
                      {mfaEnabledLabel}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{mfaOffLabel}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>

        <TableFooter>
          <TableRow className="bg-muted/25 hover:bg-muted/25">
            <TableCell colSpan={colCount}>
              <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                <p className="text-xs text-muted-foreground">
                  {items.length === 0
                    ? t('pagination.noResults', { ns: 'common' })
                    : t('pagination.showing', {
                        ns: 'common',
                        start: rangeStart,
                        end: rangeEnd,
                      })}
                  {items.length > 0 && hasNextPage ? '+' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pageIndex === 0 || isLoading}
                    onClick={onPreviousPage}
                  >
                    <ChevronLeft className="size-4" />
                    {t('actions.previous', { ns: 'common' })}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage || isLoading}
                    onClick={onNextPage}
                  >
                    {t('actions.next', { ns: 'common' })}
                    <ChevronRight className="size-4" />
                  </Button>
                  {isLoading && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
                  )}
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
