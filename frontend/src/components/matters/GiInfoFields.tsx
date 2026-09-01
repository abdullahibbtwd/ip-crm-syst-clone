import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clientDisplayName } from '@/features/crm/utils'
import {
  formatRefNumberDate,
  readGiGoodsClassification,
} from '@/features/matters/gi-list-utils'
import { readProsecution } from '@/features/matters/prosecution-stages'
import type { MatterDetail } from '@/features/matters/types'
import { getCountryLabel } from '@/lib/countries'

type GiInfoFieldsProps = {
  matter: MatterDetail
}

function readContact(attrs: Record<string, unknown>): string {
  const contact = attrs.contactPerson
  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) return '—'
  const row = contact as Record<string, unknown>
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  return name || '—'
}

function readRepresentatives(attrs: Record<string, unknown>): string {
  const prosecution = readProsecution(attrs)
  if (prosecution?.representatives?.trim()) return prosecution.representatives.trim()
  if (Array.isArray(attrs.representativeHoldingGroupIds)) {
    const count = attrs.representativeHoldingGroupIds.length
    if (count > 0) return String(count)
  }
  return '—'
}

function InfoCell({
  label,
  primary,
  secondary,
}: {
  label: string
  primary: string
  secondary?: string | null
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-sm font-semibold">{primary}</p>
      {secondary ? <p className="text-xs text-muted-foreground">{secondary}</p> : null}
    </div>
  )
}

export function GiInfoFields({ matter }: GiInfoFieldsProps) {
  const { t } = useTranslation('matters')

  if (matter.matterType !== 'geographical_indication') return null

  const attrs = matter.attributes?.attributes ?? {}
  const prosecution = readProsecution(attrs)
  const ipRight = matter.ipRights[0]

  const applicationNumber =
    prosecution?.applicationNumber?.trim() ||
    (typeof attrs.applicationNumber === 'string' && attrs.applicationNumber.trim()) ||
    ipRight?.applicationNumber ||
    null
  const applicationDate =
    prosecution?.applicationDate ||
    (typeof attrs.applicationDate === 'string' && attrs.applicationDate) ||
    ipRight?.filingDate?.slice(0, 10) ||
    null

  const registrationNumber =
    (typeof attrs.registrationNumber === 'string' && attrs.registrationNumber.trim()) ||
    ipRight?.registrationNumber ||
    null
  const registrationDate =
    (typeof attrs.registrationDate === 'string' && attrs.registrationDate) ||
    ipRight?.registrationDate?.slice(0, 10) ||
    null

  const bulletinNumber =
    prosecution?.bulletinNumber?.trim() ||
    (typeof attrs.registrationBulletin === 'string' && attrs.registrationBulletin.trim()) ||
    null
  const bulletinDate =
    prosecution?.bulletinDate ||
    (typeof attrs.registrationBulletinDate === 'string' && attrs.registrationBulletinDate) ||
    null

  const application = formatRefNumberDate(applicationNumber, applicationDate)
  const registration = formatRefNumberDate(registrationNumber, registrationDate)
  const bulletin = formatRefNumberDate(bulletinNumber, bulletinDate)

  const clientName =
    (typeof attrs.clientLegalName === 'string' && attrs.clientLegalName.trim()) ||
    clientDisplayName(matter.client)

  const ownerName =
    attrs.ownerSameAsClient === true
      ? clientName
      : (typeof attrs.ownerLegalName === 'string' && attrs.ownerLegalName.trim()) || '—'

  const territoryCode = matter.jurisdictions[0]?.countryCode
  const territoryLabel = territoryCode
    ? territoryCode === 'EU'
      ? 'EU'
      : territoryCode === 'WO'
        ? 'WIPO'
        : (getCountryLabel(territoryCode) ?? territoryCode)
    : '—'

  const giName =
    (typeof attrs.giName === 'string' && attrs.giName.trim()) ||
    (typeof attrs.productName === 'string' && attrs.productName.trim()) ||
    matter.title

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{t('giInfo.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('giInfo.subtitle', {
            territory: territoryLabel,
            name: giName,
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCell
            label={t('giInfo.fields.application')}
            primary={application.primary}
            secondary={application.secondary}
          />
          <InfoCell
            label={t('giInfo.fields.registration')}
            primary={registration.primary}
            secondary={registration.secondary}
          />
          <InfoCell
            label={t('giInfo.fields.bulletin')}
            primary={bulletin.primary}
            secondary={bulletin.secondary}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCell label={t('giInfo.fields.client')} primary={clientName} />
          <InfoCell label={t('giInfo.fields.owner')} primary={ownerName} />
          <InfoCell label={t('giInfo.fields.contact')} primary={readContact(attrs)} />
          <InfoCell
            label={t('giInfo.fields.representatives')}
            primary={readRepresentatives(attrs)}
          />
          <InfoCell
            label={t('giInfo.fields.classes')}
            primary={readGiGoodsClassification(attrs)}
          />
          <InfoCell label={t('giInfo.fields.territory')} primary={territoryLabel} />
        </div>
      </CardContent>
    </Card>
  )
}
