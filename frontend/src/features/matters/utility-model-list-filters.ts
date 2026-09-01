export const UTILITY_MODEL_FILTER_QUERY_KEYS = {
  applicant: 'umApplicant',
  name: 'umName',
  incoming: 'umIncoming',
  regNo: 'umRegNo',
  territory: 'umTerritory',
  representative: 'umRepresentative',
  appFrom: 'umAppFrom',
  appTo: 'umAppTo',
  regFrom: 'umRegFrom',
  regTo: 'umRegTo',
  contact: 'umContact',
  stage: 'umStage',
  certificate: 'umCertificate',
} as const

export type UtilityModelListFilterState = {
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
  certificate: string
}

export const EMPTY_UTILITY_MODEL_LIST_FILTERS: UtilityModelListFilterState = {
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
  certificate: '',
}

function parseCertificate(value: string | null): string {
  if (value === 'with' || value === 'without') return value
  if (value === '1') return 'with'
  return ''
}

export function parseUtilityModelListFilters(
  params: URLSearchParams,
): UtilityModelListFilterState {
  const k = UTILITY_MODEL_FILTER_QUERY_KEYS
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
    certificate: parseCertificate(params.get(k.certificate)),
  }
}

export function writeUtilityModelListFilters(
  params: URLSearchParams,
  filters: UtilityModelListFilterState,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const k = UTILITY_MODEL_FILTER_QUERY_KEYS

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
    [k.certificate, filters.certificate || undefined],
  ]

  for (const [key, value] of entries) {
    if (value) next.set(key, value)
    else next.delete(key)
  }

  return next
}

export function countActiveUtilityModelListFilters(
  filters: UtilityModelListFilterState,
): number {
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
  if (filters.certificate) count++
  return count
}

export function utilityModelListFiltersToApi(
  filters: UtilityModelListFilterState,
): Record<string, string | undefined> {
  return {
    utilityModelApplicant: filters.applicant.trim() || undefined,
    utilityModelName: filters.name.trim() || undefined,
    utilityModelIncoming: filters.incoming.trim() || undefined,
    utilityModelRegNo: filters.regNo.trim() || undefined,
    utilityModelTerritory: filters.territory || undefined,
    utilityModelRepresentative: filters.representative.trim() || undefined,
    utilityModelAppFrom: filters.appFrom || undefined,
    utilityModelAppTo: filters.appTo || undefined,
    utilityModelRegFrom: filters.regFrom || undefined,
    utilityModelRegTo: filters.regTo || undefined,
    utilityModelContact: filters.contact.trim() || undefined,
    utilityModelStage: filters.stage || undefined,
    utilityModelCertificate: filters.certificate || undefined,
  }
}
