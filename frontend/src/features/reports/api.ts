import { apiClient } from '@/lib/api-client'
import type {
  DeadlineRiskFilters,
  DeadlineRiskResponse,
  FilingVolumesFilters,
  FilingVolumesResponse,
  RenewalsSummaryFilters,
  RenewalsSummaryResponse,
  RevenueSummaryFilters,
  RevenueSummaryResponse,
  TeamWorkloadResponse,
  ClientProfitabilityResponse,
} from './types'

export const reportsApi = {
  deadlineRisk: (params?: DeadlineRiskFilters) =>
    apiClient.get<DeadlineRiskResponse>(
      '/reports/deadline-risk',
      params as Record<string, unknown>,
    ),

  revenueSummary: (params?: RevenueSummaryFilters) =>
    apiClient.get<RevenueSummaryResponse>(
      '/reports/revenue-summary',
      params as Record<string, unknown>,
    ),

  filingVolumes: (params?: FilingVolumesFilters) =>
    apiClient.get<FilingVolumesResponse>(
      '/reports/filing-volumes',
      params as Record<string, unknown>,
    ),

  renewalsSummary: (params?: RenewalsSummaryFilters) =>
    apiClient.get<RenewalsSummaryResponse>(
      '/reports/renewals-summary',
      params as Record<string, unknown>,
    ),

  teamWorkload: () =>
    apiClient.get<TeamWorkloadResponse>('/reports/team-workload'),

  clientProfitability: () =>
    apiClient.get<ClientProfitabilityResponse>('/reports/client-profitability'),
}
