import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { documentsApi } from '@/features/documents/api'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import type { OppositionStage } from '@/features/matters/opposition-matter'
import {
  appendOppositionEvent,
  oppositionStageConfig,
  readOppositionEvents,
} from '@/features/matters/opposition-workflow'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'

type OppositionStageWorkflowPanelProps = {
  matter: MatterDetail
  stage: OppositionStage | null
}

function PanelShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

export function OppositionStageWorkflowPanel({
  matter,
  stage,
}: OppositionStageWorkflowPanelProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const config = oppositionStageConfig(stage)
  const panel = config.workflowPanel

  const [incomingNumber, setIncomingNumber] = useState('')
  const [appealDate, setAppealDate] = useState('')
  const [appealFile, setAppealFile] = useState<File | null>(null)
  const [courtAppeal, setCourtAppeal] = useState(false)
  const [regarding, setRegarding] = useState('')
  const [deadline, setDeadline] = useState('')
  const [details, setDetails] = useState('')
  const [corrFile, setCorrFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (panel === 'none') return null

  const saveEvents = async (
    events: ReturnType<typeof readOppositionEvents>,
    patch: Record<string, unknown> = {},
  ) => {
    await updateMatter.mutateAsync({
      attributes: {
        ...attrs,
        oppositionEvents: events,
        ...patch,
      },
    })
  }

  const submitAppeal = async () => {
    if (!canUpdate) return
    setError(null)
    setBusy(true)
    try {
      let documentId: string | undefined
      if (appealFile) {
        const doc = await documentsApi.upload(matter.id, {
          file: appealFile,
          displayName: appealFile.name,
          category: 'evidence',
          tags: 'opposition-appeal,opposition-archive',
        })
        documentId = doc.id
      }
      const appealedBy = user?.fullName?.trim() || user?.email || '—'
      const events = appendOppositionEvent(readOppositionEvents(attrs), {
        kind: courtAppeal ? 'court_appeal' : 'appeal',
        label: courtAppeal
          ? t('oppositionView.timeline.courtAppealFiled')
          : t('oppositionView.timeline.appealFiled'),
        at: appealDate ? new Date(appealDate).toISOString() : new Date().toISOString(),
        incomingNumber: incomingNumber.trim() || undefined,
        appealedBy,
        documentId,
      })
      await saveEvents(events, {
        oppositionStage: 'case',
        oppositionCaseNumber: incomingNumber.trim() || undefined,
        oppositionCaseDate: appealDate || undefined,
      })
      setIncomingNumber('')
      setAppealDate('')
      setAppealFile(null)
      setCourtAppeal(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const submitCorrespondence = async () => {
    if (!canUpdate) return
    setError(null)
    setBusy(true)
    try {
      let documentId: string | undefined
      if (corrFile) {
        const doc = await documentsApi.upload(matter.id, {
          file: corrFile,
          displayName: corrFile.name,
          category: 'correspondence',
          tags: 'opposition-correspondence,opposition-archive',
        })
        documentId = doc.id
      }
      const events = appendOppositionEvent(readOppositionEvents(attrs), {
        kind: 'correspondence',
        label: regarding.trim() || t('oppositionView.workflow.correspondence'),
        at: new Date().toISOString(),
        regarding: regarding.trim() || undefined,
        documentId,
      })
      await saveEvents(events)
      setRegarding('')
      setDeadline('')
      setDetails('')
      setCorrFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const advanceToCaseDraft = async () => {
    if (!canUpdate) return
    setBusy(true)
    try {
      const events = appendOppositionEvent(readOppositionEvents(attrs), {
        kind: 'stage',
        label: t('oppositionList.stages.case'),
        at: new Date().toISOString(),
      })
      await saveEvents(events, { oppositionStage: 'case' })
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {config.showCaseDraftButton ? (
        <div className="flex justify-center">
          <Button
            type="button"
            size="lg"
            disabled={!canUpdate || busy}
            onClick={() => void advanceToCaseDraft()}
          >
            {t('oppositionView.workflow.caseDraft')}
          </Button>
        </div>
      ) : null}

      {panel === 'appeal' ? (
        <PanelShell title={t('oppositionView.workflow.appealTitle')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">
                {t('oppositionView.workflow.incomingNumber')}
              </span>
              <Input
                value={incomingNumber}
                onChange={(e) => setIncomingNumber(e.target.value)}
                className="bg-background font-mono"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">{t('oppositionView.workflow.date')}</span>
              <Input
                type="date"
                value={appealDate}
                onChange={(e) => setAppealDate(e.target.value)}
                className="bg-background"
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                {t('oppositionView.workflow.attachAppeal')}
              </span>
              <Input
                type="file"
                onChange={(e) => setAppealFile(e.target.files?.[0] ?? null)}
                className="bg-background"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={courtAppeal}
                onChange={(e) => setCourtAppeal(e.target.checked)}
                className="size-4 rounded border"
              />
              <span className="text-muted-foreground">
                {t('oppositionView.workflow.courtAppeal')}
              </span>
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              disabled={!canUpdate || busy}
              onClick={() => void submitAppeal()}
            >
              {t('oppositionView.workflow.submit')}
            </Button>
          </div>
        </PanelShell>
      ) : null}

      {panel === 'correspondence' || panel === 'solution' ? (
        <PanelShell
          title={
            panel === 'solution'
              ? t('oppositionView.workflow.solutionTitle')
              : t('oppositionView.workflow.correspondenceTitle')
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                {t('oppositionView.workflow.attachDocument')}
              </span>
              <Input
                type="file"
                onChange={(e) => setCorrFile(e.target.files?.[0] ?? null)}
                className="bg-background"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">{t('oppositionView.workflow.regarding')}</span>
              <Input
                value={regarding}
                onChange={(e) => setRegarding(e.target.value)}
                className="bg-background"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">{t('oppositionView.workflow.deadline')}</span>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-background"
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                {t('oppositionView.workflow.additionalInfo')}
              </span>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="bg-background"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              disabled={!canUpdate || busy}
              onClick={() => void submitCorrespondence()}
            >
              {panel === 'solution'
                ? t('oppositionView.workflow.solutionSubmit')
                : t('oppositionView.workflow.submit')}
            </Button>
          </div>
        </PanelShell>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
