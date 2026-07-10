import { apiClient } from '@/lib/api-client'

export type EpoRegistryStatus = {
  provider: 'epo'
  configured: boolean
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
