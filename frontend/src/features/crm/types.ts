export type ClientType = 'company' | 'individual'
export type ClientStatus = 'active' | 'inactive' | 'prospect' | 'archived'
export type ContactRole = 'primary' | 'billing' | 'conflict' | 'general'
export type RelationshipType = 'subsidiary' | 'affiliate' | 'parent'

export type Paginated<T> = {
  items: T[]
  nextCursor: string | null
}

export type HoldingGroup = {
  id: string
  name: string
  description: string | null
  country: string | null
  createdAt: string
  updatedAt: string
}

export type HoldingGroupDetail = HoldingGroup & {
  clients: ClientListItem[]
}

export type ClientListItem = {
  id: string
  type: ClientType
  status: ClientStatus
  internalCode: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  country: string | null
  gdprConsent?: boolean
  gdprConsentDate?: string | null
  createdAt: string
  displayName: string
  assignedUser: { id: string; fullName: string } | null
  holdingGroup: { id: string; name: string } | null
}

export type ClientOffice = {
  id: string
  clientId: string
  label: string
  isPrimary: boolean
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  country: string | null
  phone: string | null
  fax: string | null
  createdAt: string
  updatedAt: string
}

export type Contact = {
  id: string
  clientId: string
  role: ContactRole
  firstName: string
  lastName: string
  title: string | null
  position: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  officeId: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  office?: { id: string; label: string } | null
}

export type RelatedCompany = {
  id: string
  clientId: string
  relatedClientId: string | null
  externalName: string | null
  relationshipType: string
  notes: string | null
  createdAt: string
  relatedClient: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
    type: ClientType
  } | null
}

export type RelationshipHistoryEntry = {
  id: string
  clientId: string
  userId: string | null
  eventType: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; fullName: string; email: string } | null
}

export type ClientSummary = {
  id: string
  internalCode: string | null
  displayName: string
  status: ClientStatus
  type: ClientType
  country: string | null
  primaryContact: Contact | null
  primaryOffice: ClientOffice | null
}

export type ClientDetail = ClientListItem & {
  registrationNo: string | null
  vatNo: string | null
  legalForm: string | null
  website: string | null
  notes: string | null
  gdprConsent: boolean
  gdprConsentDate: string | null
  updatedAt: string
  assignedUser: { id: string; fullName: string; email: string } | null
  holdingGroup: { id: string; name: string } | null
  offices: ClientOffice[]
  contacts: Contact[]
  relatedCompanies: RelatedCompany[]
}

export type ClientFilters = {
  status?: ClientStatus
  type?: ClientType
  assignedUserId?: string
  holdingGroupId?: string
  search?: string
  cursor?: string
  limit?: number
}

export type HoldingGroupFilters = {
  search?: string
  cursor?: string
  limit?: number
}
