import { PATENT_FILING_ROUTES, type PatentFilingRoute } from '@/features/create-file/patent-subtypes'

/** Legacy HandlePatents territory dropdown — maps to patentProcedure. */
export const PATENT_FILTER_TERRITORY_OPTIONS = PATENT_FILING_ROUTES

export type PatentFilterTerritory = PatentFilingRoute

/** Legacy status filter values (map to prosecution stage or registered). */
export const PATENT_FILTER_STATUS_OPTIONS = [
  'prep',
  'filing',
  'translation_assigned',
  'formal_exam',
  'substantive_exam',
  'publication',
  'reg_fee',
  'registration',
  'registered',
] as const

export type PatentFilterStatus = (typeof PATENT_FILTER_STATUS_OPTIONS)[number]

export const PATENT_FILTER_CERTIFICATE_OPTIONS = ['with', 'without'] as const
export type PatentFilterCertificate = (typeof PATENT_FILTER_CERTIFICATE_OPTIONS)[number]

export const PATENT_FILTER_ANNUAL_FEES_OPTIONS = ['yes', 'no'] as const
export type PatentFilterAnnualFees = (typeof PATENT_FILTER_ANNUAL_FEES_OPTIONS)[number]

export function patentStatusFilterLabelKey(status: PatentFilterStatus): string {
  if (status === 'registered') {
    return 'patentList.filters.statusOptions.registered'
  }
  if (status === 'translation_assigned') {
    return 'patentList.filters.statusOptions.translation_assigned'
  }
  if (status === 'formal_exam') {
    return 'patentList.filters.statusOptions.filing_entry'
  }
  if (status === 'registration') {
    return 'patentList.filters.statusOptions.validation_decision'
  }
  if (status === 'prep') {
    return 'patentList.filters.statusOptions.validation_received'
  }
  if (status === 'filing') {
    return 'patentList.filters.statusOptions.assignment'
  }
  return `prosecution.stages.${status}`
}
