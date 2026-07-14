export type RetainerEntryType = 'deposit' | 'draw_down' | 'adjustment' | 'refund'

export type RetainerLedgerEntry = {
  id: string
  type: RetainerEntryType
  amount: number
  balanceAfter: number
  invoiceId?: string | null
  invoiceNumber?: string | null
  note?: string | null
  createdBy?: { id: string; fullName: string; email: string }
  createdAt: string
}

export type ClientRetainer = {
  clientId: string
  currency: string
  balance: number
  lowBalanceThreshold: number | null
  entries: RetainerLedgerEntry[]
}

export type PortalRetainer = {
  clientId: string
  currency: string
  balance: number
  entries: Array<{
    id: string
    type: RetainerEntryType
    amount: number
    balanceAfter: number
    invoiceNumber: string | null
    createdAt: string
  }>
}

export type CreateRetainerDepositInput = {
  amount: number
  note?: string
  lowBalanceThreshold?: number
}

export type CreateRetainerAdjustmentInput = {
  amount: number
  note: string
}

export type ApplyRetainerInput = {
  amount: number
}
