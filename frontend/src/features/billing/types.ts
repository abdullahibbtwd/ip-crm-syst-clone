import type { RevenueSummaryResponse } from '@/features/reports/types'

export type BillingRateRole =
  | 'ip_attorney'
  | 'trademark_attorney'
  | 'paralegal'
  | 'coordinator'
  | 'managing_partner'

export type FixedFeeCategory = 'professional_fee' | 'disbursement' | 'expense'

export type RateCard = {
  id: string
  role: BillingRateRole
  matterType: string | null
  clientId: string | null
  hourlyRate: number
  internalCostPerHour: number | null
  currency: string
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
  } | null
}

export type CreateRateCardInput = {
  role: BillingRateRole
  matterType?: string
  clientId?: string
  hourlyRate: number
  internalCostPerHour?: number
  currency?: string
  effectiveFrom: string
  effectiveTo?: string
}

export type UpdateRateCardInput = {
  hourlyRate?: number
  internalCostPerHour?: number | null
  effectiveTo?: string
}

export type ResolvedRate = {
  hourlyRate: number
  internalCostPerHour: number
  currency: string
  rateCardId: string | null
  role: BillingRateRole | null
  isUnrated: boolean
  hasInternalCost: boolean
  resolutionLevel:
    | 'client_matter_type'
    | 'firm_matter_type'
    | 'firm_any_matter_type'
    | 'unrated'
}

export type TimeEntry = {
  id: string
  matterId: string
  loggedById: string
  date: string
  hours: number
  description: string
  isBillable: boolean
  rateSnapshot: number
  costSnapshot: number
  amount: number
  invoiceId: string | null
  createdAt: string
  updatedAt: string
  isUnrated?: boolean
  loggedBy: {
    id: string
    fullName: string
    email: string
  }
}

export type FixedFee = {
  id: string
  matterId: string
  description: string
  amount: number
  currency: string
  category: FixedFeeCategory
  date: string
  isBillable: boolean
  invoiceId: string | null
  createdAt: string
  updatedAt: string
}

export type BillingSummary = {
  matterId: string
  totalHours: number
  totalBillableHours: number
  totalBillableAmount: number
  totalInternalCost: number
  totalFixedFees: number
  totalAmount: number
  totalMargin: number
  unbilledAmount: number
}

export type ClientMatterBillingSummary = BillingSummary & {
  title: string
  matterType: string
  status: string
}

export type ClientBillingSummary = {
  clientId: string
  totals: Omit<BillingSummary, 'matterId'>
  matters: ClientMatterBillingSummary[]
}

export type CreateTimeEntryInput = {
  date: string
  hours: number
  description: string
  isBillable?: boolean
  rateSnapshot?: number
}

export type UpdateTimeEntryInput = Partial<CreateTimeEntryInput>

export type CreateFixedFeeInput = {
  description: string
  amount: number
  currency?: string
  category: FixedFeeCategory
  date: string
  isBillable?: boolean
}

export type UpdateFixedFeeInput = Partial<CreateFixedFeeInput>

export type ProfitabilityBasis = 'revenue_proxy' | 'true_margin'

export type RateCardsHealth = {
  rateCardsTotal: number
  hasInternalCostConfigured: boolean
  internalCostRateCards: number
  profitabilityBasis: ProfitabilityBasis
  unratedTimeEntries: {
    count: number
    totalHours: number
    totalAmount: number
  }
}

export type BillingOverviewResponse = {
  generatedAt: string
  revenueSummary: RevenueSummaryResponse
  rateCardsHealth: RateCardsHealth
}
