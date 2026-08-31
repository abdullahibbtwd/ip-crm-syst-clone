import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { MarkImageThumb } from '@/components/matters/MarkImageThumb'
import { MarkImageUploadField } from '@/components/matters/MarkImageUploadField'
import { OppositionStageBadge } from '@/components/matters/OppositionStageBadge'
import { OppositionActionBar } from '@/components/matters/OppositionActionBar'
import { OppositionEventTimeline } from '@/components/matters/OppositionEventTimeline'
import { OppositionStageWorkflowPanel } from '@/components/matters/OppositionStageWorkflowPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clientDisplayName } from '@/features/crm/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { documentsApi } from '@/features/documents/api'
import { getCountryLabel } from '@/lib/countries'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  markImageAttributePatch,
  readMarkImageRefs,
  uploadMarkImage,
} from '@/features/matters/mark-image'
import {
  OPPOSITION_STAGES,
  appendOppositionStatusHistory,
  matterStatusForOppositionStage,
  oppositionMarkTypeLabel,
  OPPOSITION_STAGE_BADGE_VARIANT,
  readOppositionFields,
  type OppositionBasisMark,
  type OppositionStage,
} from '@/features/matters/opposition-matter'
import {
  appendOppositionEvent,
  decisionEventKindForStage,
  oppositionDecisionRefPatch,
  readOppositionDecisionRef,
  stageCapturesDecisionOnSave,
} from '@/features/matters/opposition-workflow'
import { formatNiceClasses } from '@/features/matters/trademark-list-utils'
import { trademarkProcedureStageSelectLabel } from '@/features/matters/trademark-procedure-stage-label'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'

type OppositionMatterTabProps = {
  matter: MatterDetail
}

function FieldRow({
  label,
  value,
  children,
  valueClassName,
}: {
  label: string
  value?: string
  children?: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[minmax(120px,160px)_1fr] sm:items-start sm:gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children ?? (
        <span className={valueClassName ?? 'text-sm text-foreground'}>{value || '—'}</span>
      )}
    </div>
  )
}

function BasisMarkBlock({ mark, t }: { mark: OppositionBasisMark; t: (k: string) => string }) {
  const hasImage = Boolean(mark.markImageDocumentId)
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        {hasImage ? (
          <MarkImageThumb
            documentId={mark.markImageDocumentId}
            versionId={mark.markImageDocumentVersionId}
            size="md"
          />
        ) : mark.hasFile ? (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <span className="text-xs text-muted-foreground">—</span>
          </span>
        ) : null}
        <div className="min-w-0 flex-1 space-y-2">
          <FieldRow label={t('oppositionView.basisMarkName')} value={mark.name?.trim() || '—'} />
          <FieldRow
            label={t('oppositionView.basisTerritory')}
            value={mark.country ? getCountryLabel(mark.country) : '—'}
          />
          <FieldRow
            label={t('oppositionView.basisMarkNo')}
            value={mark.applicationNo?.trim() || '—'}
          />
          <FieldRow label={t('oppositionView.basisAppDate')} value={mark.applicationDate || '—'} />
          <FieldRow label={t('oppositionView.basisClasses')} value={mark.classes?.trim() || '—'} />
        </div>
      </div>
      {!hasImage && !mark.hasFile ? (
        <p className="text-xs text-muted-foreground">{t('oppositionView.noMarkImage')}</p>
      ) : null}
    </div>
  )
}

export function OppositionMatterTab({ matter }: OppositionMatterTabProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markImageFile, setMarkImageFile] = useState<File | null>(null)
  const [clearMarkImage, setClearMarkImage] = useState(false)

  const initial = readOppositionFields(matter)
  const [markName, setMarkName] = useState(initial.markName)
  const [applicationNumber, setApplicationNumber] = useState(initial.applicationNumber)
  const [applicationDate, setApplicationDate] = useState(initial.applicationDate)
  const [representative, setRepresentative] = useState(initial.representative)
  const [againstClasses, setAgainstClasses] = useState(initial.againstClasses)
  const [submittedBy, setSubmittedBy] = useState(initial.submittedBy)
  const [oppositionStage, setOppositionStage] = useState<OppositionStage | ''>(
    initial.oppositionStage ?? '',
  )
  const decisionRef = readOppositionDecisionRef(attrs)
  const [decisionNumber, setDecisionNumber] = useState(decisionRef.number ?? '')
  const [decisionDate, setDecisionDate] = useState(decisionRef.date ?? '')

  const storedMarkImage = readMarkImageRefs(attrs)
  const { data: markImageDownload } = useQuery({
    queryKey: [
      'opposition-mark-image',
      matter.id,
      storedMarkImage.documentId,
      storedMarkImage.versionId,
    ],
    queryFn: () =>
      documentsApi.getDownloadUrl(
        storedMarkImage.documentId!,
        storedMarkImage.versionId ?? undefined,
      ),
    enabled: Boolean(storedMarkImage.documentId) && !markImageFile && !clearMarkImage,
    staleTime: 10 * 60 * 1000,
  })

  const applicantLabel = matter.applicantClient
    ? clientDisplayName(matter.applicantClient)
    : clientDisplayName(matter.client)

  const markTypeLabel = oppositionMarkTypeLabel(initial.markType, initial.territory)
  const classesLabel = formatNiceClasses(initial.niceClasses)

  const syncFromMatter = () => {
    const next = readOppositionFields(matter)
    setMarkName(next.markName)
    setApplicationNumber(next.applicationNumber)
    setApplicationDate(next.applicationDate)
    setRepresentative(next.representative)
    setAgainstClasses(next.againstClasses)
    setSubmittedBy(next.submittedBy)
    setOppositionStage(next.oppositionStage ?? '')
    const ref = readOppositionDecisionRef(matter.attributes?.attributes ?? {})
    setDecisionNumber(ref.number ?? '')
    setDecisionDate(ref.date ?? '')
    setMarkImageFile(null)
    setClearMarkImage(false)
  }

  useEffect(() => {
    syncFromMatter()
    setEditing(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matter.id, matter.updatedAt])

  const fieldsLocked = !canUpdate || !editing

  const handleSave = async () => {
    if (!canUpdate || !editing) return
    setError(null)
    if (!markName.trim()) {
      setError(t('oppositionView.errors.markNameRequired'))
      return
    }

    try {
      let markImagePatch: Record<string, string | undefined> = {}
      if (markImageFile) {
        markImagePatch = markImageAttributePatch(
          await uploadMarkImage(matter.id, markImageFile, markName.trim()),
        )
      } else if (clearMarkImage) {
        markImagePatch = markImageAttributePatch(null)
      }

      const nextStage = oppositionStage || null
      const previousStage = initial.oppositionStage
      const stageChanged = nextStage !== previousStage
      const nextStatus = matterStatusForOppositionStage(nextStage)

      let oppositionStatusHistory = initial.statusHistory
      let oppositionEvents = initial.events
      if (stageChanged && nextStage) {
        oppositionStatusHistory = appendOppositionStatusHistory(oppositionStatusHistory, {
          stageLabel: t(`oppositionList.stages.${nextStage}`),
          userName: user?.fullName?.trim() || user?.email || '—',
        })
        const eventKind = decisionEventKindForStage(nextStage, oppositionEvents)
        if (eventKind) {
          oppositionEvents = appendOppositionEvent(oppositionEvents, {
            kind: eventKind,
            label: t(`oppositionView.timeline.${eventKind}`),
            at: decisionDate
              ? new Date(decisionDate).toISOString()
              : new Date().toISOString(),
            decisionNumber: decisionNumber.trim() || undefined,
            decisionDate: decisionDate || undefined,
          })
        }
      }

      const decisionPatch =
        stageCapturesDecisionOnSave(nextStage) ||
        Boolean(decisionNumber.trim() || decisionDate)
          ? oppositionDecisionRefPatch(decisionNumber, decisionDate)
          : {}

      await updateMatter.mutateAsync({
        title: markName.trim(),
        ...(nextStatus ? { status: nextStatus } : {}),
        attributes: {
          ...attrs,
          applicationNumber: applicationNumber.trim() || undefined,
          applicationDate: applicationDate || undefined,
          againstClasses: againstClasses.trim() || undefined,
          oppositionFiler: submittedBy.trim() || undefined,
          oppositionStage: nextStage || undefined,
          oppositionStatusHistory,
          oppositionEvents,
          ...decisionPatch,
          prosecution: {
            ...(typeof attrs.prosecution === 'object' && attrs.prosecution
              ? attrs.prosecution
              : {}),
            representatives: representative.trim() || undefined,
          },
          ...markImagePatch,
        },
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('oppositionView.errors.saveFailed')))
    }
  }

  const editControls = canUpdate ? (
    editing ? (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => {
            syncFromMatter()
            setEditing(false)
            setError(null)
          }}
        >
          {t('oppositionView.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => void handleSave()}
        >
          {updateMatter.isPending ? t('oppositionView.saving') : t('oppositionView.save')}
        </Button>
      </div>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setEditing(true)}
      >
        <Pencil className="size-3.5" />
        {t('oppositionView.edit')}
      </Button>
    )
  ) : null

  const previewUrl =
    clearMarkImage || markImageFile ? null : markImageDownload?.url ?? null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <OppositionStageBadge
            stage={initial.oppositionStage}
            matterStatus={matter.status}
          />
          {editing ? (
            <FieldRow label={t('oppositionView.stage')}>
              <Select
                value={oppositionStage || 'none'}
                onValueChange={(v) =>
                  setOppositionStage(v === 'none' ? '' : (v as OppositionStage))
                }
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder={t('oppositionView.stagePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" label={t('oppositionView.stageNone')}>
                    {t('oppositionView.stageNone')}
                  </SelectItem>
                  {OPPOSITION_STAGES.map((stage) => (
                    <SelectItem
                      key={stage}
                      value={stage}
                      label={trademarkProcedureStageSelectLabel(t, 'oppositionList', stage)}
                    >
                      <span className="flex items-center gap-2">
                        <Badge
                          variant={OPPOSITION_STAGE_BADGE_VARIANT[stage]}
                          className="pointer-events-none normal-case tracking-normal"
                        >
                          {trademarkProcedureStageSelectLabel(t, 'oppositionList', stage)}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          ) : null}
          {editing && oppositionStage && stageCapturesDecisionOnSave(oppositionStage) ? (
            <div className="grid max-w-md gap-3 sm:grid-cols-2">
              <FieldRow label={t('oppositionView.decisionNumber')}>
                <Input
                  value={decisionNumber}
                  onChange={(e) => setDecisionNumber(e.target.value)}
                  className="font-mono"
                  placeholder="88888888"
                />
              </FieldRow>
              <FieldRow label={t('oppositionView.decisionDate')}>
                <Input
                  type="date"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                />
              </FieldRow>
            </div>
          ) : null}
          {editing && oppositionStage ? (
            <p className="max-w-xl text-xs text-muted-foreground">
              {t(`oppositionView.stageDescriptions.${oppositionStage}`)}
            </p>
          ) : null}
          {editing ? (
            <p className="max-w-xl text-xs text-muted-foreground">
              {t('oppositionView.stageChangeHint')}
            </p>
          ) : null}
        </div>
        {editControls}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('oppositionView.subjectMark')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldRow label={t('oppositionView.markName')}>
              {fieldsLocked ? (
                <span className="text-sm font-medium">{markName}</span>
              ) : (
                <Input value={markName} onChange={(e) => setMarkName(e.target.value)} />
              )}
            </FieldRow>
            <FieldRow label={t('oppositionView.applicationNumber')}>
              {fieldsLocked ? (
                <span className="text-sm">{applicationNumber || '—'}</span>
              ) : (
                <Input
                  value={applicationNumber}
                  onChange={(e) => setApplicationNumber(e.target.value)}
                />
              )}
            </FieldRow>
            <FieldRow label={t('oppositionView.applicationDate')}>
              {fieldsLocked ? (
                <span className="text-sm">{applicationDate || '—'}</span>
              ) : (
                <Input
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                />
              )}
            </FieldRow>
            <FieldRow
              label={t('oppositionView.classes')}
              value={classesLabel}
              valueClassName="text-sm font-medium text-destructive"
            />
            <FieldRow label={t('oppositionView.markType')} value={markTypeLabel} />
            <FieldRow label={t('oppositionView.applicant')} value={applicantLabel} />
            <FieldRow label={t('oppositionView.representative')}>
              {fieldsLocked ? (
                <span className="text-sm">{representative || '—'}</span>
              ) : (
                <Input
                  value={representative}
                  onChange={(e) => setRepresentative(e.target.value)}
                />
              )}
            </FieldRow>
            <div className="border-t border-border/60 pt-3">
              {fieldsLocked ? (
                <div className="flex items-start gap-3">
                  <MarkImageThumb
                    documentId={storedMarkImage.documentId}
                    versionId={storedMarkImage.versionId}
                    size="md"
                  />
                  {!storedMarkImage.documentId ? (
                    <p className="text-sm text-muted-foreground">
                      {t('oppositionView.noMarkImage')}
                    </p>
                  ) : null}
                </div>
              ) : (
                <MarkImageUploadField
                  file={markImageFile}
                  onFileChange={(file) => {
                    setMarkImageFile(file)
                    if (file) setClearMarkImage(false)
                  }}
                  remotePreviewUrl={previewUrl}
                  onClearRemote={() => setClearMarkImage(true)}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('oppositionView.opposingMarks')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {initial.basisMarks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('oppositionView.noBasisMarks')}</p>
            ) : (
              initial.basisMarks.map((mark, index) => (
                <BasisMarkBlock key={`${mark.applicationNo}-${index}`} mark={mark} t={t} />
              ))
            )}
            <div className="border-t border-border/60 pt-3 space-y-3">
              <FieldRow label={t('oppositionView.againstClasses')}>
                {fieldsLocked ? (
                  <span className="text-sm">{againstClasses || '—'}</span>
                ) : (
                  <Input
                    value={againstClasses}
                    onChange={(e) => setAgainstClasses(e.target.value)}
                    placeholder="1, 3, 35"
                  />
                )}
              </FieldRow>
              <FieldRow label={t('oppositionView.submittedBy')}>
                {fieldsLocked ? (
                  <span className="text-sm">{submittedBy || '—'}</span>
                ) : (
                  <Input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} />
                )}
              </FieldRow>
            </div>
          </CardContent>
        </Card>
      </div>

      <OppositionEventTimeline
        events={initial.events}
        legacyLines={initial.statusHistory}
      />

      <OppositionStageWorkflowPanel matter={matter} stage={initial.oppositionStage} />

      <OppositionActionBar
        matter={matter}
        stage={initial.oppositionStage}
        statusHistory={initial.statusHistory}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
