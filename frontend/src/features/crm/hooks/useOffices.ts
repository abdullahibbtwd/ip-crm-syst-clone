import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { officesApi } from '../api'
import { clientKeys } from '../queryKeys'
import type { ClientOffice } from '../types'

export function useOffices(clientId: string) {
  return useQuery({
    queryKey: clientKeys.offices(clientId),
    queryFn: () => officesApi.list(clientId),
    enabled: Boolean(clientId),
  })
}

export function useCreateOffice(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ClientOffice>) => officesApi.create(clientId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.offices(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.summary(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.addressInsights(clientId) })
    },
  })
}

export function useSetOfficePrimary(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (officeId: string) =>
      officesApi.update(clientId, officeId, { isPrimary: true }),
    onMutate: async (officeId) => {
      await queryClient.cancelQueries({ queryKey: clientKeys.offices(clientId) })
      const previous = queryClient.getQueryData<ClientOffice[]>(
        clientKeys.offices(clientId),
      )
      queryClient.setQueryData<ClientOffice[]>(clientKeys.offices(clientId), (old) =>
        (old ?? []).map((o) => ({ ...o, isPrimary: o.id === officeId })),
      )
      return { previous, clientId }
    },
    onError: (_err, _officeId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(clientKeys.offices(ctx.clientId), ctx.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.offices(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.summary(clientId) })
    },
  })
}

export function useDeleteOffice(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (officeId: string) => officesApi.remove(clientId, officeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.offices(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.summary(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.addressInsights(clientId) })
    },
  })
}

export function useUpsertTypedAddress(
  clientId: string,
  addressType: 'registered_legal' | 'correspondence',
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ClientOffice>) =>
      officesApi.upsertTyped(clientId, addressType, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientKeys.offices(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.summary(clientId) })
      void queryClient.invalidateQueries({ queryKey: clientKeys.addressInsights(clientId) })
    },
  })
}
