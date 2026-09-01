import { DESIGN_FILING_ROUTES, type DesignFilingRoute } from '@/features/create-file/design-subtypes'
import { PROSECUTION_STAGES } from '@/features/matters/prosecution-stages'

export const DESIGN_FILTER_PROCEDURE_OPTIONS = DESIGN_FILING_ROUTES

export type DesignFilterProcedure = DesignFilingRoute

/** Jurisdiction codes shown in the design list territory column. */
export const DESIGN_FILTER_TERRITORY_OPTIONS = ['EU', 'WO', 'BG', 'RO'] as const

export type DesignFilterTerritory = (typeof DESIGN_FILTER_TERRITORY_OPTIONS)[number]

export const DESIGN_FILTER_STATUS_OPTIONS = [
  ...PROSECUTION_STAGES,
  'registered',
] as const

export type DesignFilterStatus = (typeof DESIGN_FILTER_STATUS_OPTIONS)[number]

export const DESIGN_FILTER_CERTIFICATE_OPTIONS = ['with', 'without'] as const
export type DesignFilterCertificate = (typeof DESIGN_FILTER_CERTIFICATE_OPTIONS)[number]

export function designStatusFilterLabelKey(status: DesignFilterStatus): string {
  if (status === 'registered') {
    return 'designList.filters.statusOptions.registered'
  }
  return `prosecution.stages.${status}`
}
