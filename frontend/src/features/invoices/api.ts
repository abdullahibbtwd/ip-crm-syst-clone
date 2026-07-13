import { api } from '@/lib/api'
import type {
  AccountingExportParams,
  AccountingExportResponse,
  CreateInvoiceInput,
  Invoice,
  InvoiceListFilters,
  InvoiceListResponse,
  InvoicePdfResponse,
  RecordPaymentInput,
} from './types'

export function downloadCsvFile(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const invoicesApi = {
  listAll: (filters?: InvoiceListFilters) =>
    api.get<InvoiceListResponse>('/invoices', { params: filters }).then((r) => r.data),

  listForMatter: (matterId: string) =>
    api.get<Invoice[]>(`/matters/${matterId}/invoices`).then((r) => r.data),

  listForPortal: () => api.get<Invoice[]>('/portal/invoices').then((r) => r.data),

  get: (id: string) => api.get<Invoice>(`/invoices/${id}`).then((r) => r.data),

  create: (matterId: string, data: CreateInvoiceInput) =>
    api.post<Invoice>(`/matters/${matterId}/invoices`, data).then((r) => r.data),

  issue: (id: string) => api.post<Invoice>(`/invoices/${id}/issue`).then((r) => r.data),

  void: (id: string) => api.post<Invoice>(`/invoices/${id}/void`).then((r) => r.data),

  recordPayment: (id: string, data: RecordPaymentInput) =>
    api.post<Invoice>(`/invoices/${id}/payments`, data).then((r) => r.data),

  getPdf: (id: string) =>
    api.get<InvoicePdfResponse>(`/invoices/${id}/pdf`).then((r) => r.data),

  getPortalPdf: (id: string) =>
    api.get<InvoicePdfResponse>(`/portal/invoices/${id}/pdf`).then((r) => r.data),

  exportAccounting: (params: AccountingExportParams) =>
    api
      .get<AccountingExportResponse>('/invoices/export/accounting', { params })
      .then((r) => r.data),
}
