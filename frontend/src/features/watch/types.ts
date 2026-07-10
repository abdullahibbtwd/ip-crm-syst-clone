export type WatchProfileStatus = 'active' | 'paused' | 'archived'
export type WatchFrequency = 'daily' | 'weekly'
export type WatchAlertStatus = 'new' | 'rejected' | 'accepted'
export type WatchRegistrySource = 'BPO' | 'EUIPO' | 'WIPO' | 'EPO'

export type WatchClientSummary = {
  id: string
  internalCode: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  type: string
}

export type WatchUserSummary = {
  id: string
  fullName: string
  email: string
}

export type WatchProfile = {
  id: string
  clientId: string
  markText: string
  jurisdictions: string[]
  niceClasses: number[]
  frequency: WatchFrequency
  status: WatchProfileStatus
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy?: WatchUserSummary
  client?: WatchClientSummary
  _count?: { alerts: number }
}

export type WatchAlert = {
  id: string
  watchProfileId: string
  clientId: string
  conflictingMark: string
  source: WatchRegistrySource
  jurisdiction: string | null
  applicationNumber: string | null
  status: WatchAlertStatus
  matterId: string | null
  detectedAt: string
  triagedAt: string | null
  triagedById: string | null
  createdAt: string
  updatedAt: string
  watchProfile?: Pick<
    WatchProfile,
    'id' | 'markText' | 'jurisdictions' | 'niceClasses' | 'status'
  > & { createdBy?: WatchUserSummary }
  client?: WatchClientSummary
  triagedBy?: WatchUserSummary | null
  matter?: { id: string; title: string; status: string } | null
}

export type WatchProfileListResponse = { items: WatchProfile[] }
export type WatchAlertListResponse = {
  items: WatchAlert[]
  newCount: number
  acceptedCount: number
  rejectedCount: number
  nextCursor: string | null
}

export type WatchAlertFilters = {
  status?: WatchAlertStatus
  clientId?: string
  jurisdiction?: string
  source?: WatchRegistrySource
  limit?: number
  cursor?: string
}

export type CreateWatchProfileInput = {
  markText: string
  jurisdictions: string[]
  niceClasses?: number[]
  frequency?: WatchFrequency
}

export type CreateMockWatchAlertInput = {
  watchProfileId?: string
  clientId?: string
  conflictingMark?: string
  source?: WatchRegistrySource
  jurisdiction?: string
  applicationNumber?: string
}

export type AcceptWatchAlertResponse = {
  alert: WatchAlert
  matter: { id: string; title: string; status: string }
}
