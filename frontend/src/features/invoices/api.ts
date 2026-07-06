import { api } from '@/lib/api'
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceListFilters,
  InvoiceListResponse,
  InvoicePdfResponse,
  RecordPaymentInput,
} from './types'

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
}
