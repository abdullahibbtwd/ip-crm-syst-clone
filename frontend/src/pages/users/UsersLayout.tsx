import { Navigate, Outlet } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { UsersTabNav } from '@/components/users/UsersTabNav'

export function UsersLayout() {
  return (
    <PermissionGate
      resource="user"
      action="read"
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <UsersRound className="size-10 text-muted-foreground/60" />
          <div>
            <h1 className="font-serif text-xl text-foreground">Access restricted</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view users and team members.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-foreground md:text-3xl">Users & team</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage internal team members and external portal client accounts. SSO and
              password-based sign-in are shown per user.
            </p>
          </div>
        </div>

        <UsersTabNav />
        <Outlet />
      </div>
    </PermissionGate>
  )
}

export function UsersIndexRedirect() {
  return <Navigate to="team" replace />
}
