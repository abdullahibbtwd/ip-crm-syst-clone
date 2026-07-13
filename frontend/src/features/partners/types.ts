export type Partner = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  countryCode: string | null
  jurisdictions: string[]
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ListPartnersParams = {
  activeOnly?: boolean
  search?: string
}

export type CreatePartnerInput = {
  name: string
  company?: string
  email?: string
  phone?: string
  countryCode?: string
  jurisdictions?: string[]
  notes?: string
}

export type UpdatePartnerInput = {
  name?: string
  company?: string | null
  email?: string | null
  phone?: string | null
  countryCode?: string | null
  jurisdictions?: string[]
  notes?: string | null
  isActive?: boolean
}

export type PartnerInstructionStatus = 'draft' | 'sent' | 'acknowledged' | 'complete'

export type PartnerInstructionUser = {
  id: string
  fullName: string
  email: string
}

export type PartnerInstructionDeadline = {
  id: string
  title: string
  dueDate: string
}

export type PartnerInstruction = {
  id: string
  matterId: string
  partnerId: string
  title: string
  body: string | null
  status: PartnerInstructionStatus
  deadlineId: string | null
  createdById: string
  sentAt: string | null
  acknowledgedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  partner: Partner
  deadline: PartnerInstructionDeadline | null
  createdBy: PartnerInstructionUser
}

export type ListPartnerInstructionsParams = {
  status?: PartnerInstructionStatus
}

export type CreatePartnerInstructionInput = {
  partnerId: string
  title: string
  body?: string
  deadlineId?: string
}

export type UpdatePartnerInstructionInput = {
  title?: string
  body?: string | null
  deadlineId?: string | null
}

export type TransitionPartnerInstructionInput = {
  status: PartnerInstructionStatus
}
