import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { CancellationActionBar } from '@/components/matters/CancellationActionBar'
import { CancellationDeadlinesTable } from '@/components/matters/CancellationDeadlinesTable'
import { CancellationStageBadge } from '@/components/matters/CancellationStageBadge'
import { CancellationStageWorkflowPanel } from '@/components/matters/CancellationStageWorkflowPanel'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { clientDisplayName } from '@/features/crm/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  appendCancellationStatusHistory,
  CANCELLATION_STAGE_BADGE_VARIANT,
  CANCELLATION_STAGES,
  matterStatusForCancellationStage,
  cancellationMarkTypeLabel,
  readCancellationFields,
  type CancellationStage,
} from '@/features/matters/cancellation-matter'
import { formatNiceClasses } from '@/features/matters/trademark-list-utils'
import { trademarkProcedureStageSelectLabel } from '@/features/matters/trademark-procedure-stage-label'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'

type CancellationMatterTabProps = {
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

export function CancellationMatterTab({ matter }: CancellationMatterTabProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initial = readCancellationFields(matter)
  const [markName, setMarkName] = useState(initial.markName)
  const [applicationNumber, setApplicationNumber] = useState(initial.applicationNumber)
  const [applicationDate, setApplicationDate] = useState(initial.applicationDate)
  const [registrationNumber, setRegistrationNumber] = useState(initial.registrationNumber)
  const [representative, setRepresentative] = useState(initial.representative)
  const [grounds, setGrounds] = useState(initial.grounds)
  const [againstClasses, setAgainstClasses] = useState(initial.againstClasses)
  const [submittedBy, setSubmittedBy] = useState(initial.submittedBy)
  const [cancellationStage, setCancellationStage] = useState<CancellationStage | ''>(
    initial.cancellationStage ?? '',
  )

  const applicantLabel = matter.applicantClient
    ? clientDisplayName(matter.applicantClient)
    : clientDisplayName(matter.client)

  const markTypeLabel = cancellationMarkTypeLabel(initial.markType, initial.territory)
  const classesLabel = formatNiceClasses(initial.niceClasses)

  const syncFromMatter = () => {
    const next = readCancellationFields(matter)
    setMarkName(next.markName)
    setApplicationNumber(next.applicationNumber)
    setApplicationDate(next.applicationDate)
    setRegistrationNumber(next.registrationNumber)
    setRepresentative(next.representative)
    setGrounds(next.grounds)
    setAgainstClasses(next.againstClasses)
    setSubmittedBy(next.submittedBy)
    setCancellationStage(next.cancellationStage ?? '')
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
      setError(t('cancellationView.errors.markNameRequired'))
      return
    }

    try {
      const nextStage = cancellationStage || null
      const previousStage = initial.cancellationStage
      const stageChanged = nextStage !== previousStage
      const nextStatus = matterStatusForCancellationStage(nextStage)

      let cancellationStatusHistory = initial.statusHistory
      if (stageChanged && nextStage) {
        cancellationStatusHistory = appendCancellationStatusHistory(
          cancellationStatusHistory,
          {
            stageLabel: t(`cancellationList.stages.${nextStage}`),
            userName: user?.fullName?.trim() || user?.email || '—',
          },
        )
      }

      await updateMatter.mutateAsync({
        title: markName.trim(),
        ...(nextStatus ? { status: nextStatus } : {}),
        attributes: {
          ...attrs,
          applicationNumber: applicationNumber.trim() || undefined,
          applicationDate: applicationDate || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
          grounds: grounds.trim() || undefined,
          againstClasses: againstClasses.trim() || undefined,
          requester: submittedBy.trim() || undefined,
          cancellationStage: nextStage || undefined,
          cancellationStatusHistory,
          prosecution: {
            ...(typeof attrs.prosecution === 'object' && attrs.prosecution
              ? attrs.prosecution
              : {}),
            representatives: representative.trim() || undefined,
          },
        },
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('cancellationView.errors.saveFailed')))
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
          {t('cancellationView.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => void handleSave()}
        >
          {updateMatter.isPending ? t('cancellationView.saving') : t('cancellationView.save')}
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
        {t('cancellationView.edit')}
      </Button>
    )
  ) : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <CancellationStageBadge
            stage={initial.cancellationStage}
            matterStatus={matter.status}
          />
          {editing ? (
            <FieldRow label={t('cancellationView.stage')}>
              <Select
                value={cancellationStage || 'none'}
                onValueChange={(v) =>
                  setCancellationStage(v === 'none' ? '' : (v as CancellationStage))
                }
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder={t('cancellationView.stagePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" label={t('cancellationView.stageNone')}>
                    {t('cancellationView.stageNone')}
                  </SelectItem>
                  {CANCELLATION_STAGES.map((stage) => (
                    <SelectItem
                      key={stage}
                      value={stage}
                      label={trademarkProcedureStageSelectLabel(t, 'cancellationList', stage)}
                    >
                      <span className="flex items-center gap-2">
                        <Badge
                          variant={CANCELLATION_STAGE_BADGE_VARIANT[stage]}
                          className="pointer-events-none normal-case tracking-normal"
                        >
                          {trademarkProcedureStageSelectLabel(t, 'cancellationList', stage)}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          ) : null}
        </div>
        {editControls}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('cancellationView.subjectMark')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldRow label={t('cancellationView.markName')}>
              {fieldsLocked ? (
                <span className="text-sm font-medium">{markName}</span>
              ) : (
                <Input value={markName} onChange={(e) => setMarkName(e.target.value)} />
              )}
            </FieldRow>
            <FieldRow label={t('cancellationView.applicationNumber')}>
              {fieldsLocked ? (
                <span className="text-sm">{applicationNumber || '—'}</span>
              ) : (
                <Input
                  value={applicationNumber}
                  onChange={(e) => setApplicationNumber(e.target.value)}
                />
              )}
            </FieldRow>
            <FieldRow label={t('cancellationView.applicationDate')}>
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
            <FieldRow label={t('cancellationView.registrationNumber')}>
              {fieldsLocked ? (
                <span className="text-sm">{registrationNumber || '—'}</span>
              ) : (
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
              )}
            </FieldRow>
            <FieldRow
              label={t('cancellationView.classes')}
              value={classesLabel}
              valueClassName="text-sm font-medium text-destructive"
            />
            <FieldRow label={t('cancellationView.markType')} value={markTypeLabel} />
            <FieldRow label={t('cancellationView.applicant')} value={applicantLabel} />
            <FieldRow label={t('cancellationView.representative')}>
              {fieldsLocked ? (
                <span className="text-sm">{representative || '—'}</span>
              ) : (
                <Input
                  value={representative}
                  onChange={(e) => setRepresentative(e.target.value)}
                />
              )}
            </FieldRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('cancellationView.cancellationSide')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldRow label={t('cancellationView.againstClasses')}>
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
            <FieldRow label={t('cancellationView.submittedBy')}>
              {fieldsLocked ? (
                <span className="text-sm">{submittedBy || '—'}</span>
              ) : (
                <Input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} />
              )}
            </FieldRow>
            <FieldRow label={t('cancellationView.foundation')}>
              {fieldsLocked ? (
                <span className="text-sm whitespace-pre-wrap">{grounds || '—'}</span>
              ) : (
                <Textarea
                  rows={6}
                  value={grounds}
                  onChange={(e) => setGrounds(e.target.value)}
                />
              )}
            </FieldRow>
          </CardContent>
        </Card>
      </div>

      <CancellationDeadlinesTable deadlines={initial.deadlines} />

      <CancellationStageWorkflowPanel
        matter={matter}
        stage={initial.cancellationStage}
      />

      <CancellationActionBar
        matter={matter}
        stage={initial.cancellationStage}
        statusHistory={initial.statusHistory}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
