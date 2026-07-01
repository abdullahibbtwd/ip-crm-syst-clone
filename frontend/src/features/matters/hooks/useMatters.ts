import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { correspondenceKeys } from '@/features/correspondence/queryKeys'
import { mattersApi } from '../api'
import { matterKeys } from '../queryKeys'
import type {
  CreateIpRightInput,
  CreateMatterInput,
  FileIpRightInput,
  MatterFilters,
  MatterDetail,
  UpdateMatterInput,
} from '../types'

export function useMatters(filters?: MatterFilters) {
  return useQuery({
    queryKey: matterKeys.list(filters ?? {}),
    queryFn: () => mattersApi.list(filters),
  })
}

export function useMatter(id: string) {
  return useQuery({
    queryKey: matterKeys.detail(id),
    queryFn: () => mattersApi.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateMatter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMatterInput) => mattersApi.create(data),
    onSuccess: (matter: MatterDetail) => {
      qc.invalidateQueries({ queryKey: matterKeys.lists() })
      qc.invalidateQueries({ queryKey: matterKeys.list({ clientId: matter.clientId }) })
    },
  })
}

export function useUpdateMatter(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateMatterInput) => mattersApi.update(id, data),
    onSuccess: (matter: MatterDetail) => {
      qc.invalidateQueries({ queryKey: matterKeys.detail(id) })
      qc.invalidateQueries({ queryKey: matterKeys.lists() })
      qc.invalidateQueries({ queryKey: matterKeys.list({ clientId: matter.clientId }) })
    },
  })
}

export function useMatterIpRights(matterId: string) {
  return useQuery({
    queryKey: matterKeys.ipRights(matterId),
    queryFn: () => mattersApi.listIpRights(matterId),
    enabled: Boolean(matterId),
  })
}

export function useCreateIpRight(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIpRightInput) => mattersApi.createIpRight(matterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: matterKeys.ipRights(matterId) })
      qc.invalidateQueries({ queryKey: matterKeys.detail(matterId) })
    },
  })
}

export function useFileIpRight(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ipRightId,
      data,
    }: {
      ipRightId: string
      data: FileIpRightInput
    }) => mattersApi.fileIpRight(matterId, ipRightId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: matterKeys.ipRights(matterId) })
      qc.invalidateQueries({ queryKey: matterKeys.detail(matterId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(matterId) })
    },
  })
}
