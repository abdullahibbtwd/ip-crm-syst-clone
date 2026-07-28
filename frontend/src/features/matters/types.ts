import type { Paginated } from '@/features/crm/types'

export type MatterType =
  | 'trademark'
  | 'patent'
  | 'utility_model'
  | 'industrial_design'
  | 'copyright'
  | 'geographical_indication'
  | 'border_measures'
  | 'fto_analysis'
  | 'valuation'
  | 'dispute_opposition'

export type MatterStatus = 'draft' | 'active' | 'on_hold' | 'closed' | 'abandoned'

export type MatterJurisdictionStatus = 'pending' | 'filed' | 'approved' | 'rejected'

export type IpRightStatus = 'pending' | 'filed' | 'registered' | 'expired' | 'cancelled'

export type MatterUser = {
  id: string
  fullName: string
  email: string
}

export type MatterJurisdiction = {
  id: string
  countryCode: string
  localRefNumber: string | null
  status: MatterJurisdictionStatus
}

export type MatterListItem = {
  id: string
  clientId: string
  matterType: MatterType
  title: string
  status: MatterStatus
  description: string | null
  createdAt: string
  updatedAt: string
  assignedTo: MatterUser | null
  jurisdictions: MatterJurisdiction[]
  client: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
    type: string
  }
  upcomingDeadlineCount?: number
}

export type MatterDetail = MatterListItem & {
  filedBy: MatterUser | null
  attributes: { matterId: string; attributes: Record<string, unknown>; updatedAt: string } | null
  ipRights: IpRight[]
}

export type IpRightFilingDocument = {
  id: string
  version: number
  fileName: string
  document: { id: string; displayName: string; category: string }
}

export type IpRight = {
  id: string
  matterId: string
  clientId: string
  rightType: MatterType
  title: string
  applicationNumber: string | null
  registrationNumber: string | null
  filingDate: string | null
  registrationDate: string | null
  expiryDate: string | null
  jurisdiction: string
  status: IpRightStatus
  filingDocumentVersionId: string | null
  filingDocumentVersion: IpRightFilingDocument | null
  attributes: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type MatterFilters = {
  clientId?: string
  status?: MatterStatus
  matterType?: MatterType
  assignedToId?: string
  search?: string
  page?: number
  limit?: number
  cursor?: string
}

export type MatterListResponse = Paginated<MatterListItem>

export type CreateMatterInput = {
  clientId: string
  matterType: MatterType
  title: string
  status?: MatterStatus
  assignedToId?: string
  description?: string
  jurisdictions?: Array<{
    countryCode: string
    localRefNumber?: string
    status?: MatterJurisdictionStatus
  }>
  attributes?: Record<string, unknown>
}

export type UpdateMatterInput = Partial<
  Omit<CreateMatterInput, 'clientId'>
> & {
  assignedToId?: string | null
  description?: string | null
}

export type CreateIpRightInput = {
  rightType: MatterType
  title: string
  applicationNumber?: string
  registrationNumber?: string
  filingDate?: string
  registrationDate?: string
  expiryDate?: string
  jurisdiction: string
  status?: IpRightStatus
  attributes?: Record<string, unknown>
}

export type FileIpRightInput = {
  documentVersionId: string
  filingDate: string
  applicationNumber: string
  jurisdiction?: string
}
