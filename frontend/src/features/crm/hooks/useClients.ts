import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-client'
import { clientsApi, clientNotesApi, historyApi } from '../api'
import { clientKeys } from '../queryKeys'
import type { ClientFilters } from '../types'

export { useHoldingGroups, useHoldingGroup } from './useHoldingGroups'

export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: clientKeys.list(filters),
    queryFn: () => clientsApi.list(filters),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => clientsApi.get(id),
    enabled: Boolean(id),
  })
}

export function useClientSummary(id: string) {
  return useQuery({
    queryKey: clientKeys.summary(id),
    queryFn: () => clientsApi.summary(id),
    enabled: Boolean(id),
  })
}

export function useClientAddressInsights(id: string) {
  return useQuery({
    queryKey: clientKeys.addressInsights(id),
    queryFn: () => clientsApi.addressInsights(id),
    enabled: Boolean(id),
  })
}

export function useClientTabCounts(id: string) {
  return useQuery({
    queryKey: clientKeys.tabCounts(id),
    queryFn: () => clientsApi.tabCounts(id),
    enabled: Boolean(id),
  })
}

export function useClientDeadlines(id: string) {
  return useQuery({
    queryKey: clientKeys.deadlines(id),
    queryFn: () => clientsApi.listDeadlines(id),
    enabled: Boolean(id),
  })
}

export function useClientNotes(clientId: string) {
  return useQuery({
    queryKey: clientKeys.notes(clientId),
    queryFn: () => clientNotesApi.list(clientId),
    enabled: Boolean(clientId),
  })
}

export function useCreateClientNote(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => clientNotesApi.create(clientId, { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.notes(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.tabCounts(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.history(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

export function useDeleteClientNote(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => clientNotesApi.remove(clientId, noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.notes(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.tabCounts(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => clientsApi.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.summary(id) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => clientsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

export function useArchiveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clientsApi.archive(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })
}

export function useClientHistory(clientId: string) {
  return useInfiniteQuery({
    queryKey: clientKeys.history(clientId),
    queryFn: ({ pageParam }) =>
      historyApi.list(clientId, { cursor: pageParam as string | undefined, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(clientId),
  })
}

export function useApiMutationError() {
  return (error: unknown) => getApiErrorMessage(error)
}
