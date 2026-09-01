export const PATENT_FILTER_QUERY_KEYS = {
  applicant: 'ptApplicant',
  name: 'ptName',
  incoming: 'ptIncoming',
  regNo: 'ptRegNo',
  territory: 'ptTerritory',
  representative: 'ptRepresentative',
  appFrom: 'ptAppFrom',
  appTo: 'ptAppTo',
  regFrom: 'ptRegFrom',
  regTo: 'ptRegTo',
  contact: 'ptContact',
  stage: 'ptStage',
  country: 'ptCountry',
  certificate: 'ptCertificate',
  annualFees: 'ptAnnualFees',
} as const

export type PatentListFilterState = {
  applicant: string
  name: string
  incoming: string
  regNo: string
  /** patentProcedure route: national | european | ep_validation | pct */
  territory: string
  representative: string
  appFrom: string
  appTo: string
  regFrom: string
  regTo: string
  contact: string
  stage: string
  country: string
  /** with | without */
  certificate: string
  /** yes | no */
  annualFees: string
}

export const EMPTY_PATENT_LIST_FILTERS: PatentListFilterState = {
  applicant: '',
  name: '',
  incoming: '',
  regNo: '',
  territory: '',
  representative: '',
  appFrom: '',
  appTo: '',
  regFrom: '',
  regTo: '',
  contact: '',
  stage: '',
  country: '',
  certificate: '',
  annualFees: '',
}

function parseCertificate(value: string | null): string {
  if (value === 'with' || value === 'without') return value
  if (value === '1') return 'with'
  return ''
}

function parseAnnualFees(value: string | null): string {
  if (value === 'yes' || value === 'no') return value
  if (value === 'due' || value === 'overdue') return 'yes'
  return ''
}

export function parsePatentListFilters(
  params: URLSearchParams,
): PatentListFilterState {
  const k = PATENT_FILTER_QUERY_KEYS
  return {
    applicant: params.get(k.applicant) ?? '',
    name: params.get(k.name) ?? '',
    incoming: params.get(k.incoming) ?? '',
    regNo: params.get(k.regNo) ?? '',
    territory: params.get(k.territory) ?? '',
    representative: params.get(k.representative) ?? '',
    appFrom: params.get(k.appFrom) ?? '',
    appTo: params.get(k.appTo) ?? '',
    regFrom: params.get(k.regFrom) ?? '',
    regTo: params.get(k.regTo) ?? '',
    contact: params.get(k.contact) ?? '',
    stage: params.get(k.stage) ?? '',
    country: params.get(k.country) ?? '',
    certificate: parseCertificate(params.get(k.certificate)),
    annualFees: parseAnnualFees(params.get(k.annualFees)),
  }
}

export function writePatentListFilters(
  params: URLSearchParams,
  filters: PatentListFilterState,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const k = PATENT_FILTER_QUERY_KEYS

  const entries: Array<[string, string | undefined]> = [
    [k.applicant, filters.applicant.trim() || undefined],
    [k.name, filters.name.trim() || undefined],
    [k.incoming, filters.incoming.trim() || undefined],
    [k.regNo, filters.regNo.trim() || undefined],
    [k.territory, filters.territory || undefined],
    [k.representative, filters.representative.trim() || undefined],
    [k.appFrom, filters.appFrom || undefined],
    [k.appTo, filters.appTo || undefined],
    [k.regFrom, filters.regFrom || undefined],
    [k.regTo, filters.regTo || undefined],
    [k.contact, filters.contact.trim() || undefined],
    [k.stage, filters.stage || undefined],
    [k.country, filters.country || undefined],
    [k.certificate, filters.certificate || undefined],
    [k.annualFees, filters.annualFees || undefined],
  ]

  for (const [key, value] of entries) {
    if (value) next.set(key, value)
    else next.delete(key)
  }

  return next
}

export function countActivePatentListFilters(filters: PatentListFilterState): number {
  let count = 0
  if (filters.applicant.trim()) count++
  if (filters.name.trim()) count++
  if (filters.incoming.trim()) count++
  if (filters.regNo.trim()) count++
  if (filters.territory) count++
  if (filters.representative.trim()) count++
  if (filters.appFrom || filters.appTo) count++
  if (filters.regFrom || filters.regTo) count++
  if (filters.contact.trim()) count++
  if (filters.stage) count++
  if (filters.country) count++
  if (filters.certificate) count++
  if (filters.annualFees) count++
  return count
}

export function patentListFiltersToApi(
  filters: PatentListFilterState,
): Record<string, string | undefined> {
  return {
    patentApplicant: filters.applicant.trim() || undefined,
    patentName: filters.name.trim() || undefined,
    patentIncoming: filters.incoming.trim() || undefined,
    patentRegNo: filters.regNo.trim() || undefined,
    patentTerritory: filters.territory || undefined,
    patentRepresentative: filters.representative.trim() || undefined,
    patentAppFrom: filters.appFrom || undefined,
    patentAppTo: filters.appTo || undefined,
    patentRegFrom: filters.regFrom || undefined,
    patentRegTo: filters.regTo || undefined,
    patentContact: filters.contact.trim() || undefined,
    patentStage: filters.stage || undefined,
    patentCountry: filters.country || undefined,
    patentCertificate: filters.certificate || undefined,
    patentAnnualFees: filters.annualFees || undefined,
  }
}
