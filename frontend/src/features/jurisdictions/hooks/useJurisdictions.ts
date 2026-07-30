import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jurisdictionsApi } from '../api'
import { jurisdictionsKeys } from '../queryKeys'
import type {
  CreateJurisdictionInput,
  ListJurisdictionsParams,
  UpdateJurisdictionInput,
} from '../types'
import { toJurisdictionOptions } from '../utils'

export function useJurisdictions(params?: ListJurisdictionsParams) {
  return useQuery({
    queryKey: jurisdictionsKeys.list(params),
    queryFn: () => jurisdictionsApi.list(params),
  })
}

export function useJurisdictionByCode(code: string | undefined) {
  return useQuery({
    queryKey: jurisdictionsKeys.detail(code ?? ''),
    queryFn: () => jurisdictionsApi.getByCode(code!),
    enabled: Boolean(code),
  })
}

/** Active jurisdictions as select options (priority first via API sort). */
export function useJurisdictionOptions(params?: ListJurisdictionsParams) {
  const query = useJurisdictions({ activeOnly: true, ...params })
  return {
    ...query,
    options: query.data ? toJurisdictionOptions(query.data) : [],
  }
}

export function useCreateJurisdiction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateJurisdictionInput) => jurisdictionsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: jurisdictionsKeys.lists() }),
  })
}

export function useUpdateJurisdiction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJurisdictionInput }) =>
      jurisdictionsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: jurisdictionsKeys.all }),
  })
}

export function useDeactivateJurisdiction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jurisdictionsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: jurisdictionsKeys.all }),
  })
}
