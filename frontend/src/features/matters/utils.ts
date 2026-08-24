import i18n from '@/i18n'
import type { MatterType } from './types'

export type AttributeFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'tags'

export type AttributeFieldConfig = {
  key: string
  label: string
  type: AttributeFieldType
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  helpText?: string
}

export function matterTypeLabel(type: MatterType): string {
  return i18n.t(`type.${type}`, { ns: 'matters' })
}

export function matterStatusLabel(
  status: import('./types').MatterStatus,
): string {
  return i18n.t(`status.${status}`, { ns: 'matters' })
}

export function jurisdictionStatusLabel(
  status: import('./types').MatterJurisdictionStatus,
): string {
  return i18n.t(`jurisdictionStatus.${status}`, { ns: 'matters' })
}

export function ipRightStatusLabel(status: import('./types').IpRightStatus): string {
  return i18n.t(`ipRightStatus.${status}`, { ns: 'matters' })
}

export function markTypeLabel(value: string): string {
  return i18n.t(`markType.${value}`, { ns: 'matters', defaultValue: value })
}

/** @deprecated Use matterTypeLabel() for translated labels */
export const MATTER_TYPE_LABELS: Record<MatterType, string> = {
  trademark: 'Trademark',
  patent: 'Patent',
  utility_model: 'Utility model',
  industrial_design: 'Industrial design',
  copyright: 'Copyright',
  geographical_indication: 'Geographical indication',
  border_measures: 'Border measures',
  fto_analysis: 'FTO analysis',
  valuation: 'Valuation',
  dispute_opposition: 'Dispute / opposition',
  cases: 'Cases',
  domain: 'Domains',
  litigation_expert_report: 'Litigation / Court Expert Reports',
  consultation: 'Consultations',
  official_fee_payment: 'Official Fee Payments',
  other: 'Other',
}

export const ALL_MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]

/** @deprecated Use matterStatusLabel() for translated labels */
export const MATTER_STATUS_LABELS: Record<
  import('./types').MatterStatus,
  string
> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  closed: 'Closed',
  abandoned: 'Abandoned',
}

export const MATTER_STATUS_BADGE_VARIANT: Record<
  import('./types').MatterStatus,
  | 'default'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
> = {
  draft: 'secondary',
  active: 'success',
  on_hold: 'warning',
  closed: 'outline',
  abandoned: 'destructive',
}

/** @deprecated Use jurisdictionStatusLabel() for translated labels */
export const JURISDICTION_STATUS_LABELS: Record<
  import('./types').MatterJurisdictionStatus,
  string
> = {
  pending: 'Pending',
  filed: 'Filed',
  approved: 'Approved',
  rejected: 'Rejected',
}

/** @deprecated Use ipRightStatusLabel() for translated labels */
export const IP_RIGHT_STATUS_LABELS: Record<
  import('./types').IpRightStatus,
  string
> = {
  pending: 'Pending filing',
  filed: 'Filed',
  registered: 'Registered',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

const MARK_TYPE_VALUES = [
  'wordmark',
  'figurative',
  'combined',
  'three_dimensional',
  'sound',
  'combination_of_colors',
] as const

type AttributeFieldDef = {
  key: string
  type: AttributeFieldType
  hasPlaceholder?: boolean
  hasHelpText?: boolean
  selectOptions?: readonly string[]
}

const MATTER_ATTRIBUTE_FIELD_DEFS: Record<MatterType, AttributeFieldDef[]> = {
  trademark: [
    { key: 'trademarkProcedure', type: 'text' },
    { key: 'markWords', type: 'text' },
    { key: 'markKind', type: 'text' },
    { key: 'niceClasses', type: 'tags', hasPlaceholder: true },
    { key: 'markType', type: 'select', selectOptions: MARK_TYPE_VALUES },
    { key: 'territory', type: 'text' },
    { key: 'markDescription', type: 'textarea' },
    { key: 'colors', type: 'text' },
  ],
  patent: [
    { key: 'patentProcedure', type: 'text' },
    { key: 'patentName', type: 'text' },
    { key: 'ipcClasses', type: 'tags' },
    { key: 'epApplicationNumber', type: 'text' },
    { key: 'technicalField', type: 'text' },
    { key: 'claimsSummary', type: 'textarea' },
    { key: 'priorityDate', type: 'date' },
    { key: 'pctNumber', type: 'text' },
  ],
  utility_model: [
    { key: 'utilityModelName', type: 'text' },
    { key: 'ipcClasses', type: 'tags' },
    { key: 'claimsCount', type: 'text' },
    { key: 'applicationNumber', type: 'text' },
    { key: 'applicationDate', type: 'date' },
    { key: 'registrationNumber', type: 'text' },
    { key: 'technicalField', type: 'text' },
    { key: 'claimsSummary', type: 'textarea' },
    { key: 'priorityDate', type: 'date' },
  ],
  industrial_design: [
    { key: 'locarnoClass', type: 'text' },
    { key: 'locarnoSubclass', type: 'text' },
    { key: 'productDescription', type: 'textarea' },
    { key: 'designViews', type: 'textarea', hasHelpText: true },
  ],
  copyright: [
    { key: 'workTitle', type: 'text' },
    { key: 'workType', type: 'text' },
    { key: 'creationDate', type: 'date' },
  ],
  geographical_indication: [
    { key: 'giKind', type: 'text' },
    { key: 'giName', type: 'text' },
    { key: 'productName', type: 'text' },
    { key: 'region', type: 'text' },
    { key: 'giTerritory', type: 'text' },
    { key: 'applicationNumber', type: 'text' },
    { key: 'registrationNumber', type: 'text' },
  ],
  border_measures: [
    { key: 'customsOffice', type: 'text' },
    { key: 'infringingGoods', type: 'textarea' },
  ],
  fto_analysis: [
    { key: 'technologyArea', type: 'text' },
    { key: 'scopeSummary', type: 'textarea' },
  ],
  valuation: [
    { key: 'assetDescription', type: 'textarea' },
    { key: 'valuationPurpose', type: 'text' },
  ],
  dispute_opposition: [
    { key: 'opponentName', type: 'text' },
    { key: 'disputeType', type: 'text' },
    { key: 'basisSummary', type: 'textarea' },
  ],
  cases: [
    { key: 'court', type: 'text' },
    { key: 'incomingNumber', type: 'text' },
    { key: 'claimGrounds', type: 'text' },
    { key: 'claimValue', type: 'text' },
    { key: 'expertiseType', type: 'text' },
  ],
  domain: [
    { key: 'domainName', type: 'text', hasPlaceholder: true },
    { key: 'registrar', type: 'text' },
  ],
  litigation_expert_report: [
    { key: 'courtOrAuthority', type: 'text' },
    { key: 'caseReference', type: 'text' },
    { key: 'reportScope', type: 'textarea' },
  ],
  consultation: [
    { key: 'topic', type: 'text' },
    { key: 'scopeSummary', type: 'textarea' },
  ],
  official_fee_payment: [
    { key: 'authority', type: 'text' },
    { key: 'feeReference', type: 'text' },
    { key: 'relatedApplication', type: 'text' },
  ],
  other: [
    { key: 'workSummary', type: 'textarea' },
  ],
}

function translateAttributeField(
  matterType: MatterType,
  def: AttributeFieldDef,
): AttributeFieldConfig {
  const base = `attributes.${matterType}.${def.key}`
  const field: AttributeFieldConfig = {
    key: def.key,
    type: def.type,
    label: i18n.t(`${base}.label`, { ns: 'matters' }),
  }
  if (def.hasPlaceholder) {
    field.placeholder = i18n.t(`${base}.placeholder`, { ns: 'matters' })
  }
  if (def.hasHelpText) {
    field.helpText = i18n.t(`${base}.helpText`, { ns: 'matters' })
  }
  if (def.selectOptions) {
    field.options = def.selectOptions.map((value) => ({
      value,
      label: markTypeLabel(value),
    }))
  }
  return field
}

export function getMatterAttributeFields(matterType: MatterType): AttributeFieldConfig[] {
  return (MATTER_ATTRIBUTE_FIELD_DEFS[matterType] ?? []).map((def) =>
    translateAttributeField(matterType, def),
  )
}

/** @deprecated Use getMatterAttributeFields() at render time (after i18n is ready). */
export const MATTER_ATTRIBUTE_FIELDS: Record<MatterType, AttributeFieldConfig[]> = {
  get trademark() {
    return getMatterAttributeFields('trademark')
  },
  get patent() {
    return getMatterAttributeFields('patent')
  },
  get utility_model() {
    return getMatterAttributeFields('utility_model')
  },
  get industrial_design() {
    return getMatterAttributeFields('industrial_design')
  },
  get copyright() {
    return getMatterAttributeFields('copyright')
  },
  get geographical_indication() {
    return getMatterAttributeFields('geographical_indication')
  },
  get border_measures() {
    return getMatterAttributeFields('border_measures')
  },
  get fto_analysis() {
    return getMatterAttributeFields('fto_analysis')
  },
  get valuation() {
    return getMatterAttributeFields('valuation')
  },
  get dispute_opposition() {
    return getMatterAttributeFields('dispute_opposition')
  },
  get cases() {
    return getMatterAttributeFields('cases')
  },
  get domain() {
    return getMatterAttributeFields('domain')
  },
  get litigation_expert_report() {
    return getMatterAttributeFields('litigation_expert_report')
  },
  get consultation() {
    return getMatterAttributeFields('consultation')
  },
  get official_fee_payment() {
    return getMatterAttributeFields('official_fee_payment')
  },
  get other() {
    return getMatterAttributeFields('other')
  },
}

export function formatJurisdictions(codes: string[]) {
  if (codes.length === 0) return '-'
  return codes.join(', ')
}

export function formatMatterDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function parseTagsInput(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function tagsToInput(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  return ''
}
