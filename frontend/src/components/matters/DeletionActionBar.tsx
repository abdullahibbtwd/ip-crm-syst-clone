import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Archive, Folder, RotateCcw, Square } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  appendDeletionStatusHistory,
  matterStatusForDeletionStage,
  type DeletionStage,
} from '@/features/matters/deletion-matter'
import {
  appendDeletionEvent,
  readDeletionEvents,
} from '@/features/matters/deletion-workflow'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type DeletionActionBarProps = {
  matter: MatterDetail
  stage: DeletionStage | null
  statusHistory: string[]
  restoreStage: DeletionStage | null
  documentCount?: number
}

export function DeletionActionBar({
  matter,
  stage,
  statusHistory,
  restoreStage,
  documentCount = 0,
}: DeletionActionBarProps) {
  const { t } = useTranslation(['matters', 'common'])
  const { confirm } = useAppAlert()
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}
  const [error, setError] = useState<string | null>(null)
  const [stopReason, setStopReason] = useState('')
  const [stopUntil, setStopUntil] = useState('')
  const [showStopForm, setShowStopForm] = useState(false)

  const canStop = stage !== 'stopped' && stage !== 'closed'
  const canArchive = stage !== 'closed'
  const canRestore = stage === 'stopped' && restoreStage

  const archivePath = useMemo(() => `/matters/${matter.id}/deletion-archive`, [matter.id])

  const handleStop = async () => {
    if (!canUpdate || !canStop) return
    setError(null)
    try {
      const userName = user?.fullName?.trim() || user?.email || '—'
      const events = appendDeletionEvent(readDeletionEvents(attrs), {
        kind: 'stage',
        label: t('deletionList.stages.stopped'),
        at: new Date().toISOString(),
        regarding: stopReason.trim() || undefined,
      })
      await updateMatter.mutateAsync({
        status: matterStatusForDeletionStage('stopped') ?? 'on_hold',
        attributes: {
          ...attrs,
          deletionStage: 'stopped',
          deletionRestoreStage: stage ?? undefined,
          deletionStopReason: stopReason.trim() || undefined,
          deletionStopUntil: stopUntil || undefined,
          deletionEvents: events,
          deletionStatusHistory: appendDeletionStatusHistory(statusHistory, {
            stageLabel: t('deletionList.stages.stopped'),
            userName,
          }),
        },
      })
      setShowStopForm(false)
      setStopReason('')
      setStopUntil('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('deletionView.actions.stopFailed')))
    }
  }

  const handleRestore = async () => {
    if (!canUpdate || !canRestore || !restoreStage) return
    setError(null)
    try {
      const userName = user?.fullName?.trim() || user?.email || '—'
      const events = appendDeletionEvent(readDeletionEvents(attrs), {
        kind: 'stage',
        label: t('deletionView.actions.restored'),
        at: new Date().toISOString(),
      })
      await updateMatter.mutateAsync({
        status: matterStatusForDeletionStage(restoreStage) ?? 'active',
        attributes: {
          ...attrs,
          deletionStage: restoreStage,
          deletionRestoreStage: undefined,
          deletionStopReason: undefined,
          deletionStopUntil: undefined,
          deletionEvents: events,
          deletionStatusHistory: appendDeletionStatusHistory(statusHistory, {
            stageLabel: t('deletionView.actions.restored'),
            userName,
          }),
        },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('deletionView.actions.restoreFailed')))
    }
  }

  const handleArchive = async () => {
    if (!canUpdate || !canArchive) return
    const ok = await confirm({
      title: t('deletionView.actions.archive'),
      message: t('deletionView.actions.archiveConfirm'),
      variant: 'warning',
      confirmLabel: t('deletionView.actions.archive'),
      cancelLabel: t('common:actions.cancel'),
    })
    if (!ok) return
    setError(null)
    try {
      const userName = user?.fullName?.trim() || user?.email || '—'
      const events = appendDeletionEvent(readDeletionEvents(attrs), {
        kind: 'stage',
        label: t('deletionList.stages.closed'),
        at: new Date().toISOString(),
      })
      await updateMatter.mutateAsync({
        status: matterStatusForDeletionStage('closed') ?? 'closed',
        attributes: {
          ...attrs,
          deletionStage: 'closed',
          deletionEvents: events,
          deletionStatusHistory: appendDeletionStatusHistory(statusHistory, {
            stageLabel: t('deletionList.stages.closed'),
            userName,
          }),
        },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('deletionView.actions.archiveFailed')))
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
      {showStopForm ? (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="text-muted-foreground">{t('deletionView.actions.stopReason')}</span>
            <Input
              value={stopReason}
              onChange={(e) => setStopReason(e.target.value)}
              className="bg-background"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">{t('deletionView.actions.stopUntil')}</span>
            <Input
              type="date"
              value={stopUntil}
              onChange={(e) => setStopUntil(e.target.value)}
              className="bg-background"
            />
          </label>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={archivePath}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'relative inline-flex gap-1.5 px-2',
          )}
        >
          <Folder className="size-4" />
          {documentCount > 0 ? (
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {documentCount}
            </span>
          ) : null}
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canRestore ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!canUpdate || updateMatter.isPending}
              onClick={() => void handleRestore()}
            >
              <RotateCcw className="size-3.5" />
              {t('deletionView.actions.restore')}
            </Button>
          ) : null}
          {canArchive ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canUpdate || updateMatter.isPending}
              onClick={() => void handleArchive()}
            >
              <Archive className="size-3.5" />
              {t('deletionView.actions.archive')}
            </Button>
          ) : null}
          {canStop ? (
            showStopForm ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowStopForm(false)
                    setStopReason('')
                    setStopUntil('')
                  }}
                >
                  {t('deletionView.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!canUpdate || updateMatter.isPending}
                  onClick={() => void handleStop()}
                >
                  <Square className="size-3.5 fill-current" />
                  {t('deletionView.actions.stop')}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!canUpdate || updateMatter.isPending}
                onClick={() => setShowStopForm(true)}
              >
                <Square className="size-3.5 fill-current" />
                {t('deletionView.actions.stop')}
              </Button>
            )
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
