import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingKeys } from '@/features/billing/queryKeys'
import { invoicesApi } from '../api'
import { invoiceKeys } from '../queryKeys'
import type { CreateInvoiceInput, InvoiceListFilters, RecordPaymentInput } from '../types'

function invalidateMatterInvoiceQueries(
  qc: ReturnType<typeof useQueryClient>,
  matterId?: string,
) {
  if (matterId) {
    qc.invalidateQueries({ queryKey: invoiceKeys.matter(matterId) })
    qc.invalidateQueries({ queryKey: billingKeys.matter(matterId) })
  }
  qc.invalidateQueries({ queryKey: invoiceKeys.all })
  qc.invalidateQueries({ queryKey: invoiceKeys.portal() })
}

export function useAllInvoices(filters?: InvoiceListFilters) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () => invoicesApi.listAll(filters),
  })
}

export function useMatterInvoices(matterId: string) {
  return useQuery({
    queryKey: invoiceKeys.matter(matterId),
    queryFn: () => invoicesApi.listForMatter(matterId),
    enabled: Boolean(matterId),
  })
}

export function usePortalInvoices() {
  return useQuery({
    queryKey: invoiceKeys.portal(),
    queryFn: () => invoicesApi.listForPortal(),
  })
}

export function useCreateInvoice(matterId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => invoicesApi.create(matterId, data),
    onSuccess: () => invalidateMatterInvoiceQueries(qc, matterId),
  })
}

export function useIssueInvoice(matterId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoicesApi.issue(id),
    onSuccess: () => invalidateMatterInvoiceQueries(qc, matterId),
  })
}

export function useVoidInvoice(matterId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoicesApi.void(id),
    onSuccess: () => invalidateMatterInvoiceQueries(qc, matterId),
  })
}

export function useRecordInvoicePayment(matterId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordPaymentInput }) =>
      invoicesApi.recordPayment(id, data),
    onSuccess: () => invalidateMatterInvoiceQueries(qc, matterId),
  })
}

export function useInvoicePdf(portal = false) {
  return useMutation({
    mutationFn: (id: string) => (portal ? invoicesApi.getPortalPdf(id) : invoicesApi.getPdf(id)),
    onSuccess: (data) => {
      window.open(data.url, '_blank', 'noopener,noreferrer')
    },
  })
}
