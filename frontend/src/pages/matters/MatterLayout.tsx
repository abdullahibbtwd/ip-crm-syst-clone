import { useMemo } from 'react'
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, ArchiveRestore } from 'lucide-react'
import { MatterTabNav } from '@/components/matters/MatterTabNav'
import {
  Eye,
  Folder,
  NotebookPen,
  TrademarkProcedureMatterNav,
} from '@/components/matters/TrademarkProcedureMatterNav'
import { MatterStatusBadge } from '@/components/matters/MatterStatusBadge'
import { EditScopeDrawer } from '@/components/matters/EditScopeDrawer'
import { SecondaryActionsMenu } from '@/components/matters/SecondaryActionsMenu'
import { TrademarkActionDrawer } from '@/components/matters/TrademarkActionDrawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  useArchiveMatter,
  useMatter,
  useMatterTabCounts,
  useRestoreMatter,
} from '@/features/matters/hooks/useMatters'
import type { TrademarkSecondaryAction } from '@/features/matters/trademark-actions'
import { readOppositionFields } from '@/features/matters/opposition-matter'
import {
  cancellationHeaderParams,
  cancellationStageConfig,
} from '@/features/matters/cancellation-workflow'
import { readDeletionFields } from '@/features/matters/deletion-matter'
import {
  deletionHeaderParams,
  deletionStageConfig,
} from '@/features/matters/deletion-workflow'
import { readCancellationFields } from '@/features/matters/cancellation-matter'
import {
  oppositionHeaderParams,
  oppositionStageConfig,
} from '@/features/matters/opposition-workflow'
import { matterTypeLabel } from '@/features/matters/utils'
import { resolveMatterBackUrl } from '@/features/matters/matter-return'
import {
  procedurePageTitleKey,
  procedureViewRoutes,
  trademarkProcedureView,
} from '@/features/matters/trademark-procedure-matter'
import { clientDisplayName } from '@/features/crm/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { getMatterTabFromPath, isPortalMatterTab } from '@/config/matter-tabs'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function MatterLayout() {
  const { t } = useTranslation(['matters', 'common'])
  const { confirm } = useAppAlert()
  const { id = '' } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const isPortalClient = user?.roles.includes('portal_client') ?? false
  const { data: matter, isLoading, isError } = useMatter(id)
  const { data: tabCounts } = useMatterTabCounts(id)
  const archiveMatter = useArchiveMatter(id)
  const restoreMatter = useRestoreMatter(id)
  const [actionError, setActionError] = useState<string | null>(null)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [secondaryAction, setSecondaryAction] =
    useState<TrademarkSecondaryAction | null>(null)

  const procedureView = matter ? trademarkProcedureView(matter) : null

  const procedureNavTabs = useMemo(() => {
    if (!procedureView || !matter) return []
    const base = `/matters/${matter.id}`
    if (procedureView === 'objection') {
      return [
        {
          to: `${base}/overview`,
          end: true,
          label: t('objectionView.nav.view'),
          icon: Eye,
        },
        {
          to: `${base}/objection-archive`,
          label: t('objectionView.nav.archive'),
          icon: Folder,
          badge: tabCounts?.documents ?? 0,
        },
      ]
    }
    if (procedureView === 'cancellation') {
      const notesCount = readCancellationFields(matter).notes.length
      return [
        {
          to: `${base}/overview`,
          end: true,
          label: t('cancellationView.nav.view'),
          icon: Eye,
        },
        {
          to: `${base}/cancellation-archive`,
          label: t('cancellationView.nav.archive'),
          icon: Folder,
          badge: tabCounts?.documents ?? 0,
        },
        {
          to: `${base}/cancellation-notes`,
          label: t('cancellationView.nav.notes'),
          icon: NotebookPen,
          badge: notesCount,
        },
      ]
    }
    if (procedureView === 'deletion') {
      return [
        {
          to: `${base}/overview`,
          end: true,
          label: t('deletionView.nav.view'),
          icon: Eye,
        },
        {
          to: `${base}/deletion-archive`,
          label: t('deletionView.nav.archive'),
          icon: Folder,
          badge: tabCounts?.documents ?? 0,
        },
      ]
    }
    const notesCount = readOppositionFields(matter).notes.length
    return [
      {
        to: `${base}/overview`,
        end: true,
        label: t('oppositionView.nav.view'),
        icon: Eye,
      },
      {
        to: `${base}/opposition-archive`,
        label: t('oppositionView.nav.archive'),
        icon: Folder,
        badge: tabCounts?.documents ?? 0,
      },
      {
        to: `${base}/opposition-notes`,
        label: t('oppositionView.nav.notes'),
        icon: NotebookPen,
        badge: notesCount,
      },
    ]
  }, [procedureView, matter, t, tabCounts?.documents])

  if (!id) return <Navigate to="/matters" replace />

  const activeTab = getMatterTabFromPath(location.pathname)
  if (isPortalClient && activeTab && !isPortalMatterTab(activeTab)) {
    return <Navigate to={`/matters/${id}/overview`} replace />
  }
  if (matter && activeTab === 'customs' && matter.matterType !== 'border_measures') {
    return <Navigate to={`/matters/${id}/overview`} replace />
  }
  if (matter && activeTab === 'secondary-actions' && matter.matterType !== 'trademark') {
    return <Navigate to={`/matters/${id}/overview`} replace />
  }
  if (
    matter &&
    procedureView &&
    activeTab &&
    !procedureViewRoutes(procedureView).includes(activeTab)
  ) {
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

  const oppositionHeader =
    matter && procedureView === 'opposition'
      ? (() => {
          const attrs = matter.attributes?.attributes ?? {}
          const fields = readOppositionFields(matter)
          const config = oppositionStageConfig(fields.oppositionStage)
          const ref = oppositionHeaderParams(attrs, fields.oppositionStage)
          return t(config.headerKey, {
            number: ref.number ?? '—',
            date: ref.date ?? '—',
            markRef: fields.applicationNumber || matter.title,
          })
        })()
      : null

  const cancellationHeader =
    matter && procedureView === 'cancellation'
      ? (() => {
          const attrs = matter.attributes?.attributes ?? {}
          const fields = readCancellationFields(matter)
          const config = cancellationStageConfig(fields.cancellationStage)
          const ref = cancellationHeaderParams(attrs)
          const markRef =
            fields.applicationNumber && fields.applicationNumber !== '—'
              ? `${fields.applicationNumber} ${matter.title}`.trim()
              : matter.title
          return t(config.headerKey, {
            number: ref.number ?? '—',
            date: ref.date ?? '—',
            markRef,
          })
        })()
      : null

  const deletionHeader =
    matter && procedureView === 'deletion'
      ? (() => {
          const attrs = matter.attributes?.attributes ?? {}
          const fields = readDeletionFields(matter)
          const config = deletionStageConfig(fields.deletionStage)
          const ref = deletionHeaderParams(attrs)
          const markRef =
            fields.applicationNumber && fields.applicationNumber !== '—'
              ? `${fields.applicationNumber} ${matter.title}`.trim()
              : matter.title
          return t(config.headerKey, {
            number: ref.number ?? '—',
            date: ref.date ?? '—',
            markRef,
            stopUntil: fields.stopUntil || '—',
          })
        })()
      : null

  const pageHeader = deletionHeader ?? cancellationHeader ?? oppositionHeader

  return (
    <div className="space-y-6">
      <Link
        to={resolveMatterBackUrl(
          matter,
          (location.state as { from?: string } | null)?.from,
        )}
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
                <h1 className="font-serif text-2xl">
                  {pageHeader ??
                    (procedureView ? t(procedurePageTitleKey(procedureView)) : matter.title)}
                </h1>
                <MatterStatusBadge status={matter.status} />
                {matter.isArchived ? (
                  <Badge variant="outline">{t('layout.archivedBadge')}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {procedureView ? (
                  <>
                    {matter.title}
                    {' · '}
                  </>
                ) : null}
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
              <div className="flex flex-wrap items-center gap-2">
                {matter.matterType === 'trademark' && !matter.isArchived && !procedureView ? (
                  <PermissionGate resource="matter" action="update">
                    <SecondaryActionsMenu
                      onEditScope={() => setScopeOpen(true)}
                      onSelectAction={setSecondaryAction}
                    />
                  </PermissionGate>
                ) : null}
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
              </div>
            ) : null}
          </div>

          {!procedureView ? (
            <MatterTabNav
              matterId={id}
              isPortalClient={isPortalClient}
              matterType={matter.matterType}
            />
          ) : (
            <TrademarkProcedureMatterNav tabs={procedureNavTabs} />
          )}
          <Outlet
            context={{
              matterId: id,
              matter,
              openEditScope: () => setScopeOpen(true),
            }}
          />
          {matter.matterType === 'trademark' && !procedureView ? (
            <>
              <EditScopeDrawer
                open={scopeOpen}
                onClose={() => setScopeOpen(false)}
                matter={matter}
              />
              <TrademarkActionDrawer
                open={Boolean(secondaryAction)}
                onClose={() => setSecondaryAction(null)}
                matter={matter}
                action={secondaryAction}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

export type MatterTabContext = {
  matterId: string
  matter: NonNullable<ReturnType<typeof useMatter>['data']>
  openEditScope?: () => void
}
