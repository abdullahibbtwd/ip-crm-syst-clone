import i18n from '@/i18n'
import type { Invoice, PaymentStatus } from './types'

export function formatInvoiceMoney(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatInvoiceDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return i18n.t(`paymentStatus.${status}`, { ns: 'finance' })
}

/** @deprecated Use paymentStatusLabel() for translated labels */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partially paid',
  paid: 'Paid',
}

export function invoiceClientName(invoice: Invoice) {
  return (
    invoice.client.companyName ||
    [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(' ') ||
    invoice.client.internalCode ||
    i18n.t('clientFallback', { ns: 'finance' })
  )
}
