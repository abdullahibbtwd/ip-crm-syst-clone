import i18n from '@/i18n'

export function correspondenceDirectionLabel(
  direction: import('./types').CorrespondenceDirection,
): string {
  return i18n.t(`correspondence.direction.${direction}`, { ns: 'matters' })
}

export function correspondenceStatusLabel(
  status: import('./types').CorrespondenceStatus,
): string {
  return i18n.t(`correspondence.status.${status}`, { ns: 'matters' })
}

export function correspondenceCategoryLabel(
  category: import('./types').CorrespondenceCategory,
): string {
  return i18n.t(`correspondence.category.${category}`, { ns: 'matters' })
}

export function timelineEventLabel(
  eventType: import('./types').MatterTimelineEvent['eventType'],
): string {
  return i18n.t(`timeline.eventType.${eventType}`, { ns: 'matters' })
}

/** @deprecated Use correspondenceDirectionLabel() for translated labels */
export const DIRECTION_LABELS: Record<
  import('./types').CorrespondenceDirection,
  string
> = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
}

/** @deprecated Use correspondenceStatusLabel() for translated labels */
export const STATUS_LABELS: Record<import('./types').CorrespondenceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  received: 'Received',
  replied: 'Replied',
}

/** @deprecated Use correspondenceCategoryLabel() for translated labels */
export const CORRESPONDENCE_CATEGORY_LABELS: Record<
  import('./types').CorrespondenceCategory,
  string
> = {
  office_action: 'Office action',
  application: 'Application',
  evidence: 'Evidence',
  certificate: 'Certificate',
  correspondence: 'General correspondence',
}

export const CORRESPONDENCE_CATEGORIES: import('./types').CorrespondenceCategory[] = [
  'office_action',
  'application',
  'evidence',
  'certificate',
  'correspondence',
]

/** @deprecated Use timelineEventLabel() for translated labels */
export const TIMELINE_EVENT_LABELS: Record<
  import('./types').MatterTimelineEvent['eventType'],
  string
> = {
  correspondence: 'Correspondence',
  filing: 'Filing',
  deadline: 'Deadline',
  note: 'Note',
  task: 'Task',
}

export function formatCorrespondenceDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function defaultStatusForDirection(
  direction: import('./types').CorrespondenceDirection,
): import('./types').CorrespondenceStatus {
  return direction === 'outgoing' ? 'draft' : 'received'
}
