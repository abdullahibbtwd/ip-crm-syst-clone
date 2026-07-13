import { apiClient } from '@/lib/api-client'

export type EpoCredentialSource = 'database' | 'env' | 'none'

export type EpoRegistryStatus = {
  provider: 'epo'
  configured: boolean
  source?: EpoCredentialSource
}

export type EpoCredentialsStatus = {
  provider: 'epo'
  configured: boolean
  source: EpoCredentialSource
  consumerKey: { configured: boolean; lastFour: string | null }
  consumerSecret: { configured: boolean; lastFour: string | null }
  apiBaseUrl: string | null
  authUrl: string | null
  updatedAt: string | null
}

export type UpsertEpoCredentialsInput = {
  consumerKey?: string
  consumerSecret?: string
  apiBaseUrl?: string
  authUrl?: string
}

export type EpoTestSuccess = {
  success: true
  patent: {
    title: string | null
    applicant: string | null
    publicationDate: string | null
    publicationNumber: string
  }
}

export type EpoTestFailure = {
  success: false
  error: string
}

export type EpoTestResult = EpoTestSuccess | EpoTestFailure

export type EpoWatchScanResult = {
  success: boolean
  profilesScanned: number
  alertsCreated: number
  errors: number
  message?: string
}

export type EpoStatusCheckResult = {
  success: boolean
  ipRightId: string
  applicationNumber: string | null
  eventsFound: number
  newEvents: number
  correspondenceCreated: number
  message: string
}

export const registryApi = {
  getEpoStatus: () => apiClient.get<EpoRegistryStatus>('/registry/epo/status'),

  getEpoCredentials: () =>
    apiClient.get<EpoCredentialsStatus>('/settings/integrations/epo'),

  upsertEpoCredentials: (data: UpsertEpoCredentialsInput) =>
    apiClient.put<EpoCredentialsStatus>('/settings/integrations/epo', data),

  clearEpoCredentials: () =>
    apiClient.delete<EpoCredentialsStatus>('/settings/integrations/epo'),

  testEpo: (patentNumber?: string) =>
    apiClient.get<EpoTestResult>('/registry/test/epo', {
      patentNumber: patentNumber || undefined,
    }),

  scanEpoForClient: (clientId: string) =>
    apiClient.post<EpoWatchScanResult>(
      `/registry/scan/epo?clientId=${encodeURIComponent(clientId)}`,
    ),

  checkEpoStatus: (ipRightId: string) =>
    apiClient.get<EpoStatusCheckResult>(`/registry/epo/check/${ipRightId}`),
}
