export const TRADEMARK_PROCEDURES = [
  'new',
  'registered',
  'objection',
  'opposition',
  'cancellation',
  'deletion',
] as const

export type TrademarkProcedure = (typeof TRADEMARK_PROCEDURES)[number]

export function isFullTrademarkForm(
  procedure: TrademarkProcedure | null,
): boolean {
  return (
    procedure === 'new' ||
    procedure === 'registered' ||
    procedure === 'objection' ||
    procedure === 'opposition' ||
    procedure === 'cancellation' ||
    procedure === 'deletion'
  )
}

/** Older drafts stored these keys — still resolve for display. */
export const LEGACY_TRADEMARK_PROCEDURES = [
  'opposition_against_us',
  'opposition_by_us',
  'revocation',
] as const

export type LegacyTrademarkProcedure = (typeof LEGACY_TRADEMARK_PROCEDURES)[number]

export const MARK_KINDS = ['individual', 'collective', 'certification'] as const
export type MarkKind = (typeof MARK_KINDS)[number]

export const MARK_TYPES = [
  'wordmark',
  'figurative',
  'combined',
  'three_dimensional',
  'sound',
  'combination_of_colors',
] as const
export type CreateFileMarkType = (typeof MARK_TYPES)[number]

export const TERRITORIES = ['national', 'eu', 'international'] as const
export type TrademarkTerritory = (typeof TERRITORIES)[number]

export const NICE_CLASS_NUMBERS = Array.from({ length: 45 }, (_, i) => i + 1)

export const SEARCH_LINKS = [
  {
    key: 'tmview',
    label: 'TMview',
    href: 'https://www.tmdn.org/tmview/',
  },
  {
    key: 'wipoBrand',
    label: 'WIPO Global Brand DB',
    href: 'https://branddb.wipo.int/',
  },
  {
    key: 'madridMonitor',
    label: 'WIPO Madrid Monitor',
    href: 'https://www.wipo.int/madrid/monitor/en/',
  },
] as const

export const COMMERCIAL_REGISTER_URL =
  'https://portal.registryagency.bg/CR/reports/ActiveConditionServices'

export type GoodsServicesRow = {
  classNumber: number
  description: string
}

export function normalizeTrademarkProcedure(
  value: string | null | undefined,
): TrademarkProcedure | null {
  if (!value) return null
  if (value === 'opposition_against_us' || value === 'opposition_by_us') {
    return 'opposition'
  }
  if (value === 'revocation') return 'deletion'
  if ((TRADEMARK_PROCEDURES as readonly string[]).includes(value)) {
    return value as TrademarkProcedure
  }
  return null
}

export function trademarkSideForProcedure(
  procedure: TrademarkProcedure | LegacyTrademarkProcedure,
): 'us' | 'them' | null {
  if (procedure === 'opposition_against_us') return 'them'
  if (
    procedure === 'opposition_by_us' ||
    procedure === 'opposition' ||
    procedure === 'objection' ||
    procedure === 'cancellation' ||
    procedure === 'deletion'
  ) {
    return 'us'
  }
  return null
}
