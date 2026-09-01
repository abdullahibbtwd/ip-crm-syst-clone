import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clientDisplayName } from '@/features/crm/utils'
import { readProsecution } from '@/features/matters/prosecution-stages'
import { formatRefNumberDate, isSpcMatter } from '@/features/matters/spc-list-utils'
import type { MatterDetail } from '@/features/matters/types'
import { getCountryLabel } from '@/lib/countries'

type SpcInfoFieldsProps = {
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

export function SpcInfoFields({ matter }: SpcInfoFieldsProps) {
  const { t } = useTranslation('matters')

  if (matter.matterType !== 'patent') return null

  const attrs = matter.attributes?.attributes ?? {}
  if (!isSpcMatter(attrs)) return null

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

  const inventorName =
    attrs.inventorSameAsClient === true
      ? clientName
      : (typeof attrs.inventorName === 'string' && attrs.inventorName.trim()) || '—'

  const territoryCode = matter.jurisdictions[0]?.countryCode
  const territoryLabel = territoryCode
    ? territoryCode === 'WO'
      ? 'WIPO'
      : (getCountryLabel(territoryCode) ?? territoryCode)
    : '—'

  const spcName =
    (typeof attrs.spcName === 'string' && attrs.spcName.trim()) ||
    (typeof attrs.patentName === 'string' && attrs.patentName.trim()) ||
    matter.title

  const medicinalProduct =
    (typeof attrs.medicinalProduct === 'string' && attrs.medicinalProduct.trim()) || null

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{t('spcInfo.title')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('spcInfo.subtitle', {
            territory: territoryLabel,
            name: spcName,
          })}
        </p>
        {medicinalProduct ? (
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-foreground">
            {medicinalProduct}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCell
            label={t('spcInfo.fields.application')}
            primary={application.primary}
            secondary={application.secondary}
          />
          <InfoCell
            label={t('spcInfo.fields.registration')}
            primary={registration.primary}
            secondary={registration.secondary}
          />
          <InfoCell
            label={t('spcInfo.fields.bulletin')}
            primary={bulletin.primary}
            secondary={bulletin.secondary}
          />
          <InfoCell label={t('spcInfo.fields.ipc')} primary={readIpc(attrs)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCell label={t('spcInfo.fields.applicant')} primary={clientName} />
          <InfoCell label={t('spcInfo.fields.inventor')} primary={inventorName} />
          <InfoCell label={t('spcInfo.fields.contact')} primary={readContact(attrs)} />
          <InfoCell
            label={t('spcInfo.fields.representatives')}
            primary={readRepresentatives(attrs)}
          />
          <InfoCell label={t('spcInfo.fields.claims')} primary={readClaims(attrs)} />
          <InfoCell
            label={t('spcInfo.fields.medicinalProduct')}
            primary={medicinalProduct ?? '—'}
          />
        </div>
      </CardContent>
    </Card>
  )
}
