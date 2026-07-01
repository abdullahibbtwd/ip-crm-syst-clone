import type { TaskPriority } from './types'

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  normal: 'Normal',
}

export const TASK_STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
} as const

export function formatTaskDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatTaskDueLabel(dueDate: string | null): string {
  if (!dueDate) return 'No due date'
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
  return `Due ${formatTaskDate(dueDate)}`
}

export const PRIORITY_DOT_CLASS: Record<TaskPriority, string> = {
  high: 'bg-amber-500',
  normal: 'bg-muted-foreground/50',
}

export const PRIORITY_PREFIX: Record<TaskPriority, string> = {
  high: '⚠',
  normal: '●',
}
