export const TRADEMARK_PROCEDURES = [
  'new',
  'objection',
  'opposition_against_us',
  'opposition_by_us',
  'revocation',
  'cancellation',
] as const

export type TrademarkProcedure = (typeof TRADEMARK_PROCEDURES)[number]

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

export function trademarkSideForProcedure(
  procedure: TrademarkProcedure,
): 'us' | 'them' | null {
  if (procedure === 'opposition_against_us' || procedure === 'revocation') {
    return 'them'
  }
  if (procedure === 'opposition_by_us' || procedure === 'objection' || procedure === 'cancellation') {
    return 'us'
  }
  return null
}
