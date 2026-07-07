import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import { reportKeys } from '../queryKeys'
import type {
  DeadlineRiskFilters,
  FilingVolumesFilters,
  RenewalsSummaryFilters,
  RevenueSummaryFilters,
} from '../types'

export function useDeadlineRiskReport(filters?: DeadlineRiskFilters, enabled = true) {
  return useQuery({
    queryKey: reportKeys.deadlineRisk(filters),
    queryFn: () => reportsApi.deadlineRisk(filters),
    enabled,
    staleTime: 60_000,
  })
}

export function useRevenueSummaryReport(filters?: RevenueSummaryFilters, enabled = true) {
  return useQuery({
    queryKey: reportKeys.revenueSummary(filters),
    queryFn: () => reportsApi.revenueSummary(filters),
    enabled,
    staleTime: 60_000,
  })
}

export function useFilingVolumesReport(filters?: FilingVolumesFilters, enabled = true) {
  return useQuery({
    queryKey: reportKeys.filingVolumes(filters),
    queryFn: () => reportsApi.filingVolumes(filters),
    enabled,
    staleTime: 60_000,
  })
}

export function useRenewalsSummaryReport(filters?: RenewalsSummaryFilters, enabled = true) {
  return useQuery({
    queryKey: reportKeys.renewalsSummary(filters),
    queryFn: () => reportsApi.renewalsSummary(filters),
    enabled,
    staleTime: 60_000,
  })
}

export function useTeamWorkloadReport(enabled = true) {
  return useQuery({
    queryKey: reportKeys.teamWorkload(),
    queryFn: () => reportsApi.teamWorkload(),
    enabled,
    staleTime: 60_000,
  })
}

export function useClientProfitabilityReport(enabled = true) {
  return useQuery({
    queryKey: reportKeys.clientProfitability(),
    queryFn: () => reportsApi.clientProfitability(),
    enabled,
    staleTime: 60_000,
  })
}
