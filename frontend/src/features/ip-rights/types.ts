import type { MatterType, IpRightStatus } from '@/features/matters/types'
import type { Paginated } from '@/features/crm/types'

export type IpRightsFilters = {
  clientId?: string
  jurisdiction?: string
  status?: IpRightStatus
  matterType?: MatterType
  expiryFrom?: string
  expiryTo?: string
  limit?: number
  cursor?: string
}

export type IpRightsListItem = {
  id: string
  matterId: string
  matterTitle: string
  matterType: MatterType

  clientId: string
  clientName: string

  title: string
  applicationNumber: string | null
  registrationNumber: string | null
  jurisdiction: string
  status: IpRightStatus

  filingDate: string | null
  expiryDate: string | null
}

export type IpRightsListResponse = Paginated<IpRightsListItem>

