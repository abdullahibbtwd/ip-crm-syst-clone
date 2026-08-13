import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { MatterAttributeFields } from '@/components/matters/MatterAttributeFields'
import { MatterFileApprovalPanel } from '@/components/matters/MatterFileApprovalPanel'
import { MatterProsecutionPanel } from '@/components/matters/MatterProsecutionPanel'
import { TrademarkInfoFields } from '@/components/matters/TrademarkInfoFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import {
  jurisdictionStatusLabel,
  matterTypeLabel,
} from '@/features/matters/utils'
import { clientDisplayName } from '@/features/crm/utils'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryLabel } from '@/lib/countries'
import type { MatterTabContext } from '../MatterLayout'

export function MatterOverviewTab() {
  const { t } = useTranslation('matters')
  const { matter } = useOutletContext<MatterTabContext>()
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(matter.title)
  const [description, setDescription] = useState(matter.description ?? '')
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    matter.attributes?.attributes ?? {},
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle(matter.title)
    setDescription(matter.description ?? '')
    setAttributes(matter.attributes?.attributes ?? {})
    setError(null)
    setEditing(false)
  }, [matter.id, matter.updatedAt])

  const handleAttributeChange = (key: string, value: unknown) => {
    setAttributes((prev) => ({ ...prev, [key]: value }))
  }

  const handleCancel = () => {
    setTitle(matter.title)
    setDescription(matter.description ?? '')
    setAttributes(matter.attributes?.attributes ?? {})
    setError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    if (!canUpdate || !editing) return
    setError(null)
    if (!title.trim()) {
      setError(t('overview.edit.errors.title'))
      return
    }
    try {
      await updateMatter.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        attributes,
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('overview.edit.errors.saveFailed')))
    }
  }

  const fieldsLocked = !canUpdate || !editing

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MatterFileApprovalPanel matter={matter} />
      <MatterProsecutionPanel matter={matter} />
      <TrademarkInfoFields matter={matter} />

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{t('overview.edit.title')}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('overview.edit.hint')}
            </p>
          </div>
          {canUpdate ? (
            editing ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={updateMatter.isPending}
                  onClick={handleCancel}
                >
                  {t('overview.edit.cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={updateMatter.isPending}
                  onClick={() => void handleSave()}
                >
                  {updateMatter.isPending
                    ? t('overview.edit.saving')
                    : t('overview.edit.save')}
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
                {t('overview.edit.edit')}
              </Button>
            )
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                {t('overview.edit.fields.title')}
              </span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t('overview.type')}</span>
              <span>{matterTypeLabel(matter.matterType)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t('overview.status')}</span>
              <span className="capitalize">{matter.status.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t('overview.assignedTo')}</span>
              <span>{matter.assignedTo?.fullName ?? '-'}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t('overview.client')}</span>
              <span className="text-right">{clientDisplayName(matter.client)}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t('overview.applicant')}</span>
              <span className="text-right">
                {matter.applicantClient
                  ? clientDisplayName(matter.applicantClient)
                  : clientDisplayName(matter.client)}
              </span>
            </div>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                {t('overview.description')}
              </span>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={fieldsLocked}
              />
            </label>
          </div>

          <MatterAttributeFields
            matterType={matter.matterType}
            values={attributes}
            onChange={handleAttributeChange}
            disabled={fieldsLocked}
            excludeKeys={['markKind', 'markType', 'territory']}
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t('overview.jurisdictions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {matter.jurisdictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('overview.jurisdictionsEmpty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('overview.table.country')}</TableHead>
                  <TableHead>{t('overview.table.localRef')}</TableHead>
                  <TableHead>{t('overview.table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matter.jurisdictions.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>
                      {j.countryCode} - {getCountryLabel(j.countryCode)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.localRefNumber ?? '-'}
                    </TableCell>
                    <TableCell>{jurisdictionStatusLabel(j.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
