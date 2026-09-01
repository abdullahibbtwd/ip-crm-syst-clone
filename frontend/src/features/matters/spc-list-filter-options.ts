import { PROSECUTION_STAGES } from '@/features/matters/prosecution-stages'

export const SPC_FILTER_TERRITORY_OPTIONS = ['WO', 'BG', 'RO', 'EU'] as const

export type SpcFilterTerritory = (typeof SPC_FILTER_TERRITORY_OPTIONS)[number]

export const SPC_FILTER_STATUS_OPTIONS = [...PROSECUTION_STAGES, 'registered'] as const

export type SpcFilterStatus = (typeof SPC_FILTER_STATUS_OPTIONS)[number]

export const SPC_FILTER_CERTIFICATE_OPTIONS = ['with', 'without'] as const
export type SpcFilterCertificate = (typeof SPC_FILTER_CERTIFICATE_OPTIONS)[number]

export function spcStatusFilterLabelKey(status: SpcFilterStatus): string {
  if (status === 'registered') {
    return 'spcList.filters.statusOptions.registered'
  }
  return `prosecution.stages.${status}`
}
