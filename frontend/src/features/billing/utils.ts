import type { FixedFeeCategory } from './types'

const eur = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatMoney(amount: number, currency = 'EUR'): string {
  if (currency === 'EUR') return eur.format(amount)
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatBillingDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1).replace(/\.0$/, '')}h`
}

export const FIXED_FEE_CATEGORY_LABELS: Record<FixedFeeCategory, string> = {
  professional_fee: 'Professional fee',
  disbursement: 'Disbursement',
  expense: 'Expense',
}

export const FIXED_FEE_CATEGORIES = Object.keys(
  FIXED_FEE_CATEGORY_LABELS,
) as FixedFeeCategory[]

export function previewTimeAmount(
  hours: number,
  rate: number,
  isBillable: boolean,
): number {
  if (!isBillable) return 0
  return Math.round(hours * rate * 100) / 100
}
