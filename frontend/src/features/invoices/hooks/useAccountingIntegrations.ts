import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  accountingIntegrationsApi,
  type AccountingSyncProvider,
  type UpsertAccountingCredentialsInput,
} from '../accounting-integrations-api'

export const accountingIntegrationKeys = {
  all: ['accounting-integrations'] as const,
  provider: (provider: AccountingSyncProvider) =>
    [...accountingIntegrationKeys.all, provider] as const,
}

export function useAccountingCredentials(provider: AccountingSyncProvider) {
  return useQuery({
    queryKey: accountingIntegrationKeys.provider(provider),
    queryFn: () => accountingIntegrationsApi.get(provider),
  })
}

export function useUpsertAccountingCredentials(provider: AccountingSyncProvider) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertAccountingCredentialsInput) =>
      accountingIntegrationsApi.upsert(provider, data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: accountingIntegrationKeys.provider(provider),
      })
    },
  })
}

export function useClearAccountingCredentials(provider: AccountingSyncProvider) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => accountingIntegrationsApi.clear(provider),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: accountingIntegrationKeys.provider(provider),
      })
    },
  })
}

export function useEnqueueAccountingSync(provider: AccountingSyncProvider) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => accountingIntegrationsApi.sync(provider),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: accountingIntegrationKeys.provider(provider),
      })
    },
  })
}
