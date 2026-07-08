import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '../api'
import { billingKeys } from '../queryKeys'
import type {
  CreateFixedFeeInput,
  CreateRateCardInput,
  CreateTimeEntryInput,
  UpdateFixedFeeInput,
  UpdateRateCardInput,
  UpdateTimeEntryInput,
} from '../types'

function invalidateMatterBilling(qc: ReturnType<typeof useQueryClient>, matterId: string) {
  qc.invalidateQueries({ queryKey: billingKeys.timeEntries(matterId) })
  qc.invalidateQueries({ queryKey: billingKeys.fixedFees(matterId) })
  qc.invalidateQueries({ queryKey: billingKeys.summary(matterId) })
}

export function useBillingSummary(matterId: string) {
  return useQuery({
    queryKey: billingKeys.summary(matterId),
    queryFn: () => billingApi.getSummary(matterId),
    enabled: Boolean(matterId),
  })
}

export function useClientBillingSummary(clientId: string) {
  return useQuery({
    queryKey: billingKeys.clientSummary(clientId),
    queryFn: () => billingApi.getClientSummary(clientId),
    enabled: Boolean(clientId),
  })
}

export function useMatterTimeEntries(matterId: string) {
  return useQuery({
    queryKey: billingKeys.timeEntries(matterId),
    queryFn: () => billingApi.listTimeEntries(matterId),
    enabled: Boolean(matterId),
  })
}

export function useMatterFixedFees(matterId: string) {
  return useQuery({
    queryKey: billingKeys.fixedFees(matterId),
    queryFn: () => billingApi.listFixedFees(matterId),
    enabled: Boolean(matterId),
  })
}

export function useResolveRate(matterId: string, enabled: boolean) {
  return useQuery({
    queryKey: billingKeys.resolveRate(matterId),
    queryFn: () => billingApi.resolveRate(matterId),
    enabled: Boolean(matterId) && enabled,
    staleTime: 60_000,
  })
}

export function useCreateTimeEntry(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTimeEntryInput) =>
      billingApi.createTimeEntry(matterId, data),
    onSuccess: () => invalidateMatterBilling(qc, matterId),
  })
}

export function useUpdateTimeEntry(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTimeEntryInput }) =>
      billingApi.updateTimeEntry(id, data),
    onSuccess: () => invalidateMatterBilling(qc, matterId),
  })
}

export function useDeleteTimeEntry(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => billingApi.deleteTimeEntry(id),
    onSuccess: () => invalidateMatterBilling(qc, matterId),
  })
}

export function useCreateFixedFee(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFixedFeeInput) =>
      billingApi.createFixedFee(matterId, data),
    onSuccess: () => invalidateMatterBilling(qc, matterId),
  })
}

export function useUpdateFixedFee(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFixedFeeInput }) =>
      billingApi.updateFixedFee(id, data),
    onSuccess: () => invalidateMatterBilling(qc, matterId),
  })
}

export function useDeleteFixedFee(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => billingApi.deleteFixedFee(id),
    onSuccess: () => invalidateMatterBilling(qc, matterId),
  })
}

export function useRateCards() {
  return useQuery({
    queryKey: billingKeys.rateCards(),
    queryFn: () => billingApi.listRateCards(),
  })
}

export function useCreateRateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRateCardInput) => billingApi.createRateCard(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.rateCards() }),
  })
}

export function useUpdateRateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRateCardInput }) =>
      billingApi.updateRateCard(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: billingKeys.rateCards() }),
  })
}

export function useBillingOverview() {
  return useQuery({
    queryKey: billingKeys.overview(),
    queryFn: () => billingApi.getOverview(),
    staleTime: 30_000,
  })
}
