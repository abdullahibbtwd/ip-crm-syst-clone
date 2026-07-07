import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UsersRound } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { UsersTabNav } from '@/components/users/UsersTabNav'

export function UsersLayout() {
  const { t } = useTranslation('users')

  return (
    <PermissionGate
      resource="user"
      action="read"
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <UsersRound className="size-10 text-muted-foreground/60" />
          <div>
            <h1 className="font-serif text-xl text-foreground">{t('layout.accessRestricted')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('layout.noPermission')}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('layout.title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('layout.description')}</p>
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
