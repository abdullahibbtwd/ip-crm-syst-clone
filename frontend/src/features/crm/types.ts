import type { ClientAddressInput } from './addressInput'

export type ClientType = 'company' | 'individual'
export type ClientStatus = 'active' | 'inactive' | 'prospect' | 'archived'
export type ContactRole = 'primary' | 'billing' | 'conflict' | 'general'
export type RelationshipType = 'subsidiary' | 'affiliate' | 'parent'

export type Paginated<T> = {
  items: T[]
  nextCursor?: string | null
  total?: number
  page?: number
  limit?: number
  pageCount?: number
}

export type ClientSortBy = 'createdAt' | 'updatedAt' | 'name' | 'internalCode'
export type SortOrder = 'asc' | 'desc'

export type ClientSort = `${ClientSortBy}_${SortOrder}`

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

export type ClientTabCounts = {
  offices: number
  contacts: number
  related: number
  history: number
  matters: number
  documents: number
  correspondence: number
  watch: number
  billing: number
  access: number
  notes: number
  deadlines: number
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
  tabCounts?: ClientTabCounts
}

export type ClientOfficeAddressType =
  | 'registered_legal'
  | 'correspondence'
  | 'branch'

export type ClientOffice = {
  id: string
  clientId: string
  label: string
  addressType: ClientOfficeAddressType
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
  client?: {
    id: string
    type: ClientType
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
    displayName?: string
  }
}

export type GlobalContactFilters = {
  search?: string
  role?: ContactRole
  clientId?: string
  cursor?: string
  limit?: number
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
  registeredLegalOffice: ClientOffice | null
  correspondenceOffice: ClientOffice | null
  addressesDiffer?: boolean
}

export type AddressMatchLevel = 'exact' | 'partial' | 'mismatch' | 'missing'

export type AddressComparison = {
  match: AddressMatchLevel
  score: number
  differingFields: string[]
}

export type RegistryApplicantSnapshot = {
  name: string | null
  address: (ClientAddressInput & { formattedAddress?: string | null }) | null
  source: 'epo'
  publicationNumber?: string | null
  fetchedAt: string
}

export type IpAssetAddressComparison = {
  ipRightId: string
  matterId: string
  title: string
  applicationNumber: string | null
  registrationNumber: string | null
  jurisdiction: string
  registryApplicant: RegistryApplicantSnapshot | null
  comparisonToRegisteredLegal: AddressComparison
}

export type ClientAddressInsights = {
  registeredLegalAddress: ClientAddressInput | null
  correspondenceAddress: ClientAddressInput | null
  registeredLegalFormatted: string
  correspondenceFormatted: string
  registeredVsCorrespondence: AddressComparison
  ipAssetComparisons: IpAssetAddressComparison[]
  hasAddressMismatch: boolean
  mismatchCount: number
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
  billingName: string | null
  billingEmail: string | null
  preferredCurrency: string
  paymentTermsDays: number
  billingAddressLine1: string | null
  billingAddressLine2: string | null
  billingCity: string | null
  billingRegion: string | null
  billingPostalCode: string | null
  billingCountry: string | null
  billingReadiness?: import('./billingProfile').BillingReadiness
  assignedUser: { id: string; fullName: string; email: string } | null
  holdingGroup: { id: string; name: string } | null
  offices: ClientOffice[]
  contacts: Contact[]
  relatedCompanies: RelatedCompany[]
}

export type ClientNote = {
  id: string
  clientId: string
  body: string
  createdById: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; fullName: string } | null
}

export type ClientFilters = {
  status?: ClientStatus
  type?: ClientType
  assignedUserId?: string
  holdingGroupId?: string
  search?: string
  cursor?: string
  page?: number
  limit?: number
  sortBy?: ClientSortBy
  sortOrder?: SortOrder
}

export type HoldingGroupFilters = {
  search?: string
  cursor?: string
  limit?: number
}
