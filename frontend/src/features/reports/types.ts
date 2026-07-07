export type UrgencyTier = 'overdue' | 'today' | 'urgent' | 'soon' | 'ok' | 'completed'

export type UrgencyCounts = Record<UrgencyTier, number> & {
  total: number
  critical: number
}

export type DeadlineRiskClient = {
  id: string
  internalCode: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  type: string
}

export type DeadlineRiskAssignee = {
  id: string
  fullName: string
  email: string
}

export type DeadlineRiskDeadline = {
  id: string
  title: string
  dueDate: string
  status: string
  escalationLevel: number
  urgency: UrgencyTier
  matterId: string
  matterTitle: string
}

export type DeadlineRiskAssigneeGroup = {
  assignee: DeadlineRiskAssignee
  counts: UrgencyCounts
  deadlines: DeadlineRiskDeadline[]
}

export type DeadlineRiskJurisdictionGroup = {
  jurisdiction: string
  counts: UrgencyCounts
  assignees: DeadlineRiskAssigneeGroup[]
}

export type DeadlineRiskClientGroup = {
  client: DeadlineRiskClient
  counts: UrgencyCounts
  jurisdictions: DeadlineRiskJurisdictionGroup[]
}

export type DeadlineRiskResponse = {
  generatedAt: string
  windowDays: number
  summary: UrgencyCounts & { clients: number }
  groups: DeadlineRiskClientGroup[]
}

export type DeadlineRiskFilters = {
  dueWithinDays?: number
  clientId?: string
  jurisdiction?: string
  assignedToId?: string
}

export type AgingBucket = 'current' | 'overdue30' | 'overdue60' | 'overdue90plus'

export type AgingBucketCounts = Record<
  AgingBucket,
  { count: number; amount: number }
>

export type RevenueMonthRow = {
  month: string
  invoiced: number
  paid: number
  outstanding: number
  byPaymentStatus: Record<string, { count: number; amount: number }>
}

export type AgingPreviewInvoice = {
  id: string
  invoiceNumber: string | null
  clientId: string
  clientName: string
  dueDate: string | null
  outstanding: number
  currency: string
  agingBucket: AgingBucket
  daysPastDue: number | null
}

export type RevenueSummaryResponse = {
  generatedAt: string
  period: { from: string; to: string }
  currency: string
  summary: {
    totalInvoiced: number
    totalPaid: number
    totalOutstanding: number
    periodOutstanding: number
    invoiceCount: number
    openInvoiceCount: number
    criticalReceivables: number
    byPaymentStatus: Record<string, { count: number; amount: number }>
  }
  byMonth: RevenueMonthRow[]
  aging: AgingBucketCounts
  agingPreview: AgingPreviewInvoice[]
}

export type RevenueSummaryFilters = {
  from?: string
  to?: string
  clientId?: string
}

export type RenewalUrgencyTier =
  | 'overdue'
  | 'today'
  | 'urgent'
  | 'soon'
  | 'ok'
  | 'completed'

export type RenewalUrgencyCounts = Record<RenewalUrgencyTier, number> & {
  critical: number
}

export type FilingVolumesFilters = {
  from?: string
  to?: string
  matterType?: string
  jurisdiction?: string
}

export type FilingPreviewRow = {
  id: string
  title: string
  occurredAt: string
  matterId: string
  matterTitle: string
  matterType: string
  jurisdiction: string
}

export type FilingVolumesResponse = {
  generatedAt: string
  period: { from: string; to: string }
  summary: {
    totalFilings: number
    byMatterType: Record<string, number>
    byJurisdiction: Record<string, number>
  }
  byMonth: Array<{
    month: string
    count: number
    byMatterType: Record<string, number>
    byJurisdiction: Record<string, number>
  }>
  preview: FilingPreviewRow[]
}

export type RenewalsSummaryFilters = {
  dueBefore?: string
  jurisdiction?: string
}

export type RenewalPreviewRow = {
  id: string
  clientId: string
  clientName: string
  matterId: string
  matterTitle: string
  ipRightTitle: string
  jurisdiction: string
  dueDate: string
  status: string
  cycleNumber: number
  urgency: RenewalUrgencyTier
}

export type RenewalsSummaryResponse = {
  generatedAt: string
  dueBefore: string
  summary: {
    total: number
    pipelineTotal: number
    upcoming: number
    instructed: number
    filed: number
    completed: number
    lapsed: number
    critical: number
  }
  byStatus: Record<string, number>
  urgency: RenewalUrgencyCounts
  byMonth: Array<{
    month: string
    count: number
    byStatus: Record<string, number>
  }>
  byJurisdiction: Array<{
    jurisdiction: string
    count: number
    byStatus: Record<string, number>
  }>
  preview: RenewalPreviewRow[]
}

export type TeamWorkloadMember = {
  user: {
    id: string
    fullName: string
    email: string
    roles: string[]
  }
  counts: {
    matters: number
    tasks: number
    deadlines: number
    total: number
  }
}

export type TeamWorkloadResponse = {
  generatedAt: string
  summary: {
    teamMembers: number
    totalMatters: number
    totalTasks: number
    totalDeadlines: number
    totalWorkload: number
  }
  members: TeamWorkloadMember[]
}

export type ProfitabilityBasis = 'revenue_proxy' | 'true_margin'

export type ClientProfitabilityRow = {
  client: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
    type: string
    displayName: string
  }
  matterCount: number
  totalBillableAmount: number
  totalInternalCost: number
  totalFixedFees: number
  totalRevenue: number
  totalMargin: number
  unbilledAmount: number
}

export type ClientProfitabilityResponse = {
  generatedAt: string
  profitabilityBasis: ProfitabilityBasis
  methodologyNote: string
  currency: string
  summary: {
    clientCount: number
    matterCount: number
    totalBillableAmount: number
    totalInternalCost: number
    totalFixedFees: number
    totalRevenue: number
    totalMargin: number
    totalUnbilledAmount: number
  }
  clients: ClientProfitabilityRow[]
}
