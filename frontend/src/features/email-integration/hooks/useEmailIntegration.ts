import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { correspondenceKeys } from '@/features/correspondence/queryKeys'
import type { CorrespondenceCategory } from '@/features/correspondence/types'
import { deadlineKeys } from '@/features/deadlines/queryKeys'
import { emailIntegrationApi } from '../api'
import { emailIntegrationKeys } from '../queryKeys'

export function useMailboxProviders() {
  return useQuery({
    queryKey: emailIntegrationKeys.providers(),
    queryFn: () => emailIntegrationApi.getProviders(),
  })
}

export function useMailboxConnections() {
  return useQuery({
    queryKey: emailIntegrationKeys.connections(),
    queryFn: () => emailIntegrationApi.listConnections(),
  })
}

export function useEmailQueue() {
  return useQuery({
    queryKey: emailIntegrationKeys.queue(),
    queryFn: () => emailIntegrationApi.listQueue(),
    refetchInterval: 60_000,
  })
}

export function useEmailQueueStats() {
  return useQuery({
    queryKey: emailIntegrationKeys.queueStats(),
    queryFn: () => emailIntegrationApi.queueStats(),
    refetchInterval: 60_000,
  })
}

export function useRevokeMailboxConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => emailIntegrationApi.revokeConnection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.connections() })
    },
  })
}

export function useSyncMailboxNow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => emailIntegrationApi.syncNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.connections() })
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queue() })
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queueStats() })
    },
  })
}

export function useFetchMailboxEmails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => emailIntegrationApi.fetchEmails(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queue() })
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queueStats() })
    },
  })
}

export function useLinkQueuedEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      matterId,
      category,
    }: {
      id: string
      matterId: string
      category?: CorrespondenceCategory
    }) => emailIntegrationApi.linkToMatter(id, matterId, category),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queue() })
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queueStats() })
      qc.invalidateQueries({ queryKey: correspondenceKeys.matter(vars.matterId) })
      qc.invalidateQueries({ queryKey: correspondenceKeys.timeline(vars.matterId) })
      qc.invalidateQueries({ queryKey: deadlineKeys.matter(vars.matterId) })
    },
  })
}

export function useDismissQueuedEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => emailIntegrationApi.dismiss(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queue() })
      qc.invalidateQueries({ queryKey: emailIntegrationKeys.queueStats() })
    },
  })
}
