import i18n from '@/i18n'
import type { RenewalUrgencyTier } from './types'

export const RENEWAL_URGENCY_DOT_CLASS: Record<RenewalUrgencyTier, string> = {
  overdue: 'bg-destructive',
  today: 'bg-primary animate-pulse',
  urgent: 'bg-primary/80',
  soon: 'bg-brand-green/50',
  ok: 'bg-brand-green/30',
  completed: 'bg-muted-foreground',
}

export const RENEWAL_URGENCY_ROW_CLASS: Record<RenewalUrgencyTier, string> = {
  overdue: 'border-l-2 border-l-destructive bg-destructive/5',
  today: 'border-l-2 border-l-primary bg-primary/10 ring-1 ring-primary/15',
  urgent: 'border-l-2 border-l-primary/70 bg-primary/5',
  soon: 'border-l-2 border-l-brand-green/35 bg-brand-green/[0.04]',
  ok: '',
  completed: 'opacity-70',
}

export const RENEWAL_URGENCY_PILL_CLASS: Record<
  Exclude<RenewalUrgencyTier, 'ok' | 'completed'>,
  string
> = {
  overdue: 'border-destructive/20 bg-destructive/[0.08] text-destructive',
  today: 'border-primary/25 bg-primary/[0.1] text-primary',
  urgent: 'border-primary/20 bg-primary/[0.08] text-[#b84e12]',
  soon: 'border-brand-green/15 bg-brand-green/[0.06] text-brand-green/90',
}

export type ActiveRenewalUrgencyTier = Exclude<RenewalUrgencyTier, 'ok' | 'completed'>

export function renewalUrgencyLabel(tier: ActiveRenewalUrgencyTier): string {
  return i18n.t(`renewalUrgency.${tier}`, { ns: 'reports' })
}

/** @deprecated Use renewalUrgencyLabel() for translated labels */
export const RENEWAL_URGENCY_LABELS: Record<ActiveRenewalUrgencyTier, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  urgent: '≤7 days',
  soon: '≤30 days',
}

export function defaultFilingPeriod() {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function defaultRenewalsDueBefore() {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString().slice(0, 10)
}
