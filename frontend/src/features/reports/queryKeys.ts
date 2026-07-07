import type {
  DeadlineRiskFilters,
  FilingVolumesFilters,
  RenewalsSummaryFilters,
  RevenueSummaryFilters,
} from './types'

export const reportKeys = {
  all: ['reports'] as const,
  deadlineRisk: (filters?: DeadlineRiskFilters) =>
    [...reportKeys.all, 'deadline-risk', filters ?? {}] as const,
  revenueSummary: (filters?: RevenueSummaryFilters) =>
    [...reportKeys.all, 'revenue-summary', filters ?? {}] as const,
  filingVolumes: (filters?: FilingVolumesFilters) =>
    [...reportKeys.all, 'filing-volumes', filters ?? {}] as const,
  renewalsSummary: (filters?: RenewalsSummaryFilters) =>
    [...reportKeys.all, 'renewals-summary', filters ?? {}] as const,
  teamWorkload: () => [...reportKeys.all, 'team-workload'] as const,
  clientProfitability: () => [...reportKeys.all, 'client-profitability'] as const,
}
