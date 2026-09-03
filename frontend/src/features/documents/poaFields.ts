import { getCountryLabel } from '@/lib/countries'
import type { ClientDetail, ClientOffice } from '@/features/crm/types'
import type { MatterDetail, MatterListItem } from '@/features/matters/types'

export const POA_OBJECT_LABELS: Record<string, { bg: string; en: string }> = {
  trademark: { bg: 'Марка', en: 'Trademark' },
  patent: { bg: 'Патент', en: 'Patent' },
  utility_model: { bg: 'Полезен модел', en: 'Utility model' },
  industrial_design: { bg: 'Промишлен дизайн', en: 'Industrial design' },
  geographical_indication: { bg: 'Географско указание', en: 'Geographical indication' },
  copyright: { bg: 'Авторско право', en: 'Copyright' },
  domain: { bg: 'Домейн', en: 'Domain' },
  cases: { bg: 'Дело', en: 'Case' },
}

export function formatPoaObjectLine(
  matterType: string,
  number: string | null | undefined,
  title: string | null | undefined,
): string {
  const labels = POA_OBJECT_LABELS[matterType] ?? { bg: 'Обект', en: 'Object' }
  const num = number?.trim() || '—'
  const name = title?.trim() || '—'
  return `${labels.bg} no. ${num} - ${name} ${labels.en} no. ${num} - ${name}`
}

export function formatPoaAddress(
  parts: Array<string | null | undefined>,
  country?: string | null,
): string {
  const countryLabel =
    country && country !== '-' ? getCountryLabel(country) : undefined
  return [...parts, countryLabel]
    .map((part) => part?.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ')
}

export function formatOfficePoaAddress(office?: ClientOffice | null): string {
  if (!office) return ''
  const cityLine = [office.postalCode, office.city].filter(Boolean).join(' ')
  return formatPoaAddress(
    [office.addressLine1, office.addressLine2, cityLine],
    office.country,
  )
}

export function formatDraftPoaAddress(address: {
  address?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  postalCode?: string | null
  city?: string | null
  country?: string | null
}): string {
  const street = address.addressLine1 ?? address.address
  const cityLine = [address.postalCode, address.city].filter(Boolean).join(' ')
  return formatPoaAddress([street, address.addressLine2, cityLine], address.country)
}

function registeredOffice(client?: ClientDetail | null): ClientOffice | undefined {
  if (!client) return undefined
  return (
    client.offices.find((office) => office.addressType === 'registered_legal') ??
    client.offices.find((office) => office.isPrimary) ??
    client.offices[0]
  )
}

export function legalEntityNameFromClient(client?: {
  type: string
  companyName?: string | null
  legalForm?: string | null
  firstName?: string | null
  lastName?: string | null
} | null): string {
  if (!client) return ''
  if (client.type === 'company') {
    return [client.companyName, client.legalForm].filter(Boolean).join(', ')
  }
  return [client.firstName, client.lastName].filter(Boolean).join(' ')
}

function readAttrString(attrs: Record<string, unknown> | null | undefined, key: string): string {
  const value = attrs?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function readAttrAddress(attrs: Record<string, unknown> | null | undefined): string {
  const value = attrs?.registeredAddress
  if (!value || typeof value !== 'object') return ''
  return formatDraftPoaAddress(value as { address?: string; city?: string; postalCode?: string; country?: string })
}

export function matterObjectNumber(matter: MatterListItem | MatterDetail): string {
  return (
    matter.trademarkSummary?.registrationNumber ||
    matter.trademarkSummary?.incomingNumber ||
    matter.patentSummary?.registrationNumber ||
    matter.patentSummary?.incomingNumber ||
    matter.designSummary?.registrationNumber ||
    matter.designSummary?.incomingNumber ||
    matter.utilityModelSummary?.registrationNumber ||
    matter.utilityModelSummary?.incomingNumber ||
    matter.spcSummary?.registrationNumber ||
    matter.spcSummary?.incomingNumber ||
    matter.giSummary?.registrationNumber ||
    matter.giSummary?.incomingNumber ||
    matter.jurisdictions[0]?.localRefNumber ||
    ''
  )
}

export function poaDefaultsFromClient(client?: ClientDetail | null): {
  legalEntityName: string
  address: string
  representativeName: string
} {
  return {
    legalEntityName: legalEntityNameFromClient(client),
    address: formatOfficePoaAddress(registeredOffice(client)),
    representativeName: client?.holdingGroup?.name ?? '',
  }
}

export function poaDefaultsFromMatter(
  matter?: MatterDetail | null,
  listItem?: MatterListItem | null,
): {
  mol: string
  legalEntityName: string
  address: string
  poaObject: string
} {
  const attrs = matter?.attributes?.attributes ?? null
  const ip = matter?.ipRights[0]
  const number =
    ip?.registrationNumber ||
    ip?.applicationNumber ||
    (listItem ? matterObjectNumber(listItem) : '') ||
    matter?.jurisdictions[0]?.localRefNumber ||
    ''
  const title = ip?.title || matter?.title || listItem?.title || ''
  const matterType = matter?.matterType || listItem?.matterType || ''

  return {
    mol: readAttrString(attrs, 'mol'),
    legalEntityName: readAttrString(attrs, 'clientLegalName'),
    address: readAttrAddress(attrs),
    poaObject: formatPoaObjectLine(matterType, number, title),
  }
}

export function compactPoaFields(fields: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value.trim()),
  )
}
