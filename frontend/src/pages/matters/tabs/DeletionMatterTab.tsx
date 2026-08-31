import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import {
  DeletionMarkSummary,
  DeletionStageDivider,
} from '@/components/matters/DeletionMarkSummary'
import { DeletionActionBar } from '@/components/matters/DeletionActionBar'
import { DeletionDeadlinesTable } from '@/components/matters/DeletionDeadlinesTable'
import { DeletionStageBadge } from '@/components/matters/DeletionStageBadge'
import { DeletionStageWorkflowPanel } from '@/components/matters/DeletionStageWorkflowPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/AuthProvider'
import { useMatterTabCounts, useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  appendDeletionStatusHistory,
  DELETION_STAGE_BADGE_VARIANT,
  DELETION_STAGES,
  matterStatusForDeletionStage,
  readDeletionFields,
  type DeletionStage,
} from '@/features/matters/deletion-matter'
import { deletionStageConfig } from '@/features/matters/deletion-workflow'
import { trademarkProcedureStageSelectLabel } from '@/features/matters/trademark-procedure-stage-label'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'

type DeletionMatterTabProps = {
  matter: MatterDetail
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[minmax(120px,160px)_1fr] sm:items-start sm:gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

export function DeletionMatterTab({ matter }: DeletionMatterTabProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const { data: tabCounts } = useMatterTabCounts(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initial = readDeletionFields(matter)
  const [markName, setMarkName] = useState(initial.markName)
  const [applicationNumber, setApplicationNumber] = useState(initial.applicationNumber)
  const [applicationDate, setApplicationDate] = useState(initial.applicationDate)
  const [registrationNumber, setRegistrationNumber] = useState(initial.registrationNumber)
  const [representative, setRepresentative] = useState(initial.representative)
  const [againstClasses, setAgainstClasses] = useState(initial.againstClasses)
  const [submittedBy, setSubmittedBy] = useState(initial.submittedBy)
  const [deletionStage, setDeletionStage] = useState<DeletionStage | ''>(
    initial.deletionStage ?? '',
  )

  const stageConfig = deletionStageConfig(initial.deletionStage)
  const showWorkflow = !stageConfig.showArchivedBanner

  const appealDeadlines = useMemo(
    () =>
      initial.deadlines.filter((row) =>
        row.regarding.toLowerCase().includes('appeal'),
      ),
    [initial.deadlines],
  )

  const prepDeadlines = useMemo(
    () =>
      initial.deadlines.filter(
        (row) => !row.regarding.toLowerCase().includes('appeal'),
      ),
    [initial.deadlines],
  )

  const syncFromMatter = () => {
    const next = readDeletionFields(matter)
    setMarkName(next.markName)
    setApplicationNumber(next.applicationNumber)
    setApplicationDate(next.applicationDate)
    setRegistrationNumber(next.registrationNumber)
    setRepresentative(next.representative)
    setAgainstClasses(next.againstClasses)
    setSubmittedBy(next.submittedBy)
    setDeletionStage(next.deletionStage ?? '')
  }

  useEffect(() => {
    syncFromMatter()
    setEditing(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matter.id, matter.updatedAt])

  const handleSave = async () => {
    if (!canUpdate || !editing) return
    setError(null)
    if (!markName.trim()) {
      setError(t('deletionView.errors.markNameRequired'))
      return
    }

    try {
      const nextStage = deletionStage || null
      const previousStage = initial.deletionStage
      const stageChanged = nextStage !== previousStage
      const nextStatus = matterStatusForDeletionStage(nextStage)

      let deletionStatusHistory = initial.statusHistory
      if (stageChanged && nextStage) {
        deletionStatusHistory = appendDeletionStatusHistory(deletionStatusHistory, {
          stageLabel: t(`deletionList.stages.${nextStage}`),
          userName: user?.fullName?.trim() || user?.email || '—',
        })
      }

      await updateMatter.mutateAsync({
        title: markName.trim(),
        ...(nextStatus ? { status: nextStatus } : {}),
        attributes: {
          ...attrs,
          applicationNumber: applicationNumber.trim() || undefined,
          applicationDate: applicationDate || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
          againstClasses: againstClasses.trim() || undefined,
          requester: submittedBy.trim() || undefined,
          deletionStage: nextStage || undefined,
          deletionStatusHistory,
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
      setError(getApiErrorMessage(err, t('deletionView.errors.saveFailed')))
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
          {t('deletionView.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => void handleSave()}
        >
          {updateMatter.isPending ? t('deletionView.saving') : t('deletionView.save')}
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
        {t('deletionView.edit')}
      </Button>
    )
  ) : null

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <DeletionStageBadge stage={initial.deletionStage} matterStatus={matter.status} />
          {editing ? (
            <FieldRow label={t('deletionView.stage')}>
              <Select
                value={deletionStage || 'none'}
                onValueChange={(v) =>
                  setDeletionStage(v === 'none' ? '' : (v as DeletionStage))
                }
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder={t('deletionView.stagePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" label={t('deletionView.stageNone')}>
                    {t('deletionView.stageNone')}
                  </SelectItem>
                  {DELETION_STAGES.map((stage) => (
                    <SelectItem
                      key={stage}
                      value={stage}
                      label={trademarkProcedureStageSelectLabel(t, 'deletionList', stage)}
                    >
                      <Badge
                        variant={DELETION_STAGE_BADGE_VARIANT[stage]}
                        className="pointer-events-none normal-case tracking-normal"
                      >
                        {trademarkProcedureStageSelectLabel(t, 'deletionList', stage)}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          ) : null}
        </div>
        {editControls}
      </div>

      {editing ? (
        <div className="rounded-xl border border-border/80 bg-muted/15 p-4 space-y-3">
          <FieldRow label={t('deletionView.markName')}>
            <Input value={markName} onChange={(e) => setMarkName(e.target.value)} />
          </FieldRow>
          <FieldRow label={t('deletionView.applicationNumber')}>
            <Input value={applicationNumber} onChange={(e) => setApplicationNumber(e.target.value)} />
          </FieldRow>
          <FieldRow label={t('deletionView.applicationDate')}>
            <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} />
          </FieldRow>
          <FieldRow label={t('deletionView.registrationNumber')}>
            <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
          </FieldRow>
          <FieldRow label={t('deletionView.representative')}>
            <Input value={representative} onChange={(e) => setRepresentative(e.target.value)} />
          </FieldRow>
          <FieldRow label={t('deletionView.againstClasses')}>
            <Input value={againstClasses} onChange={(e) => setAgainstClasses(e.target.value)} />
          </FieldRow>
          <FieldRow label={t('deletionView.submittedBy')}>
            <Input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} />
          </FieldRow>
        </div>
      ) : (
        <DeletionMarkSummary matter={matter} />
      )}

      <DeletionStageDivider />

      {stageConfig.showArchivedBanner ? (
        <div className="flex justify-center py-8">
          <span className="inline-block rotate-[-8deg] border-4 border-destructive px-8 py-3 text-2xl font-bold uppercase tracking-widest text-destructive">
            {t('deletionView.archivedStamp')}
          </span>
        </div>
      ) : null}

      {stageConfig.showStoppedBanner ? (
        <div className="px-2 py-8 text-center">
          <p className="text-xl font-bold uppercase tracking-wide">
            {t('deletionView.stopped.title')}
            {initial.stopUntil
              ? ` ${t('deletionView.stopped.until', { date: initial.stopUntil })}`
              : ''}
          </p>
          {initial.stopReason ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t('deletionView.stopped.reason', { reason: initial.stopReason })}
            </p>
          ) : null}
        </div>
      ) : null}

      {initial.deletionStage === 'case' ? (
        <div className="flex justify-center py-4">
          <Button type="button" size="lg" className="bg-emerald-700 hover:bg-emerald-800" disabled>
            {t('deletionView.workflow.caseDraft')}
          </Button>
        </div>
      ) : null}

      {showWorkflow && initial.deletionStage === 'decision' ? (
        <DeletionDeadlinesTable
          deadlines={appealDeadlines}
          title={t('deletionView.deadlines.appealTitle')}
        />
      ) : null}

      {showWorkflow &&
      initial.deletionStage !== 'decision' &&
      initial.deletionStage !== 'case' &&
      prepDeadlines.length > 0 ? (
        <DeletionDeadlinesTable deadlines={prepDeadlines} />
      ) : null}

      {showWorkflow ? (
        <DeletionStageWorkflowPanel
          matter={matter}
          stage={initial.deletionStage}
          appealStatus={initial.appealStatus}
        />
      ) : null}

      <DeletionActionBar
        matter={matter}
        stage={initial.deletionStage}
        statusHistory={initial.statusHistory}
        restoreStage={initial.restoreStage}
        documentCount={tabCounts?.documents ?? 0}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
