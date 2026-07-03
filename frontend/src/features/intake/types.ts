export type IntakeStatus =
  | 'new'
  | 'reviewing'
  | 'conflict_check'
  | 'conflict_flagged'
  | 'approved'
  | 'rejected'
  | 'converted'

export type IntakeEnquirerType = 'company' | 'individual'
export type IntakeUrgency = 'normal' | 'urgent'
export type IntakeReferralSource =
  | 'email'
  | 'phone'
  | 'referral'
  | 'walk_in'
  | 'website'
  | 'other'

export type IntakeMatterType =
  | 'trademark'
  | 'patent'
  | 'utility_model'
  | 'design'
  | 'other'

export type IntakeSource = 'internal' | 'portal'

export type CounterpartyRelationship =
  | 'competitor'
  | 'adverse_party'
  | 'licensor'
  | 'licensee'

export type Counterparty = {
  id: string
  name: string | null
  company: string | null
  relationship: CounterpartyRelationship
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ConflictHit = {
  entityType:
    | 'client'
    | 'contact'
    | 'related_company'
    | 'counterparty'
    | 'matter'
    | 'ip_right'
    | 'sign'
  entityId: string
  label: string
  matchField: string
  matchedTerm?: string
  similarity?: number
}

export type IntakeConflictCheck = {
  id: string
  result: 'pending' | 'clear' | 'flagged'
  hits: ConflictHit[]
  resolution: 'pending' | 'approved' | 'rejected' | 'overridden'
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
  resolvedBy: { id: string; fullName: string } | null
}

export type IntakeLead = {
  id: string
  status: IntakeStatus
  enquirerType: IntakeEnquirerType
  companyName: string | null
  fullName: string | null
  country: string | null
  email: string | null
  phone: string | null
  matterType: IntakeMatterType
  description: string
  urgency: IntakeUrgency
  referralSource: IntakeReferralSource
  referredBy: string | null
  notes: string | null
  source: IntakeSource
  createdAt: string
  updatedAt: string
  assignedUser: { id: string; fullName: string; email: string } | null
  createdBy: { id: string; fullName: string; email: string }
  submittedClient: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
    type: string
  } | null
  convertedClient: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
    type: string
  } | null
  convertedMatter: {
    id: string
    title: string
    matterType: string
    status: string
  } | null
  counterparties: Counterparty[]
  conflictChecks: IntakeConflictCheck[]
}

export type IntakeListResponse = {
  items: IntakeLead[]
  nextCursor?: string
}

export type IntakeFilters = {
  search?: string
  status?: IntakeStatus
  limit?: number
  cursor?: string
}
