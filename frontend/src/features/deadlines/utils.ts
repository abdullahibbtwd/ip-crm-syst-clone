import i18n from '@/i18n'
import type { DeadlineStatus, DeadlineUrgency } from './types'

export function deadlineStatusLabel(status: DeadlineStatus): string {
  return i18n.t(`status.${status}`, { ns: 'deadlines' })
}

/** @deprecated Use deadlineStatusLabel() for translated labels */
export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  missed: 'Missed',
  escalated: 'Escalated',
  superseded: 'Superseded',
}

export const DEADLINE_STATUS_VARIANT: Record<
  DeadlineStatus,
  'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  pending: 'info',
  in_progress: 'warning',
  completed: 'success',
  missed: 'destructive',
  escalated: 'destructive',
  superseded: 'secondary',
}

export function formatDeadlineDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function daysUntilDue(dueDate: string, from = new Date()) {
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const now = new Date(from)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isDueToday(dueDate: string, from = new Date()) {
  return daysUntilDue(dueDate, from) === 0
}

export function deadlineUrgency(
  dueDate: string,
  status: DeadlineStatus,
): DeadlineUrgency {
  if (status === 'completed' || status === 'superseded') return 'completed'
  if (status === 'missed' || status === 'escalated') return 'overdue'
  const days = daysUntilDue(dueDate)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 7) return 'urgent'
  if (days <= 30) return 'soon'
  return 'ok'
}

export const URGENCY_ROW_CLASS: Record<DeadlineUrgency, string> = {
  overdue: 'border-l-2 border-l-destructive bg-destructive/5',
  today: 'border-l-2 border-l-primary bg-primary/10 ring-1 ring-primary/15',
  urgent: 'border-l-2 border-l-primary/70 bg-primary/5',
  soon: 'border-l-2 border-l-brand-green/35 bg-brand-green/[0.04]',
  ok: '',
  completed: 'opacity-70',
}

export const URGENCY_DOT_CLASS: Record<DeadlineUrgency, string> = {
  overdue: 'bg-destructive',
  today: 'bg-primary animate-pulse',
  urgent: 'bg-primary/80',
  soon: 'bg-brand-green/50',
  ok: 'bg-brand-green/30',
  completed: 'bg-muted-foreground',
}

export const JURISDICTION_OPTIONS = [
  { value: 'BG', label: 'BPO — Bulgaria (BG)' },
  { value: 'EU', label: 'EUIPO — European Union (EU)' },
  { value: 'EP', label: 'EPO — European Patent (EP)' },
  { value: 'WO', label: 'WIPO / PCT (WO)' },
] as const

export function jurisdictionLabel(code: string | null | undefined) {
  if (!code) return '-'
  const match = JURISDICTION_OPTIONS.find((o) => o.value === code)
  return match?.label ?? code
}

export function deadlineJurisdiction(d: {
  jurisdiction?: string | null
  rule?: { jurisdiction: string } | null
}) {
  return d.jurisdiction ?? d.rule?.jurisdiction ?? null
}
