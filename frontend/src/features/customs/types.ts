export type CustomsSeizureStatus = 'active' | 'released' | 'destroyed' | 'expired'

export type CustomsApplicationStatus = 'submitted' | 'active' | 'expired' | 'renewed'

export type CustodyAction =
  | 'received'
  | 'photographed'
  | 'sampled'
  | 'transferred'
  | 'destroyed'
  | 'returned'

export type CustomsUser = {
  id: string
  fullName: string
  email: string
}

export type CustomsSeizure = {
  id: string
  matterId: string
  clientId: string
  seizureDate: string
  customsOffice: string
  consignmentReference: string | null
  goodsDescription: string
  quantity: string | null
  portOfEntry: string | null
  status: CustomsSeizureStatus
  linkedMatterId: string | null
  linkedMatter: { id: string; title: string; matterType: string } | null
  createdById: string
  createdBy: CustomsUser
  createdAt: string
  updatedAt: string
  custodyCount?: number
  applicationCount?: number
}

export type CustodyLogEntry = {
  id: string
  action: CustodyAction
  occurredAt: string
  notes: string | null
  actorUser: CustomsUser
  documentVersion: { id: string; fileName: string; documentId: string } | null
  createdAt: string
}

export type CustomsApplication = {
  id: string
  matterId: string
  seizureId: string | null
  authority: string
  applicationNumber: string | null
  submittedDate: string | null
  validFrom: string | null
  validUntil: string | null
  status: CustomsApplicationStatus
  renewalOfId: string | null
  createdById: string
  createdBy: CustomsUser
  createdAt: string
  updatedAt: string
}

export type CustomsSeizureDetail = CustomsSeizure & {
  custodyLogs: CustodyLogEntry[]
  applications: CustomsApplication[]
}

export type CreateCustomsSeizureInput = {
  seizureDate: string
  customsOffice: string
  goodsDescription: string
  consignmentReference?: string
  quantity?: string
  portOfEntry?: string
}

export type UpdateCustomsSeizureInput = {
  seizureDate?: string
  customsOffice?: string
  goodsDescription?: string
  consignmentReference?: string | null
  quantity?: string | null
  portOfEntry?: string | null
  status?: CustomsSeizureStatus
  linkedMatterId?: string | null
}

export type CreateCustodyLogInput = {
  action: CustodyAction
  occurredAt: string
  notes?: string
  documentVersionId?: string
}

export type CreateCustomsApplicationInput = {
  authority: string
  seizureId?: string
  applicationNumber?: string
  submittedDate?: string
  validFrom?: string
  validUntil?: string
  renewalOfId?: string
}

export type UpdateCustomsApplicationInput = {
  authority?: string
  seizureId?: string | null
  applicationNumber?: string | null
  submittedDate?: string | null
  validFrom?: string | null
  validUntil?: string | null
  status?: CustomsApplicationStatus
}

export const CUSTODY_ACTION_LABELS: Record<CustodyAction, string> = {
  received: 'Received',
  photographed: 'Photographed',
  sampled: 'Sampled',
  transferred: 'Transferred',
  destroyed: 'Destroyed',
  returned: 'Returned',
}

export const SEIZURE_STATUS_LABELS: Record<CustomsSeizureStatus, string> = {
  active: 'Active',
  released: 'Released',
  destroyed: 'Destroyed',
  expired: 'Expired',
}

export const APPLICATION_STATUS_LABELS: Record<CustomsApplicationStatus, string> = {
  submitted: 'Submitted',
  active: 'Active',
  expired: 'Expired',
  renewed: 'Renewed',
}
