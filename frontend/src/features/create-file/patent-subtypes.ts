export const PATENT_SUBTYPES = ['new', 'registered'] as const

export type PatentSubtype = (typeof PATENT_SUBTYPES)[number]

export function normalizePatentSubtype(
  value: string | null | undefined,
): PatentSubtype | null {
  if (value === 'new' || value === 'registered') return value
  return null
}

export const PATENT_FILING_ROUTES = [
  'national',
  'european',
  'ep_validation',
  'pct',
] as const

export type PatentFilingRoute = (typeof PATENT_FILING_ROUTES)[number]

export const NEW_PATENT_FILING_ROUTES = ['ep_validation'] as const

export const REGISTERED_PATENT_FILING_ROUTES = PATENT_FILING_ROUTES

export function filingRoutesForSubtype(
  subtype: PatentSubtype,
): readonly PatentFilingRoute[] {
  return subtype === 'registered'
    ? REGISTERED_PATENT_FILING_ROUTES
    : NEW_PATENT_FILING_ROUTES
}

export function normalizePatentFilingRoute(
  value: string | null | undefined,
): PatentFilingRoute | null {
  if (
    value === 'national' ||
    value === 'european' ||
    value === 'ep_validation' ||
    value === 'pct'
  ) {
    return value
  }
  return null
}

/** Countries offered for EP validation in the legacy create-file form. */
export const EP_VALIDATION_COUNTRIES = [
  'AL',
  'BA',
  'BG',
  'EE',
  'MK',
  'MD',
  'ME',
  'RO',
  'RS',
  'SI',
  'TR',
] as const

export const PCT_EXTRA_JURISDICTIONS = [
  { code: 'EU', name: 'European Union' },
  { code: 'BX', name: 'Benelux' },
  { code: 'OA', name: 'African Intellectual Property Organization (OAPI)' },
] as const

export function jurisdictionsForPatentRoute(
  route: PatentFilingRoute | null,
  options: {
    nationalCountry?: string
    validationCountry?: string
    pctCountries?: string[]
  } = {},
): string[] {
  if (route === 'national') return [options.nationalCountry || 'BG']
  if (route === 'european') return ['EP']
  if (route === 'ep_validation') return [options.validationCountry || 'BG']
  if (route === 'pct') {
    return options.pctCountries && options.pctCountries.length > 0
      ? options.pctCountries
      : ['WO']
  }
  return ['BG']
}

export function usesEpApplicationLabel(route: PatentFilingRoute | null) {
  return route === 'european' || route === 'ep_validation'
}

export type PatentClaimRow = {
  id: string
  number: string
  text: string
}

export type SpecimenSlot = {
  id: string
  file: File | null
}
