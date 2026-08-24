import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customsApi } from '../api'
import { customsKeys } from '../queryKeys'
import { matterKeys } from '@/features/matters/queryKeys'
import type {
  CreateCustodyLogInput,
  CreateCustomsApplicationInput,
  CreateCustomsSeizureInput,
  UpdateCustomsApplicationInput,
  UpdateCustomsSeizureInput,
} from '../types'

export function useCustomsSeizures(matterId: string) {
  return useQuery({
    queryKey: customsKeys.seizures(matterId),
    queryFn: () => customsApi.listSeizures(matterId),
    enabled: Boolean(matterId),
  })
}

export function useCustomsSeizure(id: string | null) {
  return useQuery({
    queryKey: customsKeys.seizure(id ?? ''),
    queryFn: () => customsApi.getSeizure(id!),
    enabled: Boolean(id),
  })
}

export function useCustomsApplications(matterId: string) {
  return useQuery({
    queryKey: customsKeys.applications(matterId),
    queryFn: () => customsApi.listApplications(matterId),
    enabled: Boolean(matterId),
  })
}

export function useCreateCustomsSeizure(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomsSeizureInput) =>
      customsApi.createSeizure(matterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customsKeys.seizures(matterId) })
      qc.invalidateQueries({ queryKey: matterKeys.tabCounts(matterId) })
    },
  })
}

export function useUpdateCustomsSeizure(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomsSeizureInput }) =>
      customsApi.updateSeizure(id, data),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: customsKeys.seizures(matterId) })
      qc.invalidateQueries({ queryKey: customsKeys.seizure(vars.id) })
    },
  })
}

export function useAddCustodyLog(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      seizureId,
      data,
    }: {
      seizureId: string
      data: CreateCustodyLogInput
    }) => customsApi.addCustody(seizureId, data),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: customsKeys.seizures(matterId) })
      qc.invalidateQueries({ queryKey: customsKeys.seizure(vars.seizureId) })
    },
  })
}

export function useCreateCustomsApplication(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomsApplicationInput) =>
      customsApi.createApplication(matterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customsKeys.applications(matterId) })
      qc.invalidateQueries({ queryKey: customsKeys.seizures(matterId) })
      qc.invalidateQueries({ queryKey: matterKeys.tabCounts(matterId) })
    },
  })
}

export function useUpdateCustomsApplication(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomsApplicationInput }) =>
      customsApi.updateApplication(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customsKeys.applications(matterId) })
    },
  })
}
