import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MARK_KINDS,
  MARK_TYPES,
  TERRITORIES,
  type CreateFileMarkType,
  type MarkKind,
  type TrademarkTerritory,
} from '@/features/create-file/trademark-subtypes'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import { territoryFromAttrs } from '@/features/matters/prosecution-stages'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryLabel } from '@/lib/countries'

type TrademarkInfoFieldsProps = {
  matter: MatterDetail
}

function jurisdictionsForTerritory(
  territory: TrademarkTerritory,
  nationalCountry: string,
  internationalCountries: string[],
): { countryCode: string }[] {
  if (territory === 'national') {
    return nationalCountry ? [{ countryCode: nationalCountry }] : []
  }
  if (territory === 'eu') return [{ countryCode: 'EU' }]
  if (internationalCountries.length > 0) {
    return internationalCountries.map((countryCode) => ({ countryCode }))
  }
  return [{ countryCode: 'WO' }]
}

function readNationalCountry(
  attrs: Record<string, unknown>,
  matter: MatterDetail,
): string {
  if (typeof attrs.nationalCountry === 'string' && attrs.nationalCountry) {
    return attrs.nationalCountry
  }
  const first = matter.jurisdictions[0]?.countryCode
  if (first && first !== 'EU' && first !== 'WO') return first
  return 'BG'
}

function readInternationalCountries(
  attrs: Record<string, unknown>,
  matter: MatterDetail,
): string[] {
  if (Array.isArray(attrs.internationalCountries)) {
    return attrs.internationalCountries.filter(
      (c): c is string => typeof c === 'string',
    )
  }
  if (territoryFromAttrs(attrs) === 'international') {
    return matter.jurisdictions
      .map((j) => j.countryCode)
      .filter((c) => c !== 'WO')
  }
  return []
}

export function TrademarkInfoFields({ matter }: TrademarkInfoFieldsProps) {
  const { t } = useTranslation('matters')
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attrs = matter.attributes?.attributes ?? {}

  const [markKind, setMarkKind] = useState<MarkKind>(
    (attrs.markKind as MarkKind) || 'individual',
  )
  const [markType, setMarkType] = useState<CreateFileMarkType>(
    (attrs.markType as CreateFileMarkType) || 'wordmark',
  )
  const [territory, setTerritory] = useState<TrademarkTerritory>(
    territoryFromAttrs(attrs),
  )
  const [nationalCountry, setNationalCountry] = useState(() =>
    readNationalCountry(attrs, matter),
  )
  const [internationalCountries, setInternationalCountries] = useState(() =>
    readInternationalCountries(attrs, matter),
  )

  const syncFromMatter = () => {
    const nextAttrs = matter.attributes?.attributes ?? {}
    setMarkKind((nextAttrs.markKind as MarkKind) || 'individual')
    setMarkType((nextAttrs.markType as CreateFileMarkType) || 'wordmark')
    setTerritory(territoryFromAttrs(nextAttrs))
    setNationalCountry(readNationalCountry(nextAttrs, matter))
    setInternationalCountries(readInternationalCountries(nextAttrs, matter))
  }

  useEffect(() => {
    syncFromMatter()
    setError(null)
    setEditing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matter.id, matter.updatedAt])

  if (matter.matterType !== 'trademark') return null

  const fieldsLocked = !canUpdate || !editing

  const handleCancel = () => {
    syncFromMatter()
    setError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    if (!canUpdate || !editing) return
    setError(null)

    const jurisdictions = jurisdictionsForTerritory(
      territory,
      nationalCountry,
      internationalCountries,
    )
    if (jurisdictions.length === 0) {
      setError(t('trademarkInfo.errors.country'))
      return
    }

    try {
      await updateMatter.mutateAsync({
        jurisdictions,
        attributes: {
          ...attrs,
          markKind,
          markType,
          territory,
          nationalCountry:
            territory === 'national' ? nationalCountry : undefined,
          internationalCountries:
            territory === 'international' ? internationalCountries : undefined,
        },
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('trademarkInfo.errors.saveFailed')))
    }
  }

  const toggleInternational = (code: string) => {
    if (fieldsLocked) return
    setInternationalCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{t('trademarkInfo.title')}</CardTitle>
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
                {t('trademarkInfo.cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={updateMatter.isPending}
                onClick={() => void handleSave()}
              >
                {updateMatter.isPending
                  ? t('trademarkInfo.saving')
                  : t('trademarkInfo.save')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setError(null)
                setEditing(true)
              }}
            >
              <Pencil className="size-3.5" />
              {t('trademarkInfo.edit')}
            </Button>
          )
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm">
            <span className="text-xs text-muted-foreground">
              {t('trademarkInfo.markKind')}
            </span>
            <Select
              value={markKind}
              onValueChange={(v) => setMarkKind(v as MarkKind)}
              disabled={fieldsLocked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARK_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`createFile.markKinds.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-xs text-muted-foreground">
              {t('trademarkInfo.markType')}
            </span>
            <Select
              value={markType}
              onValueChange={(v) => setMarkType(v as CreateFileMarkType)}
              disabled={fieldsLocked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARK_TYPES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`createFile.markTypes.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-xs text-muted-foreground">
              {t('trademarkInfo.territory')}
            </span>
            <Select
              value={territory}
              onValueChange={(v) => setTerritory(v as TrademarkTerritory)}
              disabled={fieldsLocked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERRITORIES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`createFile.territories.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          {territory === 'national' ? (
            <label className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('trademarkInfo.country')}
              </span>
              <CountrySelect
                value={nationalCountry}
                onValueChange={setNationalCountry}
                disabled={fieldsLocked}
                allowEmpty={false}
              />
            </label>
          ) : null}

          {territory === 'eu' ? (
            <div className="space-y-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {t('trademarkInfo.country')}
              </span>
              <p className="rounded-lg border bg-muted/40 px-3 py-2">
                {t('trademarkInfo.euFixed')}
              </p>
            </div>
          ) : null}
        </div>

        {territory === 'international' ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t('trademarkInfo.selectCountries')}
            </p>
            <div className="flex flex-wrap gap-2">
              {internationalCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('trademarkInfo.noCountries')}
                </p>
              ) : (
                internationalCountries.map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={fieldsLocked}
                    onClick={() => toggleInternational(code)}
                    className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs disabled:opacity-70"
                  >
                    {getCountryLabel(code)} ({code})
                    {!fieldsLocked ? ' ×' : ''}
                  </button>
                ))
              )}
            </div>
            {!fieldsLocked ? (
              <div className="max-w-xs">
                <CountrySelect
                  value=""
                  onValueChange={(code) => {
                    if (!code) return
                    if (!internationalCountries.includes(code)) {
                      setInternationalCountries((prev) => [...prev, code])
                    }
                  }}
                  placeholder={t('trademarkInfo.addCountry')}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
