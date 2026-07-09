import { useMutation, useQuery } from '@tanstack/react-query'
import { complianceApi } from '../api'

export function useClientDataAccess(clientId: string) {
  return useQuery({
    queryKey: ['compliance', 'data-access', clientId],
    queryFn: () => complianceApi.getClientDataAccess(clientId),
    enabled: Boolean(clientId),
  })
}

export function useDataExports(clientId?: string) {
  return useQuery({
    queryKey: ['compliance', 'data-exports', clientId ?? 'all'],
    queryFn: () => complianceApi.listDataExports({ clientId, limit: 50 }),
  })
}

export function useAuditTrail(params?: Parameters<typeof complianceApi.listAuditTrail>[0]) {
  return useQuery({
    queryKey: ['compliance', 'audit', params ?? {}],
    queryFn: () => complianceApi.listAuditTrail(params),
  })
}

export function useExportClientData(clientId: string) {
  return useMutation({
    mutationFn: () => complianceApi.exportClientData(clientId),
  })
}
