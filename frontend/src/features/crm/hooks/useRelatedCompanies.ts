import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { relatedCompaniesApi } from '../api'
import { clientKeys } from '../queryKeys'

export function useRelatedCompanies(clientId: string) {
  return useQuery({
    queryKey: clientKeys.related(clientId),
    queryFn: () => relatedCompaniesApi.list(clientId),
    enabled: Boolean(clientId),
  })
}

export function useCreateRelatedCompany(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      relatedCompaniesApi.create(clientId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.related(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.history(clientId) })
    },
  })
}

export function useDeleteRelatedCompany(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (relId: string) => relatedCompaniesApi.remove(clientId, relId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.related(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) })
    },
  })
}
