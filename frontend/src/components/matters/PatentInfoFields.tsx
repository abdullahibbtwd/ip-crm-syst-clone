import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clientDisplayName } from '@/features/crm/utils'
import { formatRefNumberDate } from '@/features/matters/patent-list-utils'
import type { MatterDetail } from '@/features/matters/types'
import { getCountryLabel } from '@/lib/countries'

type PatentInfoFieldsProps = {
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
  if (Array.isArray(attrs.representativeHoldingGroupIds)) {
    const count = attrs.representativeHoldingGroupIds.length
    if (count > 0) {
      return String(count)
    }
  }
  const prosecution = attrs.prosecution
  if (prosecution && typeof prosecution === 'object' && !Array.isArray(prosecution)) {
    const reps = (prosecution as Record<string, unknown>).representatives
    if (typeof reps === 'string' && reps.trim()) return reps.trim()
  }
  return '—'
}

function readIpc(attrs: Record<string, unknown>): string {
  const ipc = attrs.ipcClasses
  if (Array.isArray(ipc) && ipc.length > 0) {
    return ipc
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter(Boolean)
      .join(' / ')
  }
  const technical = typeof attrs.technicalField === 'string' ? attrs.technicalField.trim() : ''
  return technical || '—'
}

function readClaims(attrs: Record<string, unknown>): string {
  const summary = typeof attrs.claimsSummary === 'string' ? attrs.claimsSummary.trim() : ''
  if (summary) return summary
  const claims = attrs.claims
  if (!Array.isArray(claims)) return '—'
  const parts = claims
    .map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null
      const number = typeof row.number === 'string' ? row.number.trim() : ''
      return number ? `${number},` : null
    })
    .filter((c): c is string => Boolean(c))
  return parts.length > 0 ? parts.join(' ') : '—'
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

export function PatentInfoFields({ matter }: PatentInfoFieldsProps) {
  const { t } = useTranslation('matters')

  if (matter.matterType !== 'patent') return null

  const attrs = matter.attributes?.attributes ?? {}
  if (attrs.spc === true || attrs.patentProcedure === 'spc') return null

  const ipRight = matter.ipRights[0]

  const applicationNumber =
    (typeof attrs.epApplicationNumber === 'string' && attrs.epApplicationNumber.trim()) ||
    (typeof attrs.applicationNumber === 'string' && attrs.applicationNumber.trim()) ||
    ipRight?.applicationNumber ||
    null
  const applicationDate =
    (typeof attrs.epApplicationDate === 'string' && attrs.epApplicationDate) ||
    (typeof attrs.applicationDate === 'string' && attrs.applicationDate) ||
    ipRight?.filingDate?.slice(0, 10) ||
    null

  const registrationNumber =
    (typeof attrs.epRegistrationNumber === 'string' && attrs.epRegistrationNumber.trim()) ||
    (typeof attrs.registrationNumber === 'string' && attrs.registrationNumber.trim()) ||
    ipRight?.registrationNumber ||
    null
  const registrationDate =
    (typeof attrs.epRegistrationDate === 'string' && attrs.epRegistrationDate) ||
    (typeof attrs.registrationDate === 'string' && attrs.registrationDate) ||
    ipRight?.registrationDate?.slice(0, 10) ||
    null

  const bulletinNumber =
    (typeof attrs.epRegistrationBulletin === 'string' && attrs.epRegistrationBulletin.trim()) ||
    (typeof attrs.epBulletinNumber === 'string' && attrs.epBulletinNumber.trim()) ||
    (typeof attrs.applicationPublication === 'string' && attrs.applicationPublication.trim()) ||
    null
  const bulletinDate =
    (typeof attrs.epRegistrationBulletinDate === 'string' && attrs.epRegistrationBulletinDate) ||
    (typeof attrs.applicationPublicationDate === 'string' && attrs.applicationPublicationDate) ||
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
    ? territoryCode === 'EP'
      ? 'EP'
      : (getCountryLabel(territoryCode) ?? territoryCode)
    : '—'

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{t('patentInfo.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('patentInfo.subtitle', {
            territory: territoryLabel,
            name: typeof attrs.patentName === 'string' ? attrs.patentName : matter.title,
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCell
            label={t('patentInfo.fields.application')}
            primary={application.primary}
            secondary={application.secondary}
          />
          <InfoCell
            label={t('patentInfo.fields.registration')}
            primary={registration.primary}
            secondary={registration.secondary}
          />
          <InfoCell
            label={t('patentInfo.fields.bulletin')}
            primary={bulletin.primary}
            secondary={bulletin.secondary}
          />
          <InfoCell label={t('patentInfo.fields.ipc')} primary={readIpc(attrs)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCell label={t('patentInfo.fields.client')} primary={clientName} />
          <InfoCell label={t('patentInfo.fields.owner')} primary={ownerName} />
          <InfoCell label={t('patentInfo.fields.contact')} primary={readContact(attrs)} />
          <InfoCell
            label={t('patentInfo.fields.representatives')}
            primary={readRepresentatives(attrs)}
          />
          <InfoCell label={t('patentInfo.fields.claims')} primary={readClaims(attrs)} />
          <InfoCell label={t('patentInfo.fields.territory')} primary={territoryLabel} />
        </div>
      </CardContent>
    </Card>
  )
}
