import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { documentsApi } from '@/features/documents/api'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import type { CancellationStage } from '@/features/matters/cancellation-matter'
import {
  appendCancellationEvent,
  cancellationStageConfig,
  readCancellationEvents,
} from '@/features/matters/cancellation-workflow'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'

type CancellationStageWorkflowPanelProps = {
  matter: MatterDetail
  stage: CancellationStage | null
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

export function CancellationStageWorkflowPanel({
  matter,
  stage,
}: CancellationStageWorkflowPanelProps) {
  const { t } = useTranslation('matters')
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const config = cancellationStageConfig(stage)
  const panel = config.workflowPanel

  const [feeAmount, setFeeAmount] = useState('100')
  const [feeDate, setFeeDate] = useState('')
  const [feeFile, setFeeFile] = useState<File | null>(null)
  const [poaNumber, setPoaNumber] = useState('')
  const [poaDate, setPoaDate] = useState('')
  const [poaFile, setPoaFile] = useState<File | null>(null)
  const [cancellationNumber, setCancellationNumber] = useState('')
  const [filingDate, setFilingDate] = useState('')
  const [filingFile, setFilingFile] = useState<File | null>(null)
  const [regarding, setRegarding] = useState('')
  const [deadline, setDeadline] = useState('')
  const [details, setDetails] = useState('')
  const [corrFile, setCorrFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (panel === 'none') return null

  const savePatch = async (
    events: ReturnType<typeof readCancellationEvents>,
    patch: Record<string, unknown> = {},
  ) => {
    await updateMatter.mutateAsync({
      attributes: {
        ...attrs,
        cancellationEvents: events,
        ...patch,
      },
    })
  }

  const uploadDoc = async (file: File, tags: string) => {
    const doc = await documentsApi.upload(matter.id, {
      file,
      displayName: file.name,
      category: 'evidence',
      tags,
    })
    return doc.id
  }

  const submitFee = async () => {
    if (!canUpdate) return
    setError(null)
    setBusy(true)
    try {
      let documentId: string | undefined
      if (feeFile) {
        documentId = await uploadDoc(feeFile, 'cancellation-fee,cancellation-archive')
      }
      const events = appendCancellationEvent(readCancellationEvents(attrs), {
        kind: 'fee_paid',
        label: t('cancellationView.workflow.feePaid'),
        at: feeDate ? new Date(feeDate).toISOString() : new Date().toISOString(),
        documentId,
      })
      await savePatch(events, {
        cancellationFee: {
          amount: feeAmount.trim() || undefined,
          paidDate: feeDate || undefined,
          documentId,
        },
      })
      setFeeFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err, t('cancellationView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const submitPoa = async () => {
    if (!canUpdate) return
    setError(null)
    setBusy(true)
    try {
      let documentId: string | undefined
      if (poaFile) {
        documentId = await uploadDoc(poaFile, 'cancellation-poa,cancellation-archive')
      }
      const events = appendCancellationEvent(readCancellationEvents(attrs), {
        kind: 'poa_received',
        label: t('cancellationView.workflow.poaReceived'),
        at: poaDate ? new Date(poaDate).toISOString() : new Date().toISOString(),
        documentId,
      })
      await savePatch(events, {
        cancellationPoa: {
          number: poaNumber.trim() || undefined,
          date: poaDate || undefined,
          documentId,
        },
      })
      setPoaNumber('')
      setPoaDate('')
      setPoaFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err, t('cancellationView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const submitFiling = async () => {
    if (!canUpdate) return
    setError(null)
    setBusy(true)
    try {
      let documentId: string | undefined
      if (filingFile) {
        documentId = await uploadDoc(filingFile, 'cancellation-filing,cancellation-archive')
      }
      const events = appendCancellationEvent(readCancellationEvents(attrs), {
        kind: 'filing',
        label: t('cancellationView.workflow.filingRecorded'),
        at: filingDate ? new Date(filingDate).toISOString() : new Date().toISOString(),
        cancellationNumber: cancellationNumber.trim() || undefined,
        cancellationDate: filingDate || undefined,
        documentId,
      })
      await savePatch(events, {
        cancellationNumber: cancellationNumber.trim() || undefined,
        cancellationFilingDate: filingDate || undefined,
        cancellationStage: 'in_correspondence',
      })
      setCancellationNumber('')
      setFilingDate('')
      setFilingFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err, t('cancellationView.workflow.saveFailed')))
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
        documentId = await uploadDoc(
          corrFile,
          'cancellation-correspondence,cancellation-archive',
        )
      }
      const events = appendCancellationEvent(readCancellationEvents(attrs), {
        kind: 'correspondence',
        label: regarding.trim() || t('cancellationView.workflow.correspondence'),
        at: new Date().toISOString(),
        regarding: regarding.trim() || undefined,
        documentId,
      })
      const existingDeadlines = Array.isArray(attrs.cancellationDeadlines)
        ? [...attrs.cancellationDeadlines]
        : []
      if (regarding.trim() && deadline) {
        existingDeadlines.push({
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          deadline,
          regarding: regarding.trim(),
          details: details.trim() || undefined,
        })
      }
      await savePatch(events, { cancellationDeadlines: existingDeadlines })
      setRegarding('')
      setDeadline('')
      setDetails('')
      setCorrFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err, t('cancellationView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const advanceToCase = async () => {
    if (!canUpdate) return
    setBusy(true)
    try {
      const events = appendCancellationEvent(readCancellationEvents(attrs), {
        kind: 'decision',
        label: t('cancellationList.stages.case'),
        at: new Date().toISOString(),
      })
      await savePatch(events, { cancellationStage: 'case' })
    } catch (err) {
      setError(getApiErrorMessage(err, t('cancellationView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {panel === 'pre_filing' ? (
        <>
          <PanelShell title={t('cancellationView.workflow.feeTitle')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.feeAmount')}
                </span>
                <Input
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.feeDate')}
                </span>
                <Input
                  type="date"
                  value={feeDate}
                  onChange={(e) => setFeeDate(e.target.value)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.attachDocument')}
                </span>
                <Input
                  type="file"
                  onChange={(e) => setFeeFile(e.target.files?.[0] ?? null)}
                  className="bg-background"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={!canUpdate || busy}
                onClick={() => void submitFee()}
              >
                {t('cancellationView.workflow.submit')}
              </Button>
            </div>
          </PanelShell>

          <PanelShell title={t('cancellationView.workflow.poaTitle')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.poaNumber')}
                </span>
                <Input
                  value={poaNumber}
                  onChange={(e) => setPoaNumber(e.target.value)}
                  className="bg-background font-mono"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.poaDate')}
                </span>
                <Input
                  type="date"
                  value={poaDate}
                  onChange={(e) => setPoaDate(e.target.value)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.attachPoa')}
                </span>
                <Input
                  type="file"
                  onChange={(e) => setPoaFile(e.target.files?.[0] ?? null)}
                  className="bg-background"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={!canUpdate || busy}
                onClick={() => void submitPoa()}
              >
                {t('cancellationView.workflow.submit')}
              </Button>
            </div>
          </PanelShell>

          <PanelShell title={t('cancellationView.workflow.filingTitle')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.cancellationNumber')}
                </span>
                <Input
                  value={cancellationNumber}
                  onChange={(e) => setCancellationNumber(e.target.value)}
                  className="bg-background font-mono"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.filingDate')}
                </span>
                <Input
                  type="date"
                  value={filingDate}
                  onChange={(e) => setFilingDate(e.target.value)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span className="text-muted-foreground">
                  {t('cancellationView.workflow.attachDocument')}
                </span>
                <Input
                  type="file"
                  onChange={(e) => setFilingFile(e.target.files?.[0] ?? null)}
                  className="bg-background"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={!canUpdate || busy}
                onClick={() => void submitFiling()}
              >
                {t('cancellationView.workflow.submit')}
              </Button>
            </div>
          </PanelShell>
        </>
      ) : null}

      {panel === 'correspondence' || panel === 'decision' ? (
        <PanelShell title={t('cancellationView.workflow.correspondenceTitle')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                {t('cancellationView.workflow.attachDocument')}
              </span>
              <Input
                type="file"
                onChange={(e) => setCorrFile(e.target.files?.[0] ?? null)}
                className="bg-background"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">
                {t('cancellationView.workflow.regarding')}
              </span>
              <Input
                value={regarding}
                onChange={(e) => setRegarding(e.target.value)}
                className="bg-background"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">
                {t('cancellationView.workflow.deadline')}
              </span>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-background"
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                {t('cancellationView.workflow.additionalInfo')}
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
              {t('cancellationView.workflow.submit')}
            </Button>
          </div>
        </PanelShell>
      ) : null}

      {config.showDecisionButton ? (
        <div className="flex justify-center">
          <Button
            type="button"
            size="lg"
            disabled={!canUpdate || busy}
            onClick={() => void advanceToCase()}
          >
            {t('cancellationView.workflow.decision')}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
