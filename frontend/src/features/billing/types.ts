export type BillingRateRole =
  | 'ip_attorney'
  | 'trademark_attorney'
  | 'paralegal'
  | 'coordinator'
  | 'managing_partner'

export type FixedFeeCategory = 'professional_fee' | 'disbursement' | 'expense'

export type ResolvedRate = {
  hourlyRate: number
  currency: string
  rateCardId: string | null
  role: BillingRateRole | null
  isUnrated: boolean
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
  totalFixedFees: number
  totalAmount: number
  unbilledAmount: number
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
