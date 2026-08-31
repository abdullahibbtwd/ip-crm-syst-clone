import { useTranslation } from 'react-i18next'
import { Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  appendCancellationStatusHistory,
  matterStatusForCancellationStage,
  type CancellationStage,
} from '@/features/matters/cancellation-matter'
import {
  appendCancellationEvent,
  readCancellationEvents,
} from '@/features/matters/cancellation-workflow'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { useState } from 'react'

type CancellationActionBarProps = {
  matter: MatterDetail
  stage: CancellationStage | null
  statusHistory: string[]
}

export function CancellationActionBar({
  matter,
  stage,
  statusHistory,
}: CancellationActionBarProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}
  const [error, setError] = useState<string | null>(null)

  const canStop = stage !== 'stopped' && stage !== 'closed'

  const handleStop = async () => {
    if (!canUpdate || !canStop) return
    setError(null)
    try {
      const userName = user?.fullName?.trim() || user?.email || '—'
      const events = appendCancellationEvent(readCancellationEvents(attrs), {
        kind: 'stage',
        label: t('cancellationList.stages.stopped'),
        at: new Date().toISOString(),
      })
      await updateMatter.mutateAsync({
        status: matterStatusForCancellationStage('stopped') ?? 'on_hold',
        attributes: {
          ...attrs,
          cancellationStage: 'stopped',
          cancellationEvents: events,
          cancellationStatusHistory: appendCancellationStatusHistory(statusHistory, {
            stageLabel: t('cancellationList.stages.stopped'),
            userName,
          }),
        },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('cancellationView.actions.stopFailed')))
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canStop ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!canUpdate || updateMatter.isPending}
            onClick={() => void handleStop()}
          >
            <Square className="size-3.5 fill-current" />
            {t('cancellationView.actions.stop')}
          </Button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
