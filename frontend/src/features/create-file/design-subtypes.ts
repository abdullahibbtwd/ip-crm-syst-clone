export const DESIGN_FILING_ROUTES = ['wipo', 'national', 'euipo'] as const

export type DesignFilingRoute = (typeof DESIGN_FILING_ROUTES)[number]

export function normalizeDesignFilingRoute(
  value: string | null | undefined,
): DesignFilingRoute | null {
  if (value === 'wipo' || value === 'national' || value === 'euipo') return value
  return null
}

export function designNeedsCountries(route: DesignFilingRoute | null) {
  return route === 'national'
}

export function jurisdictionsForDesignRoute(
  route: DesignFilingRoute | null,
  countries: string[],
): string[] {
  if (route === 'euipo') return ['EU']
  if (route === 'wipo') return ['WO']
  const picked = countries.filter(Boolean)
  return picked.length > 0 ? picked : ['BG']
}
