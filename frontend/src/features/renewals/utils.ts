import i18n from '@/i18n'
import type { RenewalStatus } from './types'

export function renewalStatusLabel(status: RenewalStatus): string {
  return i18n.t(`status.${status}`, { ns: 'renewals' })
}

/** @deprecated Use renewalStatusLabel() for translated labels */
export const RENEWAL_STATUS_LABELS: Record<RenewalStatus, string> = {
  upcoming: 'Upcoming',
  instructed: 'Instructed',
  filed: 'Filed',
  completed: 'Completed',
  lapsed: 'Lapsed',
}

export function renewalUrgency(
  dueDate: string,
  status: import('./types').RenewalStatus,
) {
  if (status === 'completed' || status === 'lapsed') return 'completed' as const
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'overdue' as const
  if (days === 0) return 'today' as const
  if (days <= 7) return 'urgent' as const
  if (days <= 30) return 'soon' as const
  return 'ok' as const
}

export const RENEWAL_URGENCY_ROW_CLASS: Record<
  ReturnType<typeof renewalUrgency>,
  string
> = {
  overdue: 'border-l-2 border-l-destructive bg-destructive/5',
  today: 'border-l-2 border-l-orange-500 bg-orange-500/10',
  urgent: 'border-l-2 border-l-amber-500 bg-amber-500/5',
  soon: 'border-l-2 border-l-yellow-400/80',
  ok: '',
  completed: 'opacity-70',
}
