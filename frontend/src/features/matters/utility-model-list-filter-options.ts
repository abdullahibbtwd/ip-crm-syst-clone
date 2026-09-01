import { PROSECUTION_STAGES } from '@/features/matters/prosecution-stages'

export const UTILITY_MODEL_FILTER_TERRITORY_OPTIONS = ['WO', 'BG', 'RO', 'EU'] as const

export type UtilityModelFilterTerritory =
  (typeof UTILITY_MODEL_FILTER_TERRITORY_OPTIONS)[number]

export const UTILITY_MODEL_FILTER_STATUS_OPTIONS = [
  ...PROSECUTION_STAGES,
  'registered',
] as const

export type UtilityModelFilterStatus =
  (typeof UTILITY_MODEL_FILTER_STATUS_OPTIONS)[number]

export const UTILITY_MODEL_FILTER_CERTIFICATE_OPTIONS = ['with', 'without'] as const
export type UtilityModelFilterCertificate =
  (typeof UTILITY_MODEL_FILTER_CERTIFICATE_OPTIONS)[number]

export function utilityModelStatusFilterLabelKey(
  status: UtilityModelFilterStatus,
): string {
  if (status === 'registered') {
    return 'utilityModelList.filters.statusOptions.registered'
  }
  return `prosecution.stages.${status}`
}
