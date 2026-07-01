export const DIRECTION_LABELS: Record<
  import('./types').CorrespondenceDirection,
  string
> = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
}

export const STATUS_LABELS: Record<import('./types').CorrespondenceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  received: 'Received',
  replied: 'Replied',
}

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
