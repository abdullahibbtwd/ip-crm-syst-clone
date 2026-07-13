import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ssoMfaSettingsApi,
  type UpsertSsoMfaSettingsInput,
} from './sso-mfa-api'

export const ssoMfaKeys = {
  all: ['sso-mfa-settings'] as const,
  detail: () => [...ssoMfaKeys.all, 'detail'] as const,
}

export function useSsoMfaSettings() {
  return useQuery({
    queryKey: ssoMfaKeys.detail(),
    queryFn: () => ssoMfaSettingsApi.get(),
  })
}

export function useUpsertSsoMfaSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertSsoMfaSettingsInput) => ssoMfaSettingsApi.upsert(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ssoMfaKeys.all })
    },
  })
}
