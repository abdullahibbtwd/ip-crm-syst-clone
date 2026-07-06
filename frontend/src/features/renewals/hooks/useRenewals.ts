import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { matterKeys } from '@/features/matters/queryKeys'
import { renewalsApi } from '../api'
import { renewalKeys } from '../queryKeys'
import type {
  CompleteRenewalInput,
  InstructRenewalInput,
  RegisterIpRightInput,
  RenewalFilters,
} from '../types'

export function usePortalRenewals() {
  return useQuery({
    queryKey: [...renewalKeys.all, 'portal'] as const,
    queryFn: () => renewalsApi.listPortal(),
  })
}

export function useRenewals(filters?: RenewalFilters, scope: 'firm' | 'my' = 'firm') {
  return useQuery({
    queryKey: renewalKeys.list(filters ?? {}, scope),
    queryFn: () =>
      scope === 'my' ? renewalsApi.listMy(filters) : renewalsApi.list(filters),
  })
}

export function useIpRightRenewals(matterId: string, ipRightId: string) {
  return useQuery({
    queryKey: renewalKeys.matterIpRight(matterId, ipRightId),
    queryFn: () => renewalsApi.listForIpRight(matterId, ipRightId),
    enabled: Boolean(matterId && ipRightId),
  })
}

export function useRegisterIpRight(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ipRightId,
      data,
    }: {
      ipRightId: string
      data: RegisterIpRightInput
    }) => renewalsApi.registerIpRight(matterId, ipRightId, data),
    onSuccess: (_result, vars) => {
      void qc.invalidateQueries({ queryKey: matterKeys.ipRights(matterId) })
      void qc.invalidateQueries({
        queryKey: renewalKeys.matterIpRight(matterId, vars.ipRightId),
      })
      void qc.invalidateQueries({ queryKey: renewalKeys.lists() })
    },
  })
}

export function useInstructRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InstructRenewalInput }) =>
      renewalsApi.instruct(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: renewalKeys.all })
    },
  })
}

export function useCompleteRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteRenewalInput }) =>
      renewalsApi.complete(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: renewalKeys.all })
      void qc.invalidateQueries({ queryKey: matterKeys.all })
    },
  })
}

export function useMarkRenewalFiled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => renewalsApi.markFiled(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: renewalKeys.all })
    },
  })
}
