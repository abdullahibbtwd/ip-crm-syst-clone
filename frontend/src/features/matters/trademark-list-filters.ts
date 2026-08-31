export const TRADEMARK_FILTER_QUERY_KEYS = {
  applicant: 'tmApplicant',
  name: 'tmName',
  incoming: 'tmIncoming',
  regNo: 'tmRegNo',
  markType: 'tmMarkType',
  markKind: 'tmMarkKind',
  territory: 'tmTerritory',
  representative: 'tmRepresentative',
  appFrom: 'tmAppFrom',
  appTo: 'tmAppTo',
  regFrom: 'tmRegFrom',
  regTo: 'tmRegTo',
  contact: 'tmContact',
  stage: 'tmStage',
  niceClass: 'tmClass',
  country: 'tmCountry',
  certificate: 'tmCertificate',
} as const

export type TrademarkListFilterState = {
  applicant: string
  name: string
  incoming: string
  regNo: string
  markType: string
  markKind: string
  territory: string
  representative: string
  appFrom: string
  appTo: string
  regFrom: string
  regTo: string
  contact: string
  stage: string
  niceClass: string
  country: string
  certificate: boolean
}

export const EMPTY_TRADEMARK_LIST_FILTERS: TrademarkListFilterState = {
  applicant: '',
  name: '',
  incoming: '',
  regNo: '',
  markType: '',
  markKind: '',
  territory: '',
  representative: '',
  appFrom: '',
  appTo: '',
  regFrom: '',
  regTo: '',
  contact: '',
  stage: '',
  niceClass: '',
  country: '',
  certificate: false,
}

export function parseTrademarkListFilters(
  params: URLSearchParams,
): TrademarkListFilterState {
  const k = TRADEMARK_FILTER_QUERY_KEYS
  return {
    applicant: params.get(k.applicant) ?? '',
    name: params.get(k.name) ?? '',
    incoming: params.get(k.incoming) ?? '',
    regNo: params.get(k.regNo) ?? '',
    markType: params.get(k.markType) ?? '',
    markKind: params.get(k.markKind) ?? '',
    territory: params.get(k.territory) ?? '',
    representative: params.get(k.representative) ?? '',
    appFrom: params.get(k.appFrom) ?? '',
    appTo: params.get(k.appTo) ?? '',
    regFrom: params.get(k.regFrom) ?? '',
    regTo: params.get(k.regTo) ?? '',
    contact: params.get(k.contact) ?? '',
    stage: params.get(k.stage) ?? '',
    niceClass: params.get(k.niceClass) ?? '',
    country: params.get(k.country) ?? '',
    certificate: params.get(k.certificate) === '1',
  }
}

export function writeTrademarkListFilters(
  params: URLSearchParams,
  filters: TrademarkListFilterState,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const k = TRADEMARK_FILTER_QUERY_KEYS

  const entries: Array<[string, string | undefined]> = [
    [k.applicant, filters.applicant.trim() || undefined],
    [k.name, filters.name.trim() || undefined],
    [k.incoming, filters.incoming.trim() || undefined],
    [k.regNo, filters.regNo.trim() || undefined],
    [k.markType, filters.markType || undefined],
    [k.markKind, filters.markKind || undefined],
    [k.territory, filters.territory || undefined],
    [k.representative, filters.representative.trim() || undefined],
    [k.appFrom, filters.appFrom || undefined],
    [k.appTo, filters.appTo || undefined],
    [k.regFrom, filters.regFrom || undefined],
    [k.regTo, filters.regTo || undefined],
    [k.contact, filters.contact.trim() || undefined],
    [k.stage, filters.stage || undefined],
    [k.niceClass, filters.niceClass || undefined],
    [k.country, filters.country || undefined],
    [k.certificate, filters.certificate ? '1' : undefined],
  ]

  for (const [key, value] of entries) {
    if (value) next.set(key, value)
    else next.delete(key)
  }

  return next
}

export function countActiveTrademarkListFilters(
  filters: TrademarkListFilterState,
): number {
  let count = 0
  if (filters.applicant.trim()) count++
  if (filters.name.trim()) count++
  if (filters.incoming.trim()) count++
  if (filters.regNo.trim()) count++
  if (filters.markType) count++
  if (filters.markKind) count++
  if (filters.territory) count++
  if (filters.representative.trim()) count++
  if (filters.appFrom || filters.appTo) count++
  if (filters.regFrom || filters.regTo) count++
  if (filters.contact.trim()) count++
  if (filters.stage) count++
  if (filters.niceClass) count++
  if (filters.country) count++
  if (filters.certificate) count++
  return count
}

export function trademarkListFiltersToApi(
  filters: TrademarkListFilterState,
): Record<string, string | boolean | undefined> {
  return {
    trademarkApplicant: filters.applicant.trim() || undefined,
    trademarkName: filters.name.trim() || undefined,
    trademarkIncoming: filters.incoming.trim() || undefined,
    trademarkRegNo: filters.regNo.trim() || undefined,
    trademarkMarkType: filters.markType || undefined,
    trademarkMarkKind: filters.markKind || undefined,
    trademarkTerritory: filters.territory || undefined,
    trademarkRepresentative: filters.representative.trim() || undefined,
    trademarkAppFrom: filters.appFrom || undefined,
    trademarkAppTo: filters.appTo || undefined,
    trademarkRegFrom: filters.regFrom || undefined,
    trademarkRegTo: filters.regTo || undefined,
    trademarkContact: filters.contact.trim() || undefined,
    trademarkStage: filters.stage || undefined,
    trademarkClass: filters.niceClass || undefined,
    trademarkCountry: filters.country || undefined,
    trademarkCertificate: filters.certificate || undefined,
  }
}
