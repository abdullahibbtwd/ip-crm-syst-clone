import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from '@/features/billing/queryKeys'
import { correspondenceKeys } from '@/features/correspondence/queryKeys'
import { deadlineKeys } from '@/features/deadlines/queryKeys'
import { invoiceKeys } from '@/features/invoices/queryKeys'
import { notificationKeys } from '@/features/notifications/queryKeys'
import { mattersApi } from '../api'
import { matterKeys } from '../queryKeys'
import type { TrademarkActionInput } from '../trademark-actions'
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

export function useMatterShelfCounts(enabled = true) {
  return useQuery({
    queryKey: matterKeys.shelfCounts(),
    queryFn: () => mattersApi.shelfCounts(),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useMatter(id: string) {
  return useQuery({
    queryKey: matterKeys.detail(id),
    queryFn: () => mattersApi.get(id),
    enabled: Boolean(id),
  })
}

export function useMatterTabCounts(id: string) {
  return useQuery({
    queryKey: matterKeys.tabCounts(id),
    queryFn: () => mattersApi.tabCounts(id),
    enabled: Boolean(id),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })
}

export function useCreateMatter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMatterInput) => mattersApi.create(data),
    onSuccess: (matter: MatterDetail) => {
      qc.invalidateQueries({ queryKey: matterKeys.lists() })
      qc.invalidateQueries({ queryKey: matterKeys.shelfCounts() })
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
      qc.invalidateQueries({ queryKey: matterKeys.shelfCounts() })
      qc.invalidateQueries({ queryKey: matterKeys.list({ clientId: matter.clientId }) })
    },
  })
}

export function useArchiveMatter(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => mattersApi.archive(id),
    onSuccess: (matter: MatterDetail) => {
      qc.invalidateQueries({ queryKey: matterKeys.detail(id) })
      qc.invalidateQueries({ queryKey: matterKeys.lists() })
      qc.invalidateQueries({ queryKey: matterKeys.shelfCounts() })
      qc.invalidateQueries({ queryKey: matterKeys.list({ clientId: matter.clientId }) })
    },
  })
}

export function useRestoreMatter(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => mattersApi.restore(id),
    onSuccess: (matter: MatterDetail) => {
      qc.invalidateQueries({ queryKey: matterKeys.detail(id) })
      qc.invalidateQueries({ queryKey: matterKeys.lists() })
      qc.invalidateQueries({ queryKey: matterKeys.shelfCounts() })
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

export function useRecordTrademarkAction(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TrademarkActionInput) =>
      mattersApi.recordTrademarkAction(matterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: matterKeys.detail(matterId) })
      qc.invalidateQueries({ queryKey: matterKeys.tabCounts(matterId) })
      qc.invalidateQueries({ queryKey: matterKeys.lists() })
      qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(matterId) })
      qc.invalidateQueries({ queryKey: deadlineKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: deadlineKeys.my() })
      qc.invalidateQueries({ queryKey: deadlineKeys.firm() })
      qc.invalidateQueries({ queryKey: deadlineKeys.myTodayCount() })
      qc.invalidateQueries({ queryKey: deadlineKeys.firmTodayCount() })
      qc.invalidateQueries({ queryKey: invoiceKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: billingKeys.matter(matterId) })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
