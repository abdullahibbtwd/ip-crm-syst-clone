import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { documentsApi } from '@/features/documents/api'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  buildDefaultAppealDeadline,
  type DeletionAppealStatus,
  type DeletionDeadline,
  type DeletionStage,
} from '@/features/matters/deletion-matter'
import {
  appendDeletionEvent,
  deletionDecisionRefPatch,
  deletionStageConfig,
  readDeletionEvents,
} from '@/features/matters/deletion-workflow'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type DeletionStageWorkflowPanelProps = {
  matter: MatterDetail
  stage: DeletionStage | null
  appealStatus: DeletionAppealStatus | null
}

type ReminderUnit = 'days' | 'months'

function subtractReminder(deadline: string, amount: number, unit: ReminderUnit): string {
  if (!deadline) return ''
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return ''
  if (unit === 'months') d.setMonth(d.getMonth() - amount)
  else d.setDate(d.getDate() - amount)
  return d.toISOString().slice(0, 10)
}

function buildDeadlineRow(
  regarding: string,
  deadline: string,
  reminderAmount: number,
  reminderUnit: ReminderUnit,
): DeletionDeadline {
  return {
    id: crypto.randomUUID(),
    date: subtractReminder(deadline, reminderAmount, reminderUnit),
    deadline,
    regarding,
  }
}

function ReminderFields({
  amount,
  unit,
  onAmountChange,
  onUnitChange,
  disabled,
  t,
}: {
  amount: number
  unit: ReminderUnit
  onAmountChange: (value: number) => void
  onUnitChange: (value: ReminderUnit) => void
  disabled?: boolean
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <span className="pb-2 text-xs text-muted-foreground uppercase tracking-wide">
        {t('deletionView.workflow.remindBefore')}
      </span>
      <Input
        type="number"
        min={0}
        value={amount}
        disabled={disabled}
        onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
        className="h-9 w-16 bg-background"
      />
      <Select
        value={unit}
        disabled={disabled}
        onValueChange={(v) => onUnitChange(v as ReminderUnit)}
      >
        <SelectTrigger className="h-9 w-28 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="days">{t('deletionView.workflow.reminderDays')}</SelectItem>
          <SelectItem value="months">{t('deletionView.workflow.reminderMonths')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function DeletionStageWorkflowPanel({
  matter,
  stage,
  appealStatus,
}: DeletionStageWorkflowPanelProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const config = deletionStageConfig(stage)
  const panel = config.workflowPanel

  const [generateProforma, setGenerateProforma] = useState(false)
  const [feeAmount, setFeeAmount] = useState('100')
  const [feeDeadline, setFeeDeadline] = useState('')
  const [feeReminderAmount, setFeeReminderAmount] = useState(1)
  const [feeReminderUnit, setFeeReminderUnit] = useState<ReminderUnit>('months')
  const [poaDeadline, setPoaDeadline] = useState('')
  const [poaReminderAmount, setPoaReminderAmount] = useState(1)
  const [poaReminderUnit, setPoaReminderUnit] = useState<ReminderUnit>('months')
  const [filingDeadline, setFilingDeadline] = useState('')
  const [filingReminderAmount, setFilingReminderAmount] = useState(1)
  const [filingReminderUnit, setFilingReminderUnit] = useState<ReminderUnit>('months')
  const [deletionNumber, setDeletionNumber] = useState('')
  const [filingDate, setFilingDate] = useState('')

  const [decisionNumber, setDecisionNumber] = useState('')
  const [decisionDate, setDecisionDate] = useState('')
  const [regarding, setRegarding] = useState('')
  const [deadline, setDeadline] = useState('')
  const [details, setDetails] = useState('')
  const [corrFile, setCorrFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const fee = attrs.deletionFee
    if (fee && typeof fee === 'object' && !Array.isArray(fee)) {
      const row = fee as Record<string, unknown>
      if (typeof row.amount === 'string') setFeeAmount(row.amount)
    }
    setGenerateProforma(attrs.deletionGenerateProforma === true)
  }, [matter.id, matter.updatedAt, attrs.deletionFee, attrs.deletionGenerateProforma])

  if (panel === 'none') return null

  const savePatch = async (
    events: ReturnType<typeof readDeletionEvents>,
    patch: Record<string, unknown> = {},
  ) => {
    await updateMatter.mutateAsync({
      attributes: {
        ...attrs,
        deletionEvents: events,
        ...patch,
      },
    })
  }

  const submitProformaSetup = async () => {
    if (!canUpdate) return
    setError(null)
    setBusy(true)
    try {
      const deadlines: DeletionDeadline[] = []
      if (feeDeadline) {
        deadlines.push(
          buildDeadlineRow(
            t('deletionView.workflow.feeDeadlineRegarding'),
            feeDeadline,
            feeReminderAmount,
            feeReminderUnit,
          ),
        )
      }
      if (poaDeadline) {
        deadlines.push(
          buildDeadlineRow(
            t('deletionView.workflow.poaDeadlineRegarding'),
            poaDeadline,
            poaReminderAmount,
            poaReminderUnit,
          ),
        )
      }
      if (filingDeadline) {
        deadlines.push(
          buildDeadlineRow(
            t('deletionView.workflow.filingDeadlineRegarding'),
            filingDeadline,
            filingReminderAmount,
            filingReminderUnit,
          ),
        )
      }

      const events = deletionNumber.trim() || filingDate
        ? appendDeletionEvent(
            appendDeletionEvent(readDeletionEvents(attrs), {
              kind: 'stage',
              label: t('deletionView.workflow.proformaRecorded'),
              at: new Date().toISOString(),
            }),
            {
              kind: 'filing',
              label: t('deletionView.workflow.filingRecorded'),
              at: filingDate ? new Date(filingDate).toISOString() : new Date().toISOString(),
              deletionNumber: deletionNumber.trim() || undefined,
              deletionDate: filingDate || undefined,
            },
          )
        : appendDeletionEvent(readDeletionEvents(attrs), {
            kind: 'stage',
            label: t('deletionView.workflow.proformaRecorded'),
            at: new Date().toISOString(),
          })

      const patch: Record<string, unknown> = {
        deletionGenerateProforma: generateProforma,
        deletionFee: {
          amount: feeAmount.trim() || undefined,
        },
        deletionDeadlines: deadlines,
      }

      if (deletionNumber.trim() || filingDate) {
        patch.deletionNumber = deletionNumber.trim() || undefined
        patch.deletionFilingDate = filingDate || undefined
        patch.deletionStage = 'in_correspondence'
      }

      await savePatch(events, patch)
    } catch (err) {
      setError(getApiErrorMessage(err, t('deletionView.workflow.saveFailed')))
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
          tags: 'deletion-correspondence,deletion-archive',
        })
        documentId = doc.id
      }
      const events = appendDeletionEvent(readDeletionEvents(attrs), {
        kind: 'correspondence',
        label: regarding.trim() || t('deletionView.workflow.correspondence'),
        at: new Date().toISOString(),
        regarding: regarding.trim() || undefined,
        documentId,
      })
      const existingDeadlines = Array.isArray(attrs.deletionDeadlines)
        ? [...attrs.deletionDeadlines]
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
      await savePatch(events, { deletionDeadlines: existingDeadlines })
      setRegarding('')
      setDeadline('')
      setDetails('')
      setCorrFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err, t('deletionView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const submitDecision = async () => {
    if (!canUpdate) return
    if (!decisionNumber.trim()) {
      setError(t('deletionView.workflow.decisionNumberRequired'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      const events = appendDeletionEvent(readDeletionEvents(attrs), {
        kind: 'decision',
        label: t('deletionView.workflow.decisionRecorded'),
        at: decisionDate ? new Date(decisionDate).toISOString() : new Date().toISOString(),
        decisionNumber: decisionNumber.trim(),
        decisionDate: decisionDate || undefined,
      })
      const existingDeadlines = Array.isArray(attrs.deletionDeadlines)
        ? [...attrs.deletionDeadlines]
        : []
      const hasAppealDeadline = existingDeadlines.some((row) => {
        if (!row || typeof row !== 'object') return false
        const regarding = (row as Record<string, unknown>).regarding
        return typeof regarding === 'string' && regarding.toLowerCase().includes('appeal')
      })
      await savePatch(events, {
        deletionStage: 'decision',
        ...deletionDecisionRefPatch(decisionNumber, decisionDate),
        deletionDeadlines: hasAppealDeadline
          ? existingDeadlines
          : [...existingDeadlines, buildDefaultAppealDeadline()],
      })
      setDecisionNumber('')
      setDecisionDate('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('deletionView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const setAppealStatus = async (status: DeletionAppealStatus) => {
    if (!canUpdate) return
    setError(null)
    setBusy(true)
    try {
      const userName = user?.fullName?.trim() || user?.email || '—'
      const events = appendDeletionEvent(readDeletionEvents(attrs), {
        kind: status === 'appealed' ? 'appeal' : 'not_appealed',
        label:
          status === 'appealed'
            ? t('deletionView.workflow.appealed')
            : t('deletionView.workflow.notAppealed'),
        at: new Date().toISOString(),
        regarding: userName,
      })
      await savePatch(events, {
        deletionAppealStatus: status,
        ...(status === 'appealed' ? { deletionStage: 'case' } : {}),
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('deletionView.workflow.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {panel === 'pre_filing' ? (
        <div className="rounded-xl border border-border/80 bg-muted/15 p-4 sm:p-5">
          <label className="mb-4 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={generateProforma}
              disabled={!canUpdate || busy}
              onChange={(e) => setGenerateProforma(e.target.checked)}
              className="size-4 rounded border-border"
            />
            {t('deletionView.workflow.generateProforma')}
          </label>

          <div className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium uppercase tracking-wide text-muted-foreground">
                  {t('deletionView.workflow.stateFee')}
                </span>
                <Input
                  value={feeAmount}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium uppercase tracking-wide text-muted-foreground">
                  {t('deletionView.workflow.feePaymentDeadline')}
                </span>
                <Input
                  type="date"
                  value={feeDeadline}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setFeeDeadline(e.target.value)}
                  className="bg-background"
                />
              </label>
            </div>
            <ReminderFields
              amount={feeReminderAmount}
              unit={feeReminderUnit}
              disabled={!canUpdate || busy}
              onAmountChange={setFeeReminderAmount}
              onUnitChange={setFeeReminderUnit}
              t={t}
            />

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                {t('deletionView.workflow.poaSendDeadline')}
              </span>
              <Input
                type="date"
                value={poaDeadline}
                disabled={!canUpdate || busy}
                onChange={(e) => setPoaDeadline(e.target.value)}
                className="bg-background"
              />
            </label>
            <ReminderFields
              amount={poaReminderAmount}
              unit={poaReminderUnit}
              disabled={!canUpdate || busy}
              onAmountChange={setPoaReminderAmount}
              onUnitChange={setPoaReminderUnit}
              t={t}
            />

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                {t('deletionView.workflow.filingDeadlineLabel')}
              </span>
              <Input
                type="date"
                value={filingDeadline}
                disabled={!canUpdate || busy}
                onChange={(e) => setFilingDeadline(e.target.value)}
                className="bg-background"
              />
            </label>
            <ReminderFields
              amount={filingReminderAmount}
              unit={filingReminderUnit}
              disabled={!canUpdate || busy}
              onAmountChange={setFilingReminderAmount}
              onUnitChange={setFilingReminderUnit}
              t={t}
            />

            <div className="grid gap-3 border-t border-dashed border-border/80 pt-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.deletionNumber')}
                </span>
                <Input
                  value={deletionNumber}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setDeletionNumber(e.target.value)}
                  className="bg-background font-mono"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.filingDate')}
                </span>
                <Input
                  type="date"
                  value={filingDate}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setFilingDate(e.target.value)}
                  className="bg-background"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              size="lg"
              disabled={!canUpdate || busy}
              onClick={() => void submitProformaSetup()}
            >
              {t('deletionView.workflow.submit')}
            </Button>
          </div>
        </div>
      ) : null}

      {panel === 'correspondence' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('deletionView.workflow.correspondenceTitle')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.attachDocument')}
                </span>
                <Input
                  type="file"
                  disabled={!canUpdate || busy}
                  onChange={(e) => setCorrFile(e.target.files?.[0] ?? null)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.regarding')}
                </span>
                <Input
                  value={regarding}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setRegarding(e.target.value)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.deadline')}
                </span>
                <Input
                  type="date"
                  value={deadline}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-background"
                />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.additionalInfo')}
                </span>
                <Textarea
                  value={details}
                  disabled={!canUpdate || busy}
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
                {t('deletionView.workflow.submit')}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('deletionView.workflow.decisionTitle')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.decisionNumber')}
                </span>
                <Input
                  value={decisionNumber}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setDecisionNumber(e.target.value)}
                  className="bg-background font-mono"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">
                  {t('deletionView.workflow.decisionDate')}
                </span>
                <Input
                  type="date"
                  value={decisionDate}
                  disabled={!canUpdate || busy}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  className="bg-background"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                size="lg"
                disabled={!canUpdate || busy}
                onClick={() => void submitDecision()}
              >
                {t('deletionView.workflow.decision')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {panel === 'appeal' ? (
        <div className="flex flex-wrap justify-center gap-3 py-2">
          <Button
            type="button"
            size="lg"
            variant={appealStatus === 'not_appealed' ? 'default' : 'outline'}
            disabled={!canUpdate || busy}
            className={cn(
              'min-w-[160px]',
              appealStatus === 'not_appealed' && 'ring-2 ring-primary',
            )}
            onClick={() => void setAppealStatus('not_appealed')}
          >
            {t('deletionView.workflow.notAppealed')}
          </Button>
          <Button
            type="button"
            size="lg"
            variant={appealStatus === 'appealed' ? 'default' : 'outline'}
            disabled={!canUpdate || busy}
            className={cn('min-w-[160px]', appealStatus === 'appealed' && 'ring-2 ring-primary')}
            onClick={() => void setAppealStatus('appealed')}
          >
            {t('deletionView.workflow.appealed')}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
