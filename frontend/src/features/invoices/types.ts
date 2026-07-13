export type InvoiceStatus = 'draft' | 'issued' | 'void'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export type InvoiceUser = {
  id: string
  fullName: string
  email: string
}

export type InvoicePayment = {
  id: string
  invoiceId: string
  amount: number
  paidAt: string
  method: string | null
  reference: string | null
  recordedById: string
  createdAt: string
  recordedBy: InvoiceUser
}

export type InvoiceTimeEntry = {
  id: string
  date: string
  description: string
  hours: number
  amount: number
  loggedBy: InvoiceUser
}

export type InvoiceFixedFee = {
  id: string
  date: string
  description: string
  category: string
  amount: number
}

export type Invoice = {
  id: string
  clientId: string
  matterId: string
  invoiceNumber: string | null
  status: InvoiceStatus
  issueDate: string | null
  dueDate: string | null
  currency: string
  subtotal: number
  taxRate: number | null
  taxAmount: number
  totalAmount: number
  paymentStatus: PaymentStatus
  paidAmount: number
  paidAt: string | null
  pdfStorageKey: string | null
  notes: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    companyName: string | null
    firstName: string | null
    lastName: string | null
    internalCode: string | null
  }
  matter: {
    id: string
    title: string
    matterType: string
  }
  createdBy: InvoiceUser
  payments: InvoicePayment[]
  timeEntries: InvoiceTimeEntry[]
  fixedFees: InvoiceFixedFee[]
}

export type CreateInvoiceInput = {
  timeEntryIds?: string[]
  fixedFeeIds?: string[]
  taxRate?: number
  dueDate?: string
  notes?: string
}

export type RecordPaymentInput = {
  amount: number
  paidAt: string
  method?: string
  reference?: string
}

export type InvoicePdfResponse = {
  url: string
  fileName: string
  mimeType: string
}

export type InvoiceListFilters = {
  status?: InvoiceStatus
  paymentStatus?: PaymentStatus
  clientId?: string
  search?: string
  cursor?: string
  limit?: number
}

export type InvoiceListResponse = {
  items: Invoice[]
  nextCursor: string | null
}

export type AccountingExportFormat = 'journal' | 'xero' | 'quickbooks'

export type AccountingExportParams = {
  format: AccountingExportFormat
  from?: string
  to?: string
  clientId?: string
}

export type AccountingExportResponse = {
  csv: string
  filename: string
  format: AccountingExportFormat
  count: number
}
