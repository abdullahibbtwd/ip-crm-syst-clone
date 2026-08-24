import type { GoodsServicesRow } from '@/features/create-file/trademark-subtypes'

export const TRADEMARK_SECONDARY_ACTIONS = [
  'name_address_change',
  'transfer',
  'license',
  'pledge',
  'injunction',
  'surrender',
  'limitation',
  'insolvency',
] as const

export type TrademarkSecondaryAction = (typeof TRADEMARK_SECONDARY_ACTIONS)[number]

export const TRADEMARK_ACTION_KINDS = [
  'scope_correction',
  ...TRADEMARK_SECONDARY_ACTIONS,
] as const

export type TrademarkActionKind = (typeof TRADEMARK_ACTION_KINDS)[number]

export const LEGAL_BASIS_OPTIONS = [
  'opposition_settlement',
  'office_action_response',
  'voluntary_limitation',
  'correction_of_error',
  'other',
] as const

export type LegalBasisOption = (typeof LEGAL_BASIS_OPTIONS)[number]

export type ReminderOffset = {
  unit: 'months' | 'days'
  amount: number
}

export type TrademarkActionInput = {
  kind: TrademarkActionKind
  goodsAndServices?: GoodsServicesRow[]
  incomingReferenceNumber?: string
  filingDate?: string
  legalBasis?: LegalBasisOption
  legalBasisOther?: string
  documentVersionId?: string
  generateProforma?: boolean
  governmentFeeAmount?: number
  governmentFeeCurrency?: string
  paymentDueDate?: string
  paymentReminder?: ReminderOffset
  filingDeadline?: string
  filingReminder?: ReminderOffset
}

export type TrademarkActionResult = {
  matter: import('./types').MatterDetail
  invoiceId: string | null
  deadlineIds: string[]
}

export type TrademarkActionHistoryEntry = {
  id: string
  kind: TrademarkActionKind
  occurredAt: string
  incomingReferenceNumber?: string
  filingDate?: string
  legalBasis?: string
  documentVersionId?: string
  generateProforma?: boolean
  governmentFeeAmount?: number
  governmentFeeCurrency?: string
  paymentDueDate?: string
  filingDeadline?: string
}

export const TRADEMARK_ACTION_TAG_PREFIX = 'trademark-action:'

export function trademarkActionTag(actionId: string) {
  return `${TRADEMARK_ACTION_TAG_PREFIX}${actionId}`.toLowerCase()
}

export function historyFromAttributes(
  attrs: Record<string, unknown>,
): TrademarkActionHistoryEntry[] {
  const raw = attrs.trademarkActions
  if (!Array.isArray(raw)) return []

  return raw.flatMap((row, index) => {
    if (!row || typeof row !== 'object') return []
    const entry = row as Record<string, unknown>
    const kind = String(entry.kind ?? '')
    if (!(TRADEMARK_ACTION_KINDS as readonly string[]).includes(kind)) return []
    const occurredAt = typeof entry.occurredAt === 'string' ? entry.occurredAt : ''
    return [
      {
        id: String(entry.id || `legacy-${kind}-${occurredAt || index}`),
        kind: kind as TrademarkActionKind,
        occurredAt,
        incomingReferenceNumber:
          typeof entry.incomingReferenceNumber === 'string'
            ? entry.incomingReferenceNumber
            : undefined,
        filingDate: typeof entry.filingDate === 'string' ? entry.filingDate : undefined,
        legalBasis: typeof entry.legalBasis === 'string' ? entry.legalBasis : undefined,
        documentVersionId:
          typeof entry.documentVersionId === 'string' ? entry.documentVersionId : undefined,
        generateProforma: Boolean(entry.generateProforma),
        governmentFeeAmount:
          typeof entry.governmentFeeAmount === 'number' ? entry.governmentFeeAmount : undefined,
        governmentFeeCurrency:
          typeof entry.governmentFeeCurrency === 'string'
            ? entry.governmentFeeCurrency
            : undefined,
        paymentDueDate:
          typeof entry.paymentDueDate === 'string' ? entry.paymentDueDate : undefined,
        filingDeadline:
          typeof entry.filingDeadline === 'string' ? entry.filingDeadline : undefined,
      },
    ]
  })
}

export function secondaryHistoryFromAttributes(
  attrs: Record<string, unknown>,
): TrademarkActionHistoryEntry[] {
  return historyFromAttributes(attrs)
    .filter((entry) => entry.kind !== 'scope_correction')
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
}

function isGoodsRow(value: unknown): value is GoodsServicesRow {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.classNumber === 'number' || typeof row.classNumber === 'string'
}

export function goodsRowsFromAttributes(
  attrs: Record<string, unknown>,
): GoodsServicesRow[] {
  const raw = attrs.goodsAndServices
  if (Array.isArray(raw) && raw.some(isGoodsRow)) {
    return raw.filter(isGoodsRow).map((row) => ({
      classNumber: Number(row.classNumber) || 1,
      description: String(row.description ?? ''),
    }))
  }

  const classes = attrs.niceClasses
  if (Array.isArray(classes) && classes.length > 0) {
    return classes
      .map((value) => Number(value))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45)
      .map((classNumber) => ({ classNumber, description: '' }))
  }

  return []
}
