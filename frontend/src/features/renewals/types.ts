import type { MatterType } from '@/features/matters/types'

export type RenewalStatus =
  | 'upcoming'
  | 'instructed'
  | 'filed'
  | 'completed'
  | 'lapsed'

export type RenewalInstructionDecision = 'proceed' | 'abandon'

export type RenewalPart = {
  id: string
  renewalWindowId: string
  jurisdiction: string
  niceClasses: number[]
  status: RenewalStatus
  officialFee: number | null
  serviceFee: number | null
  currency: string
  dueDate: string | null
  graceDate: string | null
  notes: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type RenewalWindow = {
  id: string
  ipRightId: string
  matterId: string
  clientId: string
  cycleNumber: number
  jurisdiction: string
  dueDate: string
  graceDate: string | null
  status: RenewalStatus
  completedAt: string | null
  createdAt: string
  updatedAt: string
  ipRight: {
    id: string
    title: string
    registrationNumber: string | null
    jurisdiction?: string
    rightType?: MatterType
  }
  parts?: RenewalPart[]
}

export type RenewalWorklistItem = RenewalWindow & {
  matter: {
    id: string
    title: string
    matterType: MatterType
    assignedTo: { id: string; fullName: string; email: string } | null
    client: {
      id: string
      type: string
      internalCode: string | null
      companyName: string | null
      firstName: string | null
      lastName: string | null
    }
  }
}

export type RenewalListResponse = {
  items: RenewalWorklistItem[]
  nextCursor: string | null
}

export type RegisterIpRightInput = {
  registrationNumber: string
  registrationDate: string
  expiryDate?: string
}

export type InstructRenewalInput = {
  decision: RenewalInstructionDecision
  notes?: string
}

export type CompleteRenewalInput = {
  officialFeeAmount?: number
  serviceFeeAmount?: number
  paidAt?: string
  proofDocumentVersionId?: string
}

export type SplitRenewalPartInput = {
  jurisdiction: string
  niceClasses?: number[]
  officialFee?: number
  serviceFee?: number
  notes?: string
}

export type SplitRenewalWindowInput = {
  parts: SplitRenewalPartInput[]
}

export type RecordRenewalPartPaymentInput = {
  amount: number
  currency?: string
  paidAt?: string
  proofDocumentVersionId?: string
}

export type RenewalFilters = {
  status?: RenewalStatus
  jurisdiction?: string
  assignedToId?: string
  dueBefore?: string
  limit?: number
  cursor?: string
}
