import { useTranslation } from 'react-i18next'
import { Loader2, Printer, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { mattersApi } from '@/features/matters/api'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  appendOppositionStatusHistory,
  matterStatusForOppositionStage,
  type OppositionStage,
} from '@/features/matters/opposition-matter'
import {
  appendOppositionEvent,
  readOppositionEvents,
} from '@/features/matters/opposition-workflow'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { useState } from 'react'

type OppositionActionBarProps = {
  matter: MatterDetail
  stage: OppositionStage | null
  statusHistory: string[]
}

export function OppositionActionBar({
  matter,
  stage,
  statusHistory,
}: OppositionActionBarProps) {
  const { t, i18n } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}
  const [error, setError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)

  const canStop = stage !== 'stopped' && stage !== 'closed'

  const handleStop = async () => {
    if (!canUpdate || !canStop) return
    setError(null)
    try {
      const userName = user?.fullName?.trim() || user?.email || '—'
      const events = appendOppositionEvent(readOppositionEvents(attrs), {
        kind: 'stage',
        label: t('oppositionList.stages.stopped'),
        at: new Date().toISOString(),
      })
      await updateMatter.mutateAsync({
        status: matterStatusForOppositionStage('stopped') ?? 'on_hold',
        attributes: {
          ...attrs,
          oppositionStage: 'stopped',
          oppositionEvents: events,
          oppositionStatusHistory: appendOppositionStatusHistory(statusHistory, {
            stageLabel: t('oppositionList.stages.stopped'),
            userName,
          }),
        },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.actions.stopFailed')))
    }
  }

  const handlePrint = async () => {
    setError(null)
    setPrinting(true)
    try {
      const lang = i18n.language.startsWith('bg') ? 'bg' : 'en'
      const { url } = await mattersApi.getOppositionPdf(matter.id, lang)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.actions.printFailed')))
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="opposition-action-bar rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
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
            {t('oppositionView.actions.stop')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={printing}
          onClick={() => void handlePrint()}
        >
          {printing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Printer className="size-3.5" />
          )}
          {printing ? t('oppositionView.actions.printing') : t('oppositionView.actions.print')}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
