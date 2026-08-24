import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { partnerInstructionsApi, partnersApi } from '../api'
import { partnerInstructionsKeys, partnersKeys } from '../queryKeys'
import { matterKeys } from '@/features/matters/queryKeys'
import type {
  CreatePartnerInput,
  CreatePartnerInstructionInput,
  ListPartnerInstructionsParams,
  ListPartnersParams,
  PartnerInstructionStatus,
  UpdatePartnerInput,
} from '../types'

export function usePartners(params?: ListPartnersParams) {
  return useQuery({
    queryKey: partnersKeys.list(params),
    queryFn: () => partnersApi.list(params),
  })
}

export function useCreatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePartnerInput) => partnersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnersKeys.lists() }),
  })
}

export function useUpdatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePartnerInput }) =>
      partnersApi.update(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: partnersKeys.lists() })
      qc.invalidateQueries({ queryKey: partnersKeys.detail(vars.id) })
    },
  })
}

export function useDeactivatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => partnersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnersKeys.lists() }),
  })
}

export function useMatterPartnerInstructions(
  matterId: string,
  params?: ListPartnerInstructionsParams,
) {
  return useQuery({
    queryKey: partnerInstructionsKeys.matter(matterId, params),
    queryFn: () => partnerInstructionsApi.listForMatter(matterId, params),
    enabled: Boolean(matterId),
  })
}

export function useCreatePartnerInstruction(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePartnerInstructionInput) =>
      partnerInstructionsApi.create(matterId, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...partnerInstructionsKeys.all, 'matter', matterId],
      })
      qc.invalidateQueries({ queryKey: matterKeys.tabCounts(matterId) })
    },
  })
}

export function useTransitionPartnerInstruction(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: PartnerInstructionStatus
    }) => partnerInstructionsApi.transition(matterId, id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...partnerInstructionsKeys.all, 'matter', matterId],
      })
      qc.invalidateQueries({ queryKey: matterKeys.tabCounts(matterId) })
    },
  })
}
