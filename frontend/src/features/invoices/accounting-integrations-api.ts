import { apiClient } from '@/lib/api-client'

export type AccountingSyncProvider = 'xero' | 'quickbooks'

export type AccountingCredentialsStatus = {
  provider: AccountingSyncProvider
  configured: boolean
  clientId: {
    configured: boolean
    value: string | null
    lastFour: string | null
  }
  clientSecret: { configured: boolean; lastFour: string | null }
  accessToken: { configured: boolean; lastFour: string | null }
  orgId: string | null
  lastSyncAt: string | null
  updatedAt: string | null
}

export type UpsertAccountingCredentialsInput = {
  clientId?: string
  clientSecret?: string
  accessToken?: string
  orgId?: string
}

export type AccountingSyncQueued = {
  queued: true
  provider: AccountingSyncProvider
  jobId: string | number | undefined
  message: string
}

export const accountingIntegrationsApi = {
  get: (provider: AccountingSyncProvider) =>
    apiClient.get<AccountingCredentialsStatus>(
      `/settings/integrations/${provider}`,
    ),

  upsert: (provider: AccountingSyncProvider, data: UpsertAccountingCredentialsInput) =>
    apiClient.put<AccountingCredentialsStatus>(
      `/settings/integrations/${provider}`,
      data,
    ),

  clear: (provider: AccountingSyncProvider) =>
    apiClient.delete<AccountingCredentialsStatus>(
      `/settings/integrations/${provider}`,
    ),

  sync: (provider: AccountingSyncProvider) =>
    apiClient.post<AccountingSyncQueued>(
      `/settings/integrations/${provider}/sync`,
    ),
}
