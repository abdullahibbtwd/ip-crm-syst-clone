import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvalsApi } from '../api'
import { approvalKeys } from '../queryKeys'
import type {
  CreateApprovalInput,
  DecideApprovalInput,
  UpdateApprovalInput,
} from '../types'

export function useMatterApprovals(matterId: string) {
  return useQuery({
    queryKey: approvalKeys.matter(matterId),
    queryFn: () => approvalsApi.listForMatter(matterId),
    enabled: Boolean(matterId),
  })
}

export function useCreateApproval(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateApprovalInput) => approvalsApi.create(matterId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: approvalKeys.matter(matterId) }),
  })
}

export function useUpdateApproval(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApprovalInput }) =>
      approvalsApi.update(matterId, id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: approvalKeys.matter(matterId) }),
  })
}

export function useSubmitApproval(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approvalsApi.submit(matterId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: approvalKeys.portal() })
    },
  })
}

export function usePortalApprovals() {
  return useQuery({
    queryKey: approvalKeys.portal(),
    queryFn: () => approvalsApi.portalList(),
  })
}

export function useDecideApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DecideApprovalInput }) =>
      approvalsApi.portalDecide(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.portal() })
      qc.invalidateQueries({ queryKey: approvalKeys.all })
    },
  })
}
