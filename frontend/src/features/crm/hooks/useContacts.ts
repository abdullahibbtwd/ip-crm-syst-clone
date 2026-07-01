import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '../api'
import { clientKeys } from '../queryKeys'
import type { ContactRole } from '../types'

export function useContacts(clientId: string, role?: ContactRole) {
  return useQuery({
    queryKey: clientKeys.contacts(clientId, role),
    queryFn: () => contactsApi.list(clientId, role),
    enabled: Boolean(clientId),
  })
}

export function useCreateContact(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => contactsApi.create(clientId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.contacts(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.summary(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) })
    },
  })
}

export function useDeactivateContact(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) => contactsApi.deactivate(clientId, contactId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.contacts(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.summary(clientId) })
    },
  })
}
