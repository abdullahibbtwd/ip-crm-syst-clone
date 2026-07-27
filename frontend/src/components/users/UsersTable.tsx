import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUpdateUserRole, useResendInvite } from '@/features/users/hooks/useUserMutations'
import type { UserListItem, UserSegment } from '@/features/users/types'
import {
  TEAM_ASSIGNABLE_ROLES,
  formatJoined,
  formatLastLogin,
  formatUserRole,
  roleBadgeVariant,
  type TeamAssignableRole,
} from '@/features/users/utils'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
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
  pendingLabel,
}: {
  method: UserListItem['authMethod']
  passwordLabel: string
  ssoLabel: string
  pendingLabel: string
}) {
  if (method === 'pending') {
    return (
      <Badge variant="warning" className="gap-1 normal-case">
        <Mail className="size-3" />
        {pendingLabel}
      </Badge>
    )
  }

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
  neverSignedIn,
  activeLabel,
  inactiveLabel,
  invitedLabel,
}: {
  isActive: boolean
  neverSignedIn: boolean
  activeLabel: string
  inactiveLabel: string
  invitedLabel: string
}) {
  if (!isActive) {
    return <Badge variant="secondary">{inactiveLabel}</Badge>
  }
  if (neverSignedIn) {
    return <Badge variant="warning">{invitedLabel}</Badge>
  }
  return <Badge variant="success">{activeLabel}</Badge>
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

function TeamRoleSelect({ user }: { user: UserListItem }) {
  const { t } = useTranslation('users')
  const { user: me } = useAuth()
  const updateRole = useUpdateUserRole()
  const [error, setError] = useState<string | null>(null)

  const primary = resolvePrimaryRole(user.roles as SystemRole[])
  const current = (TEAM_ASSIGNABLE_ROLES as readonly string[]).includes(primary)
    ? (primary as TeamAssignableRole)
    : TEAM_ASSIGNABLE_ROLES[0]
  const isSelf = me?.id === user.id

  const handleChange = async (role: string | null) => {
    if (!role || role === current || isSelf) return
    setError(null)
    try {
      await updateRole.mutateAsync({
        id: user.id,
        role: role as TeamAssignableRole,
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('role.errors.failed')))
    }
  }

  if (isSelf) {
    return (
      <div className="space-y-1">
        <RoleBadges roles={user.roles} />
        <p className="text-[11px] text-muted-foreground">{t('role.ownRoleHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Select
        value={current}
        onValueChange={handleChange}
        disabled={updateRole.isPending}
      >
        <SelectTrigger className="h-8 w-[200px] bg-background text-xs">
          <SelectValue>
            {(value) => formatUserRole(String(value ?? ''))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TEAM_ASSIGNABLE_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {formatUserRole(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

function ResendInviteButton({ user }: { user: UserListItem }) {
  const { t } = useTranslation('users')
  const resend = useResendInvite()
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!user.invitePending) return null

  const handleResend = async () => {
    setFeedback(null)
    try {
      const result = await resend.mutateAsync(user.id)
      if (result.inviteEmailSent) {
        setFeedback(t('invite.resendSuccess'))
      } else {
        setFeedback(result.inviteEmailError ?? t('invite.emailFailed'))
      }
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t('invite.resendFailed')))
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs"
        disabled={resend.isPending}
        onClick={() => void handleResend()}
      >
        {resend.isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Mail className="size-3" />
        )}
        {t('invite.resend')}
      </Button>
      {user.inviteEmailLastError && !feedback && (
        <p className="text-[10px] text-amber-700">{t('invite.lastEmailFailed')}</p>
      )}
      {feedback && (
        <p className="text-[10px] text-muted-foreground">{feedback}</p>
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
  const canUpdateRole = usePermission('user', 'update')
  const canInvite = usePermission('user', 'create')

  const isPortal = segment === 'portal'
  const colCount = isPortal ? 8 : 7

  const rangeStart = items.length === 0 ? 0 : pageIndex * USERS_PAGE_SIZE + 1
  const rangeEnd = pageIndex * USERS_PAGE_SIZE + items.length

  const passwordLabel = t('table.authMethod.password', { ns: 'users' })
  const ssoLabel = t('table.authMethod.sso', { ns: 'users' })
  const pendingAuthLabel = t('table.authMethod.pending', { ns: 'users' })
  const activeLabel = t('table.status.active', { ns: 'users' })
  const inactiveLabel = t('table.status.inactive', { ns: 'users' })
  const invitedLabel = t('table.status.invited', { ns: 'users' })
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
            <TableHead>{t('table.headers.invite', { ns: 'users' })}</TableHead>
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
                  {!isPortal && canUpdateRole ? (
                    <TeamRoleSelect user={user} />
                  ) : (
                    <RoleBadges roles={user.roles} />
                  )}
                </TableCell>

                <TableCell>
                  <AuthMethodBadge
                    method={user.authMethod}
                    passwordLabel={passwordLabel}
                    ssoLabel={ssoLabel}
                    pendingLabel={pendingAuthLabel}
                  />
                </TableCell>

                <TableCell>
                  <StatusBadge
                    isActive={user.isActive}
                    neverSignedIn={user.neverSignedIn}
                    activeLabel={activeLabel}
                    inactiveLabel={inactiveLabel}
                    invitedLabel={invitedLabel}
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

                <TableCell>
                  {canInvite ? <ResendInviteButton user={user} /> : null}
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
