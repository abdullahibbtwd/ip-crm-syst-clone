export const DESIGN_FILTER_QUERY_KEYS = {
  applicant: 'dsApplicant',
  name: 'dsName',
  incoming: 'dsIncoming',
  regNo: 'dsRegNo',
  territory: 'dsTerritory',
  procedure: 'dsProcedure',
  representative: 'dsRepresentative',
  appFrom: 'dsAppFrom',
  appTo: 'dsAppTo',
  regFrom: 'dsRegFrom',
  regTo: 'dsRegTo',
  contact: 'dsContact',
  stage: 'dsStage',
  country: 'dsCountry',
  certificate: 'dsCertificate',
} as const

export type DesignListFilterState = {
  applicant: string
  name: string
  incoming: string
  regNo: string
  /** Jurisdiction code: EU, RO, BG, WO */
  territory: string
  /** designProcedure: national | euipo | wipo */
  procedure: string
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
}

export const EMPTY_DESIGN_LIST_FILTERS: DesignListFilterState = {
  applicant: '',
  name: '',
  incoming: '',
  regNo: '',
  territory: '',
  procedure: '',
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

export function parseDesignListFilters(
  params: URLSearchParams,
): DesignListFilterState {
  const k = DESIGN_FILTER_QUERY_KEYS
  return {
    applicant: params.get(k.applicant) ?? '',
    name: params.get(k.name) ?? '',
    incoming: params.get(k.incoming) ?? '',
    regNo: params.get(k.regNo) ?? '',
    territory: params.get(k.territory) ?? '',
    procedure: params.get(k.procedure) ?? '',
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

export function writeDesignListFilters(
  params: URLSearchParams,
  filters: DesignListFilterState,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const k = DESIGN_FILTER_QUERY_KEYS

  const entries: Array<[string, string | undefined]> = [
    [k.applicant, filters.applicant.trim() || undefined],
    [k.name, filters.name.trim() || undefined],
    [k.incoming, filters.incoming.trim() || undefined],
    [k.regNo, filters.regNo.trim() || undefined],
    [k.territory, filters.territory || undefined],
    [k.procedure, filters.procedure || undefined],
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

export function countActiveDesignListFilters(filters: DesignListFilterState): number {
  let count = 0
  if (filters.applicant.trim()) count++
  if (filters.name.trim()) count++
  if (filters.incoming.trim()) count++
  if (filters.regNo.trim()) count++
  if (filters.territory) count++
  if (filters.procedure) count++
  if (filters.representative.trim()) count++
  if (filters.appFrom || filters.appTo) count++
  if (filters.regFrom || filters.regTo) count++
  if (filters.contact.trim()) count++
  if (filters.stage) count++
  if (filters.country) count++
  if (filters.certificate) count++
  return count
}

export function designListFiltersToApi(
  filters: DesignListFilterState,
): Record<string, string | undefined> {
  return {
    designApplicant: filters.applicant.trim() || undefined,
    designName: filters.name.trim() || undefined,
    designIncoming: filters.incoming.trim() || undefined,
    designRegNo: filters.regNo.trim() || undefined,
    designTerritory: filters.territory || undefined,
    designProcedure: filters.procedure || undefined,
    designRepresentative: filters.representative.trim() || undefined,
    designAppFrom: filters.appFrom || undefined,
    designAppTo: filters.appTo || undefined,
    designRegFrom: filters.regFrom || undefined,
    designRegTo: filters.regTo || undefined,
    designContact: filters.contact.trim() || undefined,
    designStage: filters.stage || undefined,
    designCountry: filters.country || undefined,
    designCertificate: filters.certificate || undefined,
  }
}
