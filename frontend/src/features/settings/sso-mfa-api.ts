import { apiClient } from '@/lib/api-client'

export type SsoCredentialSource = 'database' | 'env' | 'none'

export type SsoProviderStatus = {
  id: 'microsoft' | 'google'
  name: string
  enabled: boolean
  redirectUri?: string
}

export type SsoMfaSettings = {
  providers: SsoProviderStatus[]
  microsoft: {
    clientIdConfigured: boolean
    clientIdLastFour: string | null
    clientId: string | null
    clientSecretConfigured: boolean
    clientSecretLastFour: string | null
    tenantId: string
    source: SsoCredentialSource
    redirectUri?: string
  }
  google: {
    clientIdConfigured: boolean
    clientIdLastFour: string | null
    clientId: string | null
    clientSecretConfigured: boolean
    clientSecretLastFour: string | null
    source: SsoCredentialSource
    redirectUri?: string
  }
  mfa: {
    requireInternal: boolean
  }
}

export type UpsertSsoMfaSettingsInput = {
  microsoftClientId?: string
  microsoftClientSecret?: string
  microsoftTenantId?: string
  googleClientId?: string
  googleClientSecret?: string
  requireMfaForInternal?: boolean
}

export const ssoMfaSettingsApi = {
  get: () => apiClient.get<SsoMfaSettings>('/settings/sso-mfa'),
  upsert: (data: UpsertSsoMfaSettingsInput) =>
    apiClient.put<SsoMfaSettings>('/settings/sso-mfa', data),
}
