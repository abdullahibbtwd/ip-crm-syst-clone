import i18n from '@/i18n'
import type { AgingBucket } from './types'

export function agingBucketLabel(bucket: AgingBucket): string {
  return i18n.t(`aging.buckets.${bucket}`, { ns: 'reports' })
}

export function agingBucketShort(bucket: AgingBucket): string {
  return i18n.t(`aging.bucketsShort.${bucket}`, { ns: 'reports' })
}

/** @deprecated Use agingBucketLabel() for translated labels */
export const AGING_BUCKET_LABELS: Record<AgingBucket, string> = {
  current: 'Current',
  overdue30: '1–30 days',
  overdue60: '31–60 days',
  overdue90plus: '90+ days',
}

export const AGING_BUCKET_SHORT: Record<AgingBucket, string> = {
  current: 'Current',
  overdue30: '30d',
  overdue60: '60d',
  overdue90plus: '90d+',
}

export const AGING_ROW_CLASS: Record<AgingBucket, string> = {
  current: 'border-l-2 border-l-brand-green/40 bg-brand-green/[0.04]',
  overdue30: 'border-l-2 border-l-primary/50 bg-primary/[0.05]',
  overdue60: 'border-l-2 border-l-primary bg-primary/10',
  overdue90plus: 'border-l-2 border-l-destructive bg-destructive/5',
}

export const AGING_DOT_CLASS: Record<AgingBucket, string> = {
  current: 'bg-brand-green/50',
  overdue30: 'bg-primary/70',
  overdue60: 'bg-primary',
  overdue90plus: 'bg-destructive',
}

export const AGING_PILL_CLASS: Record<AgingBucket, string> = {
  current: 'border-brand-green/15 bg-brand-green/[0.06] text-brand-green',
  overdue30: 'border-primary/20 bg-primary/[0.08] text-primary',
  overdue60: 'border-primary/30 bg-primary/[0.12] text-[#b84e12]',
  overdue90plus: 'border-destructive/20 bg-destructive/[0.08] text-destructive',
}

export function formatReportMonth(month: string) {
  const [year, m] = month.split('-').map(Number)
  const locale = i18n.language?.startsWith('bg') ? 'bg-BG' : 'en-GB'
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
    new Date(year, m - 1, 1),
  )
}

export function defaultRevenuePeriod() {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}
