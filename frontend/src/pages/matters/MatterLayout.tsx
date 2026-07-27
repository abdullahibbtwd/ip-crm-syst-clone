import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MatterTabNav } from '@/components/matters/MatterTabNav'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { useMatter } from '@/features/matters/hooks/useMatters'
import { matterTypeLabel } from '@/features/matters/utils'
import { clientDisplayName } from '@/features/crm/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { getMatterTabFromPath, isPortalMatterTab } from '@/config/matter-tabs'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MatterLayout() {
  const { t } = useTranslation('matters')
  const { id = '' } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const isPortalClient = user?.roles.includes('portal_client') ?? false
  const { data: matter, isLoading, isError } = useMatter(id)

  if (!id) return <Navigate to="/matters" replace />

  const activeTab = getMatterTabFromPath(location.pathname)
  if (isPortalClient && activeTab && !isPortalMatterTab(activeTab)) {
    return <Navigate to={`/matters/${id}/overview`} replace />
  }
  if (matter && activeTab === 'customs' && matter.matterType !== 'border_measures') {
    return <Navigate to={`/matters/${id}/overview`} replace />
  }

  return (
    <div className="space-y-6">
      <Link
        to="/matters"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        {t('layout.backToMatters')}
      </Link>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('layout.loading')}</p>
      ) : isError || !matter ? (
        <p className="text-sm text-destructive">{t('layout.notFound')}</p>
      ) : (
        <>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl">{matter.title}</h1>
              <MatterStatusBadge status={matter.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {matterTypeLabel(matter.matterType)} ·{' '}
              {isPortalClient ? (
                <span>{clientDisplayName(matter.client)}</span>
              ) : (
                <Link
                  to={`/clients/${matter.clientId}/overview`}
                  className="text-primary hover:underline"
                >
                  {clientDisplayName(matter.client)}
                </Link>
              )}
            </p>
          </div>

          <MatterTabNav
            matterId={id}
            isPortalClient={isPortalClient}
            matterType={matter.matterType}
          />
          <Outlet context={{ matterId: id, matter }} />
        </>
      )}
    </div>
  )
}

export type MatterTabContext = {
  matterId: string
  matter: NonNullable<ReturnType<typeof useMatter>['data']>
}
