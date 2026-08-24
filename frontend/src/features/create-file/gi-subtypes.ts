export const GI_KINDS = [
  'designation_of_origin',
  'geographical_indication',
] as const

export type GiKind = (typeof GI_KINDS)[number]

export function normalizeGiKind(
  value: string | null | undefined,
): GiKind | null {
  if (value === 'designation_of_origin' || value === 'geographical_indication') {
    return value
  }
  return null
}

export const GI_TERRITORIES = ['national', 'eu', 'wo'] as const

export type GiTerritory = (typeof GI_TERRITORIES)[number]

export function normalizeGiTerritory(
  value: string | null | undefined,
): GiTerritory | null {
  if (value === 'national' || value === 'eu' || value === 'wo') return value
  return null
}

export function jurisdictionsForGi(
  territory: GiTerritory | null,
  options: { nationalCountry?: string; woCountries?: string[] } = {},
): string[] {
  if (territory === 'eu') return ['EU']
  if (territory === 'wo') {
    return options.woCountries && options.woCountries.length > 0
      ? options.woCountries
      : ['WO']
  }
  if (territory === 'national') {
    return [options.nationalCountry || 'BG']
  }
  return []
}

export type GiGoodsRow = {
  id: string
  number: string
  text: string
}
