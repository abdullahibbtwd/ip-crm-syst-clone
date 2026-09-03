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
  | 'cases'
  | 'domain'
  | 'litigation_expert_report'
  | 'consultation'
  | 'official_fee_payment'
  | 'other'

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

export type MatterClientSummary = {
  id: string
  internalCode: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  type: string
  holdingGroupId?: string | null
}

export type TrademarkListSummary = {
  territory: 'national' | 'eu' | 'international' | null
  prosecutionStage:
    | 'prep'
    | 'filing'
    | 'formal_exam'
    | 'substantive_exam'
    | 'publication'
    | 'reg_fee'
    | 'registration'
    | null
  niceClasses: string[]
  markType: string | null
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  markImageDocumentId: string | null
  markImageDocumentVersionId: string | null
  grounds: string | null
  oppositionStage: string | null
  cancellationStage: string | null
  deletionStage: string | null
}

export type PatentListSummary = {
  patentSubtype: 'new' | 'registered' | null
  patentProcedure: 'national' | 'european' | 'ep_validation' | 'pct' | null
  territoryCode: string | null
  prosecutionStage:
    | 'prep'
    | 'filing'
    | 'formal_exam'
    | 'substantive_exam'
    | 'publication'
    | 'reg_fee'
    | 'registration'
    | null
  claimsSummary: string | null
  ipcClasses: string[]
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  ownerName: string | null
}

export type DesignListSummary = {
  designProcedure: 'wipo' | 'national' | 'euipo' | null
  territoryCode: string | null
  prosecutionStage:
    | 'prep'
    | 'filing'
    | 'formal_exam'
    | 'substantive_exam'
    | 'publication'
    | 'reg_fee'
    | 'registration'
    | null
  locarnoClass: string | null
  locarnoSubclass: string | null
  classification: string | null
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  ownerName: string | null
  isRegistered: boolean
}

export type UtilityModelListSummary = {
  territoryCode: string | null
  prosecutionStage:
    | 'prep'
    | 'filing'
    | 'formal_exam'
    | 'substantive_exam'
    | 'publication'
    | 'reg_fee'
    | 'registration'
    | null
  claimsSummary: string | null
  ipcClasses: string[]
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  ownerName: string | null
  isRegistered: boolean
}

export type SpcListSummary = UtilityModelListSummary

export type GiListSummary = {
  giTerritory: 'national' | 'eu' | 'wo' | null
  territoryCode: string | null
  prosecutionStage:
    | 'prep'
    | 'filing'
    | 'formal_exam'
    | 'substantive_exam'
    | 'publication'
    | 'reg_fee'
    | 'registration'
    | null
  classification: string | null
  incomingNumber: string | null
  incomingDate: string | null
  registrationNumber: string | null
  registrationDate: string | null
  ownerName: string | null
  isRegistered: boolean
}

export type CaseListSummary = {
  clientName: string | null
  opposingPartyName: string | null
  caseNumber: string | null
  isIncoming: boolean
  courtLabel: string | null
  statusLabel: string | null
}

export type OtherListSummary = {
  headline: string | null
  workflowStage: string | null
  incomingNumber: string | null
  incomingDate: string | null
  authorityOffice: string | null
  deadlineHint: string | null
}

export type MatterListItem = {
  id: string
  clientId: string
  applicantClientId?: string | null
  intermediaryClientId?: string | null
  matterType: MatterType
  title: string
  status: MatterStatus
  isArchived?: boolean
  archivedAt?: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  assignedTo: MatterUser | null
  jurisdictions: MatterJurisdiction[]
  client: MatterClientSummary
  applicantClient?: MatterClientSummary | null
  intermediaryClient?: MatterClientSummary | null
  upcomingDeadlineCount?: number
  openDeadlineCount?: number
  overdueDeadlineCount?: number
  nextDeadlineDueDate?: string | null
  trademarkSummary?: TrademarkListSummary | null
  patentSummary?: PatentListSummary | null
  designSummary?: DesignListSummary | null
  utilityModelSummary?: UtilityModelListSummary | null
  spcSummary?: SpcListSummary | null
  giSummary?: GiListSummary | null
  caseSummary?: CaseListSummary | null
  otherSummary?: OtherListSummary | null
  documentCount?: number
}

export type MatterTabCounts = {
  documents: number
  correspondence: number
  correspondenceNew: number
  deadlines: number
  deadlinesOverdue: number
  tasks: number
  billing: number
  ipRights: number
  timeline: number
  instructions: number
  approvals: number
  customs: number
  secondaryActions: number
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
  ownerClientId?: string
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
  trademarkProcedure?: string
  /** Comma-separated types for multi-type shelves (e.g. Others). */
  matterTypes?: string
  assignedToId?: string
  search?: string
  archivedOnly?: boolean
  draftsOnly?: boolean
  excludeDrafts?: boolean
  trademarkApplicant?: string
  trademarkName?: string
  trademarkIncoming?: string
  trademarkRegNo?: string
  trademarkMarkType?: string
  trademarkMarkKind?: string
  trademarkTerritory?: string
  trademarkRepresentative?: string
  trademarkAppFrom?: string
  trademarkAppTo?: string
  trademarkRegFrom?: string
  trademarkRegTo?: string
  trademarkContact?: string
  trademarkStage?: string
  trademarkClass?: string
  trademarkCountry?: string
  trademarkCertificate?: boolean
  patentApplicant?: string
  patentName?: string
  patentIncoming?: string
  patentRegNo?: string
  patentTerritory?: string
  patentRepresentative?: string
  patentAppFrom?: string
  patentAppTo?: string
  patentRegFrom?: string
  patentRegTo?: string
  patentContact?: string
  patentStage?: string
  patentCountry?: string
  patentCertificate?: string
  patentAnnualFees?: string
  designApplicant?: string
  designName?: string
  designIncoming?: string
  designRegNo?: string
  designTerritory?: string
  designProcedure?: string
  designRepresentative?: string
  designAppFrom?: string
  designAppTo?: string
  designRegFrom?: string
  designRegTo?: string
  designContact?: string
  designStage?: string
  designCountry?: string
  designCertificate?: string
  utilityModelApplicant?: string
  utilityModelName?: string
  utilityModelIncoming?: string
  utilityModelRegNo?: string
  utilityModelTerritory?: string
  utilityModelRepresentative?: string
  utilityModelAppFrom?: string
  utilityModelAppTo?: string
  utilityModelRegFrom?: string
  utilityModelRegTo?: string
  utilityModelContact?: string
  utilityModelStage?: string
  utilityModelCertificate?: string
  spcOnly?: boolean
  spcApplicant?: string
  spcName?: string
  spcIncoming?: string
  spcRegNo?: string
  spcTerritory?: string
  spcRepresentative?: string
  spcAppFrom?: string
  spcAppTo?: string
  spcRegFrom?: string
  spcRegTo?: string
  spcContact?: string
  spcStage?: string
  spcCertificate?: string
  giApplicant?: string
  giName?: string
  giIncoming?: string
  giRegNo?: string
  giTerritory?: string
  giRepresentative?: string
  giAppFrom?: string
  giAppTo?: string
  giRegFrom?: string
  giRegTo?: string
  giContact?: string
  giStage?: string
  giCountry?: string
  giCertificate?: string
  withoutRepresentative?: boolean
  page?: number
  limit?: number
  cursor?: string
}

export type MatterListResponse = Paginated<MatterListItem>

export type CreateMatterInput = {
  clientId: string
  applicantClientId?: string
  intermediaryClientId?: string
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
  applicantClientId?: string | null
  intermediaryClientId?: string | null
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
