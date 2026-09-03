import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { MarkImageUploadField } from '@/components/matters/MarkImageUploadField'
import { MarkImageThumb } from '@/components/matters/MarkImageThumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { clientDisplayName } from '@/features/crm/utils'
import { useDocumentImageSrc } from '@/features/documents/hooks/useDocumentImageSrc'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  markImageAttributePatch,
  readMarkImageRefs,
  uploadMarkImage,
} from '@/features/matters/mark-image'
import {
  buildObjectionFilingPatch,
  objectionMarkTypeLabel,
  readObjectionFields,
} from '@/features/matters/objection-matter'
import { formatNiceClasses } from '@/features/matters/trademark-list-utils'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'

type ObjectionMatterTabProps = {
  matter: MatterDetail
}

function FieldRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[minmax(140px,200px)_1fr] sm:items-start sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children ?? <span className="text-sm text-foreground">{value || '—'}</span>}
    </div>
  )
}

export function ObjectionMatterTab({ matter }: ObjectionMatterTabProps) {
  const { t } = useTranslation('matters')
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markImageFile, setMarkImageFile] = useState<File | null>(null)
  const [clearMarkImage, setClearMarkImage] = useState(false)

  const initial = readObjectionFields(matter)
  const [markName, setMarkName] = useState(initial.markName)
  const [applicationNumber, setApplicationNumber] = useState(initial.applicationNumber)
  const [applicationDate, setApplicationDate] = useState(initial.applicationDate)
  const [grounds, setGrounds] = useState(initial.grounds)
  const [submissionDate, setSubmissionDate] = useState(initial.submissionDate)
  const [incomingNumber, setIncomingNumber] = useState(initial.incomingNumber)
  const [poaIncomingNumber, setPoaIncomingNumber] = useState(initial.poaIncomingNumber)
  const [poaDate, setPoaDate] = useState(initial.poaDate)

  const storedMarkImage = readMarkImageRefs(attrs)
  const { src: markImagePreviewUrl } = useDocumentImageSrc(
    storedMarkImage.documentId,
    storedMarkImage.versionId,
    !markImageFile && !clearMarkImage,
  )

  const applicantLabel = matter.applicantClient
    ? clientDisplayName(matter.applicantClient)
    : initial.applicantLegalName || clientDisplayName(matter.client)

  const markTypeLabel = objectionMarkTypeLabel(initial.markType, initial.territory)
  const classesLabel = formatNiceClasses(initial.niceClasses)

  const syncFromMatter = () => {
    const next = readObjectionFields(matter)
    setMarkName(next.markName)
    setApplicationNumber(next.applicationNumber)
    setApplicationDate(next.applicationDate)
    setGrounds(next.grounds)
    setSubmissionDate(next.submissionDate)
    setIncomingNumber(next.incomingNumber)
    setPoaIncomingNumber(next.poaIncomingNumber)
    setPoaDate(next.poaDate)
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

  const handleCancel = () => {
    syncFromMatter()
    setError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    if (!canUpdate || !editing) return
    setError(null)
    if (!markName.trim()) {
      setError(t('objectionView.errors.markNameRequired'))
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

      await updateMatter.mutateAsync({
        title: markName.trim(),
        attributes: {
          ...attrs,
          applicationNumber: applicationNumber.trim() || undefined,
          applicationDate: applicationDate || undefined,
          grounds: grounds.trim() || undefined,
          ...buildObjectionFilingPatch({
            submissionDate,
            incomingNumber,
            poaIncomingNumber,
            poaDate,
          }),
          ...markImagePatch,
        },
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('objectionView.errors.saveFailed')))
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
          onClick={handleCancel}
        >
          {t('objectionView.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => void handleSave()}
        >
          {updateMatter.isPending ? t('objectionView.saving') : t('objectionView.save')}
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
        {t('objectionView.edit')}
      </Button>
    )
  ) : null

  const previewUrl =
    clearMarkImage || markImageFile
      ? null
      : markImagePreviewUrl ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t('objectionView.basicInfo')}</CardTitle>
          {editControls}
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label={t('objectionView.markName')}>
            {fieldsLocked ? (
              <span className="text-sm font-medium">{markName}</span>
            ) : (
              <Input value={markName} onChange={(e) => setMarkName(e.target.value)} />
            )}
          </FieldRow>
          <FieldRow label={t('objectionView.applicationNumber')}>
            {fieldsLocked ? (
              <span className="text-sm">{applicationNumber || '—'}</span>
            ) : (
              <Input
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
              />
            )}
          </FieldRow>
          <FieldRow label={t('objectionView.applicationDate')}>
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
          <FieldRow label={t('objectionView.classes')} value={classesLabel} />
          <FieldRow label={t('objectionView.markType')} value={markTypeLabel} />
          <FieldRow label={t('objectionView.applicant')} value={applicantLabel} />

          <div className="border-t border-border/60 pt-4">
            {fieldsLocked ? (
              <div className="flex items-start gap-3">
                <MarkImageThumb
                  documentId={storedMarkImage.documentId}
                  versionId={storedMarkImage.versionId}
                  size="md"
                />
                {!storedMarkImage.documentId ? (
                  <p className="text-sm text-muted-foreground">
                    {t('objectionView.noMarkImage')}
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('objectionView.foundation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label={t('objectionView.grounds')}>
            {fieldsLocked ? (
              <p className="whitespace-pre-wrap text-sm">{grounds || '—'}</p>
            ) : (
              <Textarea rows={5} value={grounds} onChange={(e) => setGrounds(e.target.value)} />
            )}
          </FieldRow>
          <FieldRow label={t('objectionView.submissionDate')}>
            {fieldsLocked ? (
              <span className="text-sm">{submissionDate || '—'}</span>
            ) : (
              <Input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
              />
            )}
          </FieldRow>
          <FieldRow label={t('objectionView.incomingNumber')}>
            {fieldsLocked ? (
              <span className="text-sm">{incomingNumber || '—'}</span>
            ) : (
              <Input
                value={incomingNumber}
                onChange={(e) => setIncomingNumber(e.target.value)}
              />
            )}
          </FieldRow>
          <FieldRow label={t('objectionView.poaIncomingNumber')}>
            {fieldsLocked ? (
              <span className="text-sm">{poaIncomingNumber || '—'}</span>
            ) : (
              <Input
                value={poaIncomingNumber}
                onChange={(e) => setPoaIncomingNumber(e.target.value)}
              />
            )}
          </FieldRow>
          <FieldRow label={t('objectionView.poaDate')}>
            {fieldsLocked ? (
              <span className="text-sm">{poaDate || '—'}</span>
            ) : (
              <Input type="date" value={poaDate} onChange={(e) => setPoaDate(e.target.value)} />
            )}
          </FieldRow>
        </CardContent>
      </Card>
    </div>
  )
}
