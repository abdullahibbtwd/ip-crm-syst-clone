import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { correspondenceKeys } from '@/features/correspondence/queryKeys'
import { matterKeys } from '@/features/matters/queryKeys'
import { watchKeys } from '@/features/watch/queryKeys'
import {
  registryApi,
  type UpsertEpoCredentialsInput,
} from '../api'

export const registryKeys = {
  all: ['registry'] as const,
  epoStatus: () => [...registryKeys.all, 'epo-status'] as const,
  epoCredentials: () => [...registryKeys.all, 'epo-credentials'] as const,
}

export function useEpoRegistryStatus() {
  return useQuery({
    queryKey: registryKeys.epoStatus(),
    queryFn: () => registryApi.getEpoStatus(),
  })
}

export function useEpoCredentials() {
  return useQuery({
    queryKey: registryKeys.epoCredentials(),
    queryFn: () => registryApi.getEpoCredentials(),
  })
}

export function useUpsertEpoCredentials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertEpoCredentialsInput) =>
      registryApi.upsertEpoCredentials(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: registryKeys.epoCredentials() })
      void qc.invalidateQueries({ queryKey: registryKeys.epoStatus() })
    },
  })
}

export function useClearEpoCredentials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => registryApi.clearEpoCredentials(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: registryKeys.epoCredentials() })
      void qc.invalidateQueries({ queryKey: registryKeys.epoStatus() })
    },
  })
}

export function useTestEpoConnection() {
  return useMutation({
    mutationFn: (patentNumber?: string) => registryApi.testEpo(patentNumber),
  })
}

export function useScanEpoForClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => registryApi.scanEpoForClient(clientId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: watchKeys.alerts() })
      void qc.invalidateQueries({ queryKey: watchKeys.all })
    },
  })
}

export function useCheckEpoStatus(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ipRightId: string) => registryApi.checkEpoStatus(ipRightId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: matterKeys.ipRights(matterId) })
      void qc.invalidateQueries({ queryKey: matterKeys.detail(matterId) })
      void qc.invalidateQueries({
        queryKey: correspondenceKeys.matter(matterId),
      })
      void qc.invalidateQueries({
        queryKey: correspondenceKeys.timeline(matterId),
      })
    },
  })
}
