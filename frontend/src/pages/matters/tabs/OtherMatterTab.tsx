import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { MatterAttributeFields } from '@/components/matters/MatterAttributeFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clientDisplayName } from '@/features/crm/utils'
import {
  buildOtherMatterTitle,
  formatOtherWorkflowStage,
  otherMatterDetailFieldKeys,
  otherMatterSpineFieldKeys,
} from '@/features/matters/other-matter-fields'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import type { MatterDetail } from '@/features/matters/types'
import {
  getMatterAttributeFields,
  matterTypeLabel,
} from '@/features/matters/utils'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCaseRefDate } from '@/features/matters/case-list-utils'

type OtherMatterTabProps = {
  matter: MatterDetail
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(140px,200px)_1fr] sm:gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

export function OtherMatterTab({ matter }: OtherMatterTabProps) {
  const { t } = useTranslation('matters')
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const matterType = matter.matterType

  const [editing, setEditing] = useState(matter.status === 'draft')
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    matter.attributes?.attributes ?? {},
  )
  const [error, setError] = useState<string | null>(null)

  const spineKeys = otherMatterSpineFieldKeys()
  const detailKeys = otherMatterDetailFieldKeys(matterType)
  const allFields = getMatterAttributeFields(matterType)

  const syncFromMatter = () => {
    setAttributes(matter.attributes?.attributes ?? {})
    setError(null)
  }

  useEffect(() => {
    syncFromMatter()
    setEditing(matter.status === 'draft')
  }, [matter.id, matter.updatedAt, matter.status])

  const handleAttributeChange = (key: string, value: unknown) => {
    setAttributes((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    if (!canUpdate || !editing) return
    setError(null)
    const title = buildOtherMatterTitle(
      matterType,
      attributes,
      matter.title || matterTypeLabel(matterType),
    )
    try {
      await updateMatter.mutateAsync({
        title,
        attributes,
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('otherMatterView.errors.saveFailed')))
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
            setEditing(matter.status === 'draft')
          }}
        >
          {t('otherMatterView.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => void handleSave()}
        >
          {updateMatter.isPending ? t('otherMatterView.saving') : t('otherMatterView.save')}
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
        {t('otherMatterView.edit')}
      </Button>
    )
  ) : null

  const workflowStage =
    typeof attributes.workflowStage === 'string' ? attributes.workflowStage : null

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t('otherMatterView.editHint')}</p>
          {editControls}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('otherMatterView.clientLabel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{clientDisplayName(matter.client)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('otherMatterSpine.sectionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MatterAttributeFields
              matterType={matterType}
              values={attributes}
              onChange={handleAttributeChange}
              excludeKeys={detailKeys}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {t('otherMatterView.detailsTitle', { type: matterTypeLabel(matterType) })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MatterAttributeFields
              matterType={matterType}
              values={attributes}
              onChange={handleAttributeChange}
              excludeKeys={spineKeys}
            />
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    )
  }

  const displayValue = (key: string): string => {
    const value = attributes[key]
    if (value == null || value === '') return '—'
    if (key === 'workflowStage' && typeof value === 'string') {
      return formatOtherWorkflowStage(matterType, value)
    }
    if (key.includes('Date') && typeof value === 'string') {
      return formatCaseRefDate(value) || value
    }
    const field = allFields.find((f) => f.key === key)
    if (field?.type === 'select' && typeof value === 'string') {
      return field.options?.find((o) => o.value === value)?.label ?? value
    }
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">{editControls}</div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{matterTypeLabel(matterType)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <FieldRow
            label={t('otherMatterView.clientLabel')}
            value={clientDisplayName(matter.client)}
          />
          <FieldRow
            label={t('otherMatterSpine.workflowStage.label')}
            value={formatOtherWorkflowStage(matterType, workflowStage)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('otherMatterSpine.sectionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allFields
            .filter((f) => spineKeys.includes(f.key))
            .map((field) => (
              <FieldRow
                key={field.key}
                label={field.label}
                value={displayValue(field.key)}
              />
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {t('otherMatterView.detailsTitle', { type: matterTypeLabel(matterType) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allFields
            .filter((f) => detailKeys.includes(f.key))
            .map((field) => (
              <FieldRow
                key={field.key}
                label={field.label}
                value={displayValue(field.key)}
              />
            ))}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
