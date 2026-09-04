import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthReady } from '@/features/auth/AuthProvider'
import { intakeApi } from '@/features/intake/api'
import { intakeKeys } from '@/features/intake/queryKeys'
import type { IntakeFilters } from '../types'
import type { ConvertIntakeFormValues, CreateIntakeFormValues, CounterpartyFormValues } from '../schemas'

export function useIntakeLeads(filters?: IntakeFilters) {
  return useQuery({
    queryKey: intakeKeys.list(filters ?? {}),
    queryFn: () => intakeApi.list(filters),
  })
}

export function useIntakeLead(id: string) {
  return useQuery({
    queryKey: intakeKeys.detail(id),
    queryFn: () => intakeApi.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateIntake() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIntakeFormValues) => intakeApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intakeKeys.lists() })
      qc.invalidateQueries({ queryKey: intakeKeys.pendingCount() })
    },
  })
}

export function useUpdateMyIntake(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIntakeFormValues) => intakeApi.updateMine(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intakeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: intakeKeys.lists() })
      qc.invalidateQueries({ queryKey: intakeKeys.pendingCount() })
    },
  })
}

export function useIntakePendingCount(enabled = true) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: intakeKeys.pendingCount(),
    queryFn: () => intakeApi.pendingCount(),
    enabled: enabled && authReady,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useRunConflictCheck(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => intakeApi.runConflictCheck(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intakeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: intakeKeys.lists() })
    },
  })
}

export function useResolveConflict(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      decision: 'approved' | 'rejected' | 'overridden'
      note?: string
    }) => intakeApi.resolveConflict(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intakeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: intakeKeys.lists() })
    },
  })
}

export function useConvertIntake(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ConvertIntakeFormValues) => intakeApi.convert(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intakeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: intakeKeys.lists() })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['matters'] })
    },
  })
}

export function useAddCounterparty(intakeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CounterpartyFormValues) => intakeApi.addCounterparty(intakeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intakeKeys.detail(intakeId) })
    },
  })
}

export function useRemoveCounterparty(intakeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (counterpartyId: string) =>
      intakeApi.removeCounterparty(intakeId, counterpartyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intakeKeys.detail(intakeId) })
    },
  })
}
