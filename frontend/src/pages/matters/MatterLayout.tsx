import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, ArchiveRestore } from 'lucide-react'
import { MatterTabNav } from '@/components/matters/MatterTabNav'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  useArchiveMatter,
  useMatter,
  useRestoreMatter,
} from '@/features/matters/hooks/useMatters'
import { matterTypeLabel } from '@/features/matters/utils'
import { clientDisplayName } from '@/features/crm/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { getMatterTabFromPath, isPortalMatterTab } from '@/config/matter-tabs'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export function MatterLayout() {
  const { t } = useTranslation(['matters', 'common'])
  const { confirm } = useAppAlert()
  const { id = '' } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const isPortalClient = user?.roles.includes('portal_client') ?? false
  const { data: matter, isLoading, isError } = useMatter(id)
  const archiveMatter = useArchiveMatter(id)
  const restoreMatter = useRestoreMatter(id)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!id) return <Navigate to="/matters" replace />

  const activeTab = getMatterTabFromPath(location.pathname)
  if (isPortalClient && activeTab && !isPortalMatterTab(activeTab)) {
    return <Navigate to={`/matters/${id}/overview`} replace />
  }
  if (matter && activeTab === 'customs' && matter.matterType !== 'border_measures') {
    return <Navigate to={`/matters/${id}/overview`} replace />
  }

  const handleArchive = async () => {
    const ok = await confirm({
      title: t('layout.archive'),
      message: t('layout.archiveConfirm'),
      variant: 'warning',
      confirmLabel: t('layout.archive'),
      cancelLabel: t('common:actions.cancel'),
    })
    if (!ok) return
    setActionError(null)
    try {
      await archiveMatter.mutateAsync()
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('layout.archiveFailed')))
    }
  }

  const handleRestore = async () => {
    setActionError(null)
    try {
      await restoreMatter.mutateAsync()
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('layout.restoreFailed')))
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to={matter?.isArchived ? '/matters?archived=1' : '/matters'}
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl">{matter.title}</h1>
                <MatterStatusBadge status={matter.status} />
                {matter.isArchived ? (
                  <Badge variant="outline">{t('layout.archivedBadge')}</Badge>
                ) : null}
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
              {actionError ? (
                <p className="text-sm text-destructive">{actionError}</p>
              ) : null}
            </div>

            {!isPortalClient ? (
              <PermissionGate resource="matter" action="update">
                {matter.isArchived ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restoreMatter.isPending}
                    onClick={handleRestore}
                  >
                    <ArchiveRestore className="size-4" />
                    {restoreMatter.isPending ? t('layout.restoring') : t('layout.restore')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={archiveMatter.isPending}
                    onClick={handleArchive}
                  >
                    <Archive className="size-4" />
                    {archiveMatter.isPending ? t('layout.archiving') : t('layout.archive')}
                  </Button>
                )}
              </PermissionGate>
            ) : null}
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
