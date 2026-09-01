export const GI_FILTER_QUERY_KEYS = {
  applicant: 'giApplicant',
  name: 'giName',
  incoming: 'giIncoming',
  regNo: 'giRegNo',
  territory: 'giTerritory',
  representative: 'giRepresentative',
  appFrom: 'giAppFrom',
  appTo: 'giAppTo',
  regFrom: 'giRegFrom',
  regTo: 'giRegTo',
  contact: 'giContact',
  stage: 'giStage',
  country: 'giCountry',
  certificate: 'giCertificate',
} as const

export type GiListFilterState = {
  applicant: string
  name: string
  incoming: string
  regNo: string
  territory: string
  representative: string
  appFrom: string
  appTo: string
  regFrom: string
  regTo: string
  contact: string
  stage: string
  country: string
  certificate: string
}

export const EMPTY_GI_LIST_FILTERS: GiListFilterState = {
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
}

function parseCertificate(value: string | null): string {
  if (value === 'with' || value === 'without') return value
  if (value === '1') return 'with'
  return ''
}

export function parseGiListFilters(params: URLSearchParams): GiListFilterState {
  const k = GI_FILTER_QUERY_KEYS
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
  }
}

export function writeGiListFilters(
  params: URLSearchParams,
  filters: GiListFilterState,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const k = GI_FILTER_QUERY_KEYS

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
  ]

  for (const [key, value] of entries) {
    if (value) next.set(key, value)
    else next.delete(key)
  }

  return next
}

export function countActiveGiListFilters(filters: GiListFilterState): number {
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
  return count
}

export function giListFiltersToApi(
  filters: GiListFilterState,
): Record<string, string | undefined> {
  return {
    giApplicant: filters.applicant.trim() || undefined,
    giName: filters.name.trim() || undefined,
    giIncoming: filters.incoming.trim() || undefined,
    giRegNo: filters.regNo.trim() || undefined,
    giTerritory: filters.territory || undefined,
    giRepresentative: filters.representative.trim() || undefined,
    giAppFrom: filters.appFrom || undefined,
    giAppTo: filters.appTo || undefined,
    giRegFrom: filters.regFrom || undefined,
    giRegTo: filters.regTo || undefined,
    giContact: filters.contact.trim() || undefined,
    giStage: filters.stage || undefined,
    giCountry: filters.country || undefined,
    giCertificate: filters.certificate || undefined,
  }
}
