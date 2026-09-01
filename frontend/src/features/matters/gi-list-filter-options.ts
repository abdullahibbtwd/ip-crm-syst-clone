import { GI_TERRITORIES } from '@/features/create-file/gi-subtypes'
import { PROSECUTION_STAGES } from '@/features/matters/prosecution-stages'

export const GI_FILTER_TERRITORY_OPTIONS = GI_TERRITORIES

export type GiFilterTerritory = (typeof GI_FILTER_TERRITORY_OPTIONS)[number]

export const GI_FILTER_JURISDICTION_OPTIONS = ['EU', 'WO', 'BG', 'RO'] as const

export type GiFilterJurisdiction = (typeof GI_FILTER_JURISDICTION_OPTIONS)[number]

export const GI_FILTER_STATUS_OPTIONS = [...PROSECUTION_STAGES, 'registered'] as const

export type GiFilterStatus = (typeof GI_FILTER_STATUS_OPTIONS)[number]

export const GI_FILTER_CERTIFICATE_OPTIONS = ['with', 'without'] as const
export type GiFilterCertificate = (typeof GI_FILTER_CERTIFICATE_OPTIONS)[number]

export function giStatusFilterLabelKey(status: GiFilterStatus): string {
  if (status === 'registered') {
    return 'giList.filters.statusOptions.registered'
  }
  return `prosecution.stages.${status}`
}

export function giTerritoryFilterLabelKey(territory: GiFilterTerritory): string {
  return `createFile.giTerritories.${territory}`
}
