import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronLeft, ChevronRight, Loader2, Receipt } from 'lucide-react'
import { readFileApproval } from '@/components/matters/MatterFileApprovalPanel'
import { MatterStageAttachments } from '@/components/matters/MatterStageAttachments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateFixedFee } from '@/features/billing/hooks/useBilling'
import { useCreateDeadline } from '@/features/deadlines/hooks/useDeadlines'
import { useMatterDocuments } from '@/features/documents/hooks/useDocuments'
import {
  useCreateInvoice,
  useIssueInvoice,
} from '@/features/invoices/hooks/useInvoices'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import { missingRequiredAttachLabels } from '@/features/matters/stage-connections'
import {
  defaultDesignRoute,
  defaultPatentRoute,
  nextDesignStage,
  nextPatentStage,
  nextStage,
  nextUtilityModelStage,
  pipelineForDesignRoute,
  pipelineForPatentRoute,
  pipelineForTerritory,
  pipelineForUtilityModel,
  previousDesignStage,
  previousPatentStage,
  previousStage,
  previousUtilityModelStage,
  prosecutionStageLabelKey,
  readProsecution,
  stageAdvanceBlockReason,
  territoryFromAttrs,
  type DesignFilingRoute,
  type PatentFilingRoute,
  type ProsecutionStage,
  type ProsecutionState,
} from '@/features/matters/prosecution-stages'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type MatterProsecutionPanelProps = {
  matter: MatterDetail
}

export function MatterProsecutionPanel({ matter }: MatterProsecutionPanelProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const createDeadline = useCreateDeadline()
  const createFixedFee = useCreateFixedFee(matter.id)
  const createInvoice = useCreateInvoice(matter.id)
  const issueInvoice = useIssueInvoice(matter.id)
  const { data: documents } = useMatterDocuments(matter.id)

  const [error, setError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState(false)
  const [invoiceHint, setInvoiceHint] = useState<string | null>(null)
  const [invoiceBusy, setInvoiceBusy] = useState(false)

  const attrs = matter.attributes?.attributes ?? {}
  const isPatent = matter.matterType === 'patent'
  const isSpc =
    isPatent &&
    (attrs.spc === true || attrs.patentProcedure === 'spc')
  const isRegularPatent = isPatent && !isSpc
  const isDesign = matter.matterType === 'industrial_design'
  const isGi = matter.matterType === 'geographical_indication'
  const isUtilityModel = matter.matterType === 'utility_model'
  const isTrademark = matter.matterType === 'trademark'
  const territory = territoryFromAttrs(attrs)
  const patentRoute: PatentFilingRoute = defaultPatentRoute(attrs)
  const designRoute: DesignFilingRoute = defaultDesignRoute(attrs)
  const pipeline = useMemo(() => {
    if (isRegularPatent) return pipelineForPatentRoute(patentRoute)
    if (isSpc || isGi) return pipelineForUtilityModel()
    if (isDesign) return pipelineForDesignRoute(designRoute)
    if (isUtilityModel) return pipelineForUtilityModel()
    return pipelineForTerritory(territory)
  }, [isRegularPatent, isSpc, isGi, isDesign, isUtilityModel, patentRoute, designRoute, territory])
  const prosecution = readProsecution(attrs)
  const approval = readFileApproval(attrs)

  const currentStage: ProsecutionStage =
    prosecution?.stage ?? (matter.status === 'draft' ? 'prep' : 'filing')

  const [appNumber, setAppNumber] = useState(prosecution?.applicationNumber ?? '')
  const [appDate, setAppDate] = useState(prosecution?.applicationDate ?? '')
  const [addReps, setAddReps] = useState(prosecution?.addRepresentatives ?? true)
  const [reps, setReps] = useState(prosecution?.representatives ?? '')
  const [stateFee, setStateFee] = useState(prosecution?.stateFeeBgn ?? '')
  const [payDeadline, setPayDeadline] = useState(prosecution?.paymentDeadline ?? '')
  const [remindDays, setRemindDays] = useState(prosecution?.paymentRemindDays ?? '5')
  const [feePaidDate, setFeePaidDate] = useState(prosecution?.feePaidDate ?? '')
  const [generatePoa, setGeneratePoa] = useState(prosecution?.generatePoa ?? true)
  const [sendPoaEmail, setSendPoaEmail] = useState(prosecution?.sendPoaEmail ?? true)
  const [poaDeadline, setPoaDeadline] = useState(prosecution?.poaDeadline ?? '')
  const [poaIncoming, setPoaIncoming] = useState(prosecution?.poaIncomingNumber ?? '')
  const [poaDate, setPoaDate] = useState(prosecution?.poaDate ?? '')
  const [bulletinNo, setBulletinNo] = useState(prosecution?.bulletinNumber ?? '')
  const [bulletinDate, setBulletinDate] = useState(prosecution?.bulletinDate ?? '')
  const [oaSubject, setOaSubject] = useState(prosecution?.officeActionSubject ?? '')
  const [oaDeadline, setOaDeadline] = useState(prosecution?.officeActionDeadline ?? '')
  const [regFeePaidDate, setRegFeePaidDate] = useState(
    prosecution?.regFeePaidDate ?? '',
  )

  useEffect(() => {
    setAppNumber(prosecution?.applicationNumber ?? '')
    setAppDate(prosecution?.applicationDate ?? '')
    setAddReps(prosecution?.addRepresentatives ?? true)
    setReps(prosecution?.representatives ?? '')
    setStateFee(prosecution?.stateFeeBgn ?? '')
    setPayDeadline(prosecution?.paymentDeadline ?? '')
    setRemindDays(prosecution?.paymentRemindDays ?? '5')
    setFeePaidDate(prosecution?.feePaidDate ?? '')
    setGeneratePoa(prosecution?.generatePoa ?? true)
    setSendPoaEmail(prosecution?.sendPoaEmail ?? true)
    setPoaDeadline(prosecution?.poaDeadline ?? '')
    setPoaIncoming(prosecution?.poaIncomingNumber ?? '')
    setPoaDate(prosecution?.poaDate ?? '')
    setBulletinNo(prosecution?.bulletinNumber ?? '')
    setBulletinDate(prosecution?.bulletinDate ?? '')
    setOaSubject(prosecution?.officeActionSubject ?? '')
    setOaDeadline(prosecution?.officeActionDeadline ?? '')
    setRegFeePaidDate(prosecution?.regFeePaidDate ?? '')
    setError(null)
    setSavedHint(false)
    setInvoiceHint(
      prosecution?.hubSync?.issuedInvoiceNumber
        ? t('prosecution.hub.invoiceAlreadyIssued', {
            number: prosecution.hubSync.issuedInvoiceNumber,
          })
        : null,
    )
  }, [matter.id, matter.updatedAt, prosecution?.stage, t])

  const stageIndex = Math.max(0, pipeline.indexOf(currentStage))
  const finished =
    currentStage === 'registration' && stageIndex === pipeline.length - 1
  const fieldsLocked = !canUpdate

  const jurisdiction = matter.jurisdictions[0]?.countryCode?.trim() || 'BG'
  const assigneeId = matter.assignedTo?.id ?? user?.id

  const buildCurrentPatch = (stage = currentStage): ProsecutionState => ({
    stage,
    applicationNumber: appNumber.trim() || undefined,
    applicationDate: appDate || undefined,
    addRepresentatives: addReps,
    representatives: reps.trim() || undefined,
    stateFeeBgn: stateFee.trim() || undefined,
    paymentDeadline: payDeadline || undefined,
    paymentRemindDays: remindDays.trim() || undefined,
    feePaidDate: feePaidDate || undefined,
    generatePoa,
    sendPoaEmail,
    poaDeadline: poaDeadline || undefined,
    poaIncomingNumber: poaIncoming.trim() || undefined,
    poaDate: poaDate || undefined,
    bulletinNumber: bulletinNo.trim() || undefined,
    bulletinDate: bulletinDate || undefined,
    officeActionSubject: oaSubject.trim() || undefined,
    officeActionDeadline: oaDeadline || undefined,
    regFeePaidDate: regFeePaidDate || undefined,
    hubSync: prosecution?.hubSync,
  })

  const saveProsecution = async (
    next: ProsecutionState,
    extra?: { status?: MatterDetail['status'] },
  ) => {
    setError(null)
    try {
      await updateMatter.mutateAsync({
        ...extra,
        attributes: {
          ...attrs,
          ...(isTrademark ? { territory } : {}),
          prosecution: next,
        },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('prosecution.errors.saveFailed')))
      throw err
    }
  }

  /** Create deadlines from stage dates without a separate button. */
  const autoCreateDeadlines = async (patch: ProsecutionState) => {
    if (!assigneeId) return patch
    const sync = { ...(patch.hubSync ?? {}) }
    let changed = false

    try {
      if (
        patch.paymentDeadline &&
        !sync.paymentDeadline &&
        (currentStage === 'formal_exam' || currentStage === 'reg_fee')
      ) {
        await createDeadline.mutateAsync({
          matterId: matter.id,
          title: t('prosecution.hub.deadlineTitles.payment'),
          jurisdiction,
          dueDate: patch.paymentDeadline,
          assignedToId: assigneeId,
          notes: patch.paymentRemindDays
            ? t('prosecution.hub.deadlineNotes.remindDays', {
                days: patch.paymentRemindDays,
              })
            : undefined,
        })
        sync.paymentDeadline = true
        changed = true
      }

      if (
        patch.poaDeadline &&
        !sync.poaDeadline &&
        currentStage === 'formal_exam'
      ) {
        await createDeadline.mutateAsync({
          matterId: matter.id,
          title: t('prosecution.hub.deadlineTitles.poa'),
          jurisdiction,
          dueDate: patch.poaDeadline,
          assignedToId: assigneeId,
        })
        sync.poaDeadline = true
        changed = true
      }

      if (
        patch.officeActionDeadline &&
        !sync.oaDeadline &&
        currentStage === 'substantive_exam'
      ) {
        await createDeadline.mutateAsync({
          matterId: matter.id,
          title: patch.officeActionSubject?.trim()
            ? t('prosecution.hub.deadlineTitles.oaWithSubject', {
                subject: patch.officeActionSubject.trim(),
              })
            : t('prosecution.hub.deadlineTitles.oa'),
          jurisdiction,
          dueDate: patch.officeActionDeadline,
          assignedToId: assigneeId,
        })
        sync.oaDeadline = true
        changed = true
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('prosecution.hub.deadlineFailed')))
      throw err
    }

    return changed ? { ...patch, hubSync: sync } : patch
  }

  const handleSave = async () => {
    if (!canUpdate) return
    setSavedHint(false)
    try {
      let patch = buildCurrentPatch()
      patch = await autoCreateDeadlines(patch)
      await saveProsecution(patch)
      setSavedHint(true)
    } catch {
      /* shown */
    }
  }

  const handleGenerateInvoice = async () => {
    if (!canUpdate) return
    const amount = Number(String(stateFee).replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('prosecution.hub.needStateFee'))
      return
    }
    if (prosecution?.hubSync?.issuedInvoiceId) {
      setInvoiceHint(
        t('prosecution.hub.invoiceAlreadyIssued', {
          number: prosecution.hubSync.issuedInvoiceNumber ?? '',
        }),
      )
      return
    }

    setError(null)
    setInvoiceHint(null)
    setInvoiceBusy(true)
    try {
      // Persist fee fields first so the stage stays in sync with the invoice.
      let patch = buildCurrentPatch()
      patch = await autoCreateDeadlines(patch)

      const fee = await createFixedFee.mutateAsync({
        description: t('prosecution.hub.feeDescription'),
        amount,
        currency: 'BGN',
        category: 'disbursement',
        date: new Date().toISOString().slice(0, 10),
        isBillable: true,
      })

      const draft = await createInvoice.mutateAsync({
        fixedFeeIds: [fee.id],
        dueDate: payDeadline || undefined,
        notes: t('prosecution.hub.invoiceNotes'),
      })

      const issued = await issueInvoice.mutateAsync(draft.id)

      const nextHub = {
        ...(patch.hubSync ?? {}),
        stateFee: true,
        issuedInvoiceId: issued.id,
        issuedInvoiceNumber: issued.invoiceNumber ?? undefined,
      }
      await saveProsecution({ ...patch, hubSync: nextHub })

      setInvoiceHint(
        t('prosecution.hub.invoiceIssued', {
          number: issued.invoiceNumber ?? issued.id,
        }),
      )
    } catch (err) {
      setError(getApiErrorMessage(err, t('prosecution.hub.invoiceFailed')))
    } finally {
      setInvoiceBusy(false)
    }
  }

  const handleCompleteStage = async () => {
    if (!canUpdate || !user) return
    setSavedHint(false)

    let patch = buildCurrentPatch()
    const block = stageAdvanceBlockReason(currentStage, patch, attrs, approval)
    if (block) {
      setError(t(`prosecution.errors.${block}`))
      return
    }

    const missingKeys = missingRequiredAttachLabels(
      currentStage,
      (documents ?? []).map((d) => d.tags),
      { hasOfficeAction: Boolean(oaSubject.trim()) },
    )
    if (missingKeys.length > 0) {
      setError(
        t('prosecution.errors.needAttachments', {
          list: missingKeys.map((k) => t(k)).join(', '),
        }),
      )
      return
    }

    if (
      currentStage === 'formal_exam' &&
      Number(String(stateFee).replace(',', '.')) > 0 &&
      !patch.hubSync?.issuedInvoiceId
    ) {
      setError(t('prosecution.errors.needInvoice'))
      return
    }

    const nxt = isRegularPatent
      ? nextPatentStage(patentRoute, currentStage)
      : isSpc || isGi || isUtilityModel
        ? nextUtilityModelStage(currentStage)
        : isDesign
          ? nextDesignStage(designRoute, currentStage)
          : nextStage(territory, currentStage)
    if (!nxt) {
      setError(t('prosecution.errors.alreadyFinal'))
      return
    }

    try {
      patch = await autoCreateDeadlines(patch)
      await saveProsecution({ ...patch, stage: nxt })
    } catch {
      /* shown */
    }
  }

  const handleGoBack = async () => {
    if (!canUpdate) return
    setSavedHint(false)
    const prev = isRegularPatent
      ? previousPatentStage(patentRoute, currentStage)
      : isSpc || isGi || isUtilityModel
        ? previousUtilityModelStage(currentStage)
        : isDesign
          ? previousDesignStage(designRoute, currentStage)
          : previousStage(territory, currentStage)
    if (!prev) return
    try {
      await saveProsecution(buildCurrentPatch(prev))
    } catch {
      /* shown */
    }
  }

  if (!isRegularPatent && !isSpc && !isGi && !isTrademark && !isDesign && !isUtilityModel) return null

  const prosecutionMatterType = isRegularPatent
    ? 'patent'
    : isDesign || isUtilityModel || isSpc || isGi
      ? 'design'
      : 'trademark'

  const stageLabel = (stage: ProsecutionStage) =>
    t(prosecutionStageLabelKey(prosecutionMatterType, stage, attrs), {
      defaultValue: stage.replace(/_/g, ' '),
    })

  const jurisdictionCode = matter.jurisdictions[0]?.countryCode
  const pipelineSubtitle = isRegularPatent
    ? t(`createFile.patentFilingRoutes.${patentRoute}`)
    : isDesign
      ? t(`createFile.designFilingRoutes.${designRoute}`)
      : isSpc
        ? jurisdictionCode ?? t('spcShelf.title')
        : isGi
          ? jurisdictionCode ?? t('type.geographical_indication')
          : isUtilityModel
            ? jurisdictionCode ?? t('type.utility_model')
            : t(`prosecution.territoryLabel.${territory}`)

  const pipelineHint = isRegularPatent
    ? t('prosecution.patentRouteFromInfo')
    : isDesign
      ? t('prosecution.designRouteFromInfo')
      : isSpc
        ? t('prosecution.spcTerritoryFromInfo')
        : isGi
          ? t('prosecution.giTerritoryFromInfo')
          : isUtilityModel
            ? t('prosecution.utilityModelTerritoryFromInfo')
            : t('prosecution.territoryFromInfo')

  const busy =
    updateMatter.isPending ||
    createDeadline.isPending ||
    invoiceBusy

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-base">{t('prosecution.title')}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {pipelineSubtitle} · {pipelineHint}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-1">
          {pipeline.map((stage, i) => {
            const done = stageIndex > i || (finished && stage === 'registration')
            const active = stage === currentStage
            return (
              <div key={stage} className="flex items-center gap-1">
                <div
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
                    active && 'bg-primary text-primary-foreground',
                    done &&
                      !active &&
                      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
                    !done && !active && 'bg-muted text-muted-foreground',
                  )}
                >
                  {done && !active ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="size-3" />
                      {stageLabel(stage)}
                    </span>
                  ) : (
                    stageLabel(stage)
                  )}
                </div>
                {i < pipeline.length - 1 ? (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                ) : null}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">{t('prosecution.gateHint')}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentStage === 'prep' ? (
          <p className="text-sm text-muted-foreground">{t('prosecution.prepHint')}</p>
        ) : null}

        {currentStage === 'filing' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.addRepresentatives')}
              </span>
              <Select
                value={addReps ? 'yes' : 'no'}
                onValueChange={(v) => setAddReps(v === 'yes')}
                disabled={fieldsLocked}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('prosecution.yes')}</SelectItem>
                  <SelectItem value="no">{t('prosecution.no')}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            {addReps ? (
              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="text-xs text-muted-foreground">
                  {t('prosecution.fields.representatives')}
                </span>
                <Input
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  disabled={fieldsLocked}
                />
              </label>
            ) : null}
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.applicationNumber')} *
              </span>
              <Input
                value={appNumber}
                onChange={(e) => setAppNumber(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.applicationDate')} *
              </span>
              <Input
                type="date"
                value={appDate}
                onChange={(e) => setAppDate(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {t('prosecution.molHint')}
            </p>
          </div>
        ) : null}

        {currentStage === 'formal_exam' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.stateFee')} *
              </span>
              <Input
                value={stateFee}
                onChange={(e) => setStateFee(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.paymentDeadline')} *
              </span>
              <Input
                type="date"
                value={payDeadline}
                onChange={(e) => setPayDeadline(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>

            {canUpdate ? (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-fit gap-1.5"
                  disabled={busy || !stateFee.trim()}
                  onClick={() => void handleGenerateInvoice()}
                >
                  {invoiceBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Receipt className="size-4" />
                  )}
                  {prosecution?.hubSync?.issuedInvoiceId
                    ? t('prosecution.hub.invoiceIssuedShort')
                    : t('prosecution.hub.generateInvoice')}
                </Button>
                {invoiceHint ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {invoiceHint}
                  </p>
                ) : null}
              </div>
            ) : null}

            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.remindDays')}
              </span>
              <Input
                value={remindDays}
                onChange={(e) => setRemindDays(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.feePaidDate')} *
              </span>
              <Input
                type="date"
                value={feePaidDate}
                onChange={(e) => setFeePaidDate(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={generatePoa}
                onChange={(e) => setGeneratePoa(e.target.checked)}
                disabled={fieldsLocked}
                className="size-4 rounded border"
              />
              {t('prosecution.fields.generatePoa')}
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={sendPoaEmail}
                onChange={(e) => setSendPoaEmail(e.target.checked)}
                disabled={fieldsLocked}
                className="size-4 rounded border"
              />
              {t('prosecution.fields.sendPoaEmail')}
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.poaDeadline')}
              </span>
              <Input
                type="date"
                value={poaDeadline}
                onChange={(e) => setPoaDeadline(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.poaIncoming')} *
              </span>
              <Input
                value={poaIncoming}
                onChange={(e) => setPoaIncoming(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.poaDate')} *
              </span>
              <Input
                type="date"
                value={poaDate}
                onChange={(e) => setPoaDate(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
          </div>
        ) : null}

        {currentStage === 'substantive_exam' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.officeAction')}
              </span>
              <Textarea
                rows={3}
                value={oaSubject}
                onChange={(e) => setOaSubject(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.officeActionDeadline')}
              </span>
              <Input
                type="date"
                value={oaDeadline}
                onChange={(e) => setOaDeadline(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
          </div>
        ) : null}

        {currentStage === 'publication' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.bulletinNumber')} *
              </span>
              <Input
                value={bulletinNo}
                onChange={(e) => setBulletinNo(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.bulletinDate')} *
              </span>
              <Input
                type="date"
                value={bulletinDate}
                onChange={(e) => setBulletinDate(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
          </div>
        ) : null}

        {currentStage === 'reg_fee' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('prosecution.fields.regFeePaidDate')} *
              </span>
              <Input
                type="date"
                value={regFeePaidDate}
                onChange={(e) => setRegFeePaidDate(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
          </div>
        ) : null}

        {currentStage === 'registration' ? (
          <div className="space-y-2 text-sm">
            <p className="text-emerald-700 dark:text-emerald-300">
              {t('prosecution.registeredDone')}
            </p>
            {bulletinNo ? (
              <p className="text-muted-foreground">
                {t('prosecution.fields.bulletinNumber')}: {bulletinNo}
                {bulletinDate ? ` · ${bulletinDate}` : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        <MatterStageAttachments
          matterId={matter.id}
          stage={currentStage}
          canUpdate={canUpdate}
          hasOfficeAction={Boolean(oaSubject.trim())}
        />

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {savedHint && !error ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {t('prosecution.saved')}
          </p>
        ) : null}

        {canUpdate ? (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {(isRegularPatent
              ? previousPatentStage(patentRoute, currentStage)
              : isSpc || isGi || isUtilityModel
                ? previousUtilityModelStage(currentStage)
                : isDesign
                  ? previousDesignStage(designRoute, currentStage)
                  : previousStage(territory, currentStage)) ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="gap-1"
                onClick={() => void handleGoBack()}
              >
                <ChevronLeft className="size-4" />
                {t('prosecution.goBack')}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleSave()}
            >
              {updateMatter.isPending
                ? t('prosecution.saving')
                : t('prosecution.saveEntered')}
            </Button>
            {currentStage !== 'registration' ? (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void handleCompleteStage()}
              >
                {t('prosecution.completeStage')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
