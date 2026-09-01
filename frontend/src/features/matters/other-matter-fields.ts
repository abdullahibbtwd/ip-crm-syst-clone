import i18n from '@/i18n'
import type { MatterType } from './types'
import { isOtherMatterType } from './work-file-groups'

type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'tags'

export type OtherMatterAttributeField = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  helpText?: string
}

export type OtherMatterFieldDef = {
  key: string
  type: FieldType
  hasPlaceholder?: boolean
  hasHelpText?: boolean
  selectOptions?: readonly string[]
  spine?: boolean
}

export const OTHER_MATTER_SPINE_FIELD_DEFS: OtherMatterFieldDef[] = [
  { key: 'incomingNumber', type: 'text', spine: true },
  { key: 'incomingDate', type: 'date', spine: true },
  {
    key: 'territoryRoute',
    type: 'select',
    spine: true,
    selectOptions: ['national_bg', 'eu', 'wipo', 'international'],
  },
  { key: 'authorityOffice', type: 'text', spine: true },
  { key: 'relatedApplicationNumber', type: 'text', spine: true },
  { key: 'workflowStage', type: 'select', spine: true },
]

export const OTHER_MATTER_WORKFLOW_STAGES: Partial<Record<MatterType, readonly string[]>> = {
  copyright: ['intake', 'analysis', 'contract_draft', 'filed', 'closed'],
  border_measures: ['registration', 'active', 'seizure_pending', 'closed'],
  fto_analysis: ['scoping', 'search', 'draft_report', 'delivered', 'archived'],
  valuation: ['scoping', 'analysis', 'draft_report', 'delivered', 'archived'],
  dispute_opposition: ['pre_dispute', 'filed', 'hearing', 'decision', 'appeal', 'closed'],
  domain: ['monitoring', 'dispute', 'udrp', 'resolved', 'closed'],
  litigation_expert_report: ['engaged', 'analysis', 'draft', 'submitted', 'closed'],
  consultation: ['requested', 'in_progress', 'delivered', 'invoiced', 'closed'],
  official_fee_payment: ['pending', 'paid', 'reimbursed', 'closed'],
  other: ['open', 'in_progress', 'delivered', 'closed'],
}

const OTHER_TYPE_FIELD_DEFS: Partial<Record<MatterType, OtherMatterFieldDef[]>> = {
  copyright: [
    { key: 'workTitle', type: 'text' },
    {
      key: 'workType',
      type: 'select',
      selectOptions: ['literary', 'musical', 'software', 'audiovisual', 'graphic', 'other'],
    },
    { key: 'creationDate', type: 'date' },
    { key: 'firstPublicationDate', type: 'date' },
    { key: 'authorName', type: 'text' },
    {
      key: 'rightsBasis',
      type: 'select',
      selectOptions: ['author', 'employer', 'assignment', 'license'],
    },
    { key: 'rightsHolder', type: 'text' },
    { key: 'infringementContext', type: 'textarea' },
  ],
  border_measures: [
    {
      key: 'measureRoute',
      type: 'select',
      selectOptions: ['national_bg', 'eu_regulation'],
    },
    {
      key: 'protectedRightType',
      type: 'select',
      selectOptions: ['trademark', 'patent', 'design', 'copyright', 'gi'],
    },
    { key: 'protectedRightRef', type: 'text' },
    { key: 'customsOffice', type: 'text' },
    { key: 'validFrom', type: 'date' },
    { key: 'validUntil', type: 'date' },
    { key: 'infringingGoods', type: 'textarea' },
  ],
  fto_analysis: [
    { key: 'projectName', type: 'text' },
    { key: 'productName', type: 'text' },
    { key: 'technologyArea', type: 'text' },
    { key: 'analysisScope', type: 'textarea' },
    {
      key: 'deliverableType',
      type: 'select',
      selectOptions: ['written_report', 'memo', 'oral_briefing'],
    },
    { key: 'targetCompletionDate', type: 'date' },
    { key: 'scopeSummary', type: 'textarea' },
    {
      key: 'riskLevel',
      type: 'select',
      selectOptions: ['low', 'medium', 'high', 'pending'],
    },
  ],
  valuation: [
    {
      key: 'assetType',
      type: 'select',
      selectOptions: ['trademark', 'patent', 'design', 'gi', 'mixed', 'company_ip'],
    },
    {
      key: 'valuationPurpose',
      type: 'select',
      selectOptions: ['licensing', 'm_and_a', 'litigation', 'tax', 'internal'],
    },
    {
      key: 'valuationMethod',
      type: 'select',
      selectOptions: ['market', 'income', 'cost'],
    },
    { key: 'valuationDate', type: 'date' },
    { key: 'assetDescription', type: 'textarea' },
    { key: 'conclusionValue', type: 'text' },
    { key: 'currency', type: 'select', selectOptions: ['BGN', 'EUR', 'USD'] },
  ],
  dispute_opposition: [
    {
      key: 'disputeKind',
      type: 'select',
      selectOptions: ['civil', 'administrative', 'arbitration', 'mediation', 'other'],
    },
    {
      key: 'disputeSubject',
      type: 'select',
      selectOptions: [
        'invalidity',
        'infringement',
        'ownership',
        'contract',
        'unfair_competition',
        'other',
      ],
    },
    { key: 'opponentName', type: 'text' },
    { key: 'disputeType', type: 'text' },
    { key: 'filingReference', type: 'text' },
    { key: 'filingDate', type: 'date' },
    { key: 'basisSummary', type: 'textarea' },
  ],
  domain: [
    { key: 'domainName', type: 'text', hasPlaceholder: true },
    {
      key: 'tldType',
      type: 'select',
      selectOptions: ['bg', 'eu', 'com', 'other'],
    },
    { key: 'registrar', type: 'text' },
    { key: 'registrant', type: 'text' },
    { key: 'registrationDate', type: 'date' },
    { key: 'expiryDate', type: 'date' },
    {
      key: 'disputeRoute',
      type: 'select',
      selectOptions: ['none', 'udrp', 'court', 'negotiation'],
    },
    { key: 'relatedTrademark', type: 'text' },
  ],
  litigation_expert_report: [
    {
      key: 'engagementType',
      type: 'select',
      selectOptions: ['patent', 'trademark', 'copyright', 'damages', 'other'],
    },
    { key: 'courtOrAuthority', type: 'text' },
    { key: 'caseReference', type: 'text' },
    { key: 'appointingParty', type: 'text' },
    { key: 'reportDueDate', type: 'date' },
    { key: 'hearingDate', type: 'date' },
    { key: 'reportScope', type: 'textarea' },
  ],
  consultation: [
    {
      key: 'consultationType',
      type: 'select',
      selectOptions: ['phone', 'written', 'meeting', 'due_diligence'],
    },
    {
      key: 'topicCategory',
      type: 'select',
      selectOptions: ['trademark', 'patent', 'design', 'contract', 'strategy', 'other'],
    },
    { key: 'topic', type: 'text' },
    { key: 'requestedBy', type: 'text' },
    { key: 'scopeSummary', type: 'textarea' },
    { key: 'timeSpentHours', type: 'number' },
  ],
  official_fee_payment: [
    {
      key: 'authority',
      type: 'select',
      selectOptions: ['bpo', 'euipo', 'wipo', 'other'],
    },
    {
      key: 'feeType',
      type: 'select',
      selectOptions: [
        'filing',
        'publication',
        'examination',
        'renewal',
        'annuity',
        'opposition',
        'other',
      ],
    },
    { key: 'feeReference', type: 'text' },
    { key: 'relatedApplication', type: 'text' },
    { key: 'feeAmount', type: 'text' },
    { key: 'currency', type: 'select', selectOptions: ['BGN', 'EUR'] },
    { key: 'paymentDeadline', type: 'date' },
    { key: 'paymentDate', type: 'date' },
    { key: 'paymentReference', type: 'text' },
  ],
  other: [
    { key: 'workCategory', type: 'text' },
    { key: 'workSummary', type: 'textarea' },
    { key: 'expectedOutcome', type: 'text' },
  ],
}

function resolveFieldDef(
  matterType: MatterType,
  def: OtherMatterFieldDef,
): OtherMatterFieldDef {
  if (def.key !== 'workflowStage') return def
  return {
    ...def,
    selectOptions: OTHER_MATTER_WORKFLOW_STAGES[matterType] ?? ['open', 'closed'],
  }
}

function translateOtherField(
  matterType: MatterType,
  def: OtherMatterFieldDef,
): OtherMatterAttributeField {
  const resolved = resolveFieldDef(matterType, def)
  const base = resolved.spine
    ? `otherMatterSpine.${resolved.key}`
    : `attributes.${matterType}.${resolved.key}`

  const field: OtherMatterAttributeField = {
    key: resolved.key,
    type: resolved.type,
    label: i18n.t(`${base}.label`, { ns: 'matters', defaultValue: resolved.key }),
  }

  if (resolved.hasPlaceholder) {
    field.placeholder = i18n.t(`${base}.placeholder`, {
      ns: 'matters',
      defaultValue: '',
    })
  }
  if (resolved.hasHelpText) {
    field.helpText = i18n.t(`${base}.helpText`, { ns: 'matters', defaultValue: '' })
  }
  if (resolved.selectOptions) {
    field.options = resolved.selectOptions.map((value) => ({
      value,
      label: i18n.t(`${base}.options.${value}`, {
        ns: 'matters',
        defaultValue: value.replace(/_/g, ' '),
      }),
    }))
  }
  return field
}

export function getOtherMatterFieldDefs(matterType: MatterType): OtherMatterFieldDef[] {
  if (!isOtherMatterType(matterType)) return []
  const spine = OTHER_MATTER_SPINE_FIELD_DEFS.map((def) => resolveFieldDef(matterType, def))
  const details = OTHER_TYPE_FIELD_DEFS[matterType] ?? []
  return [...spine, ...details]
}

export function buildOtherMatterAttributeFields(
  matterType: MatterType,
): OtherMatterAttributeField[] {
  return getOtherMatterFieldDefs(matterType).map((def) => translateOtherField(matterType, def))
}

export function otherMatterSpineFieldKeys(): string[] {
  return OTHER_MATTER_SPINE_FIELD_DEFS.map((f) => f.key)
}

export function otherMatterDetailFieldKeys(matterType: MatterType): string[] {
  return (OTHER_TYPE_FIELD_DEFS[matterType] ?? []).map((f) => f.key)
}

export function formatOtherWorkflowStage(
  _matterType: MatterType,
  stage: string | null | undefined,
): string {
  if (!stage) return '—'
  return i18n.t(`otherMatterSpine.workflowStage.options.${stage}`, {
    ns: 'matters',
    defaultValue: stage.replace(/_/g, ' '),
  })
}

const TITLE_PRIORITY_KEYS: Partial<Record<MatterType, string[]>> = {
  copyright: ['workTitle'],
  border_measures: ['protectedRightRef', 'customsOffice'],
  fto_analysis: ['projectName', 'productName'],
  valuation: ['assetDescription'],
  dispute_opposition: ['opponentName', 'filingReference'],
  domain: ['domainName'],
  litigation_expert_report: ['caseReference'],
  consultation: ['topic'],
  official_fee_payment: ['feeReference', 'relatedApplication'],
  other: ['workSummary', 'workCategory'],
}

export function buildOtherMatterTitle(
  matterType: MatterType,
  attrs: Record<string, unknown>,
  fallback: string,
): string {
  const keys = TITLE_PRIORITY_KEYS[matterType] ?? []
  for (const key of keys) {
    const value = attrs[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  const incoming = attrs.incomingNumber
  if (typeof incoming === 'string' && incoming.trim()) return incoming.trim()
  return fallback
}
