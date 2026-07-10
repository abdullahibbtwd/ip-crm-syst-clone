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
  renewal: 'Renewal',
}

export const CORRESPONDENCE_CATEGORIES: import('./types').CorrespondenceCategory[] = [
  'office_action',
  'renewal',
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

/** EPO Register link from correspondence metadata (stored or derived). */
export function correspondenceEpoRegisterLink(
  item: import('./types').Correspondence,
): string | null {
  const meta = item.metadata
  if (!meta) return null

  const stored = meta.epoRegisterLink
  if (typeof stored === 'string' && stored.startsWith('http')) {
    // Prefer smartSearch; rewrite older simpleSearch / regviewer links when we have a full number
    if (stored.includes('smartSearch')) return stored
    const appNo =
      (typeof meta.epoAppNumber === 'string' && meta.epoAppNumber) ||
      (typeof meta.epoEpodoc === 'string' && meta.epoEpodoc.replace(/^EP/i, '')) ||
      null
    if (appNo && /^\d{8,}$/.test(String(appNo).replace(/\D/g, ''))) {
      const digits = String(appNo).replace(/\D/g, '')
      return `https://register.epo.org/smartSearch?lng=en&query=EP${digits}`
    }
    return stored
  }

  const base =
    typeof meta.epoBaseNumber === 'string' ? meta.epoBaseNumber.replace(/\D/g, '') : null
  const check =
    typeof meta.epoCheckDigit === 'string' ? meta.epoCheckDigit.replace(/\D/g, '') : null
  if (base && check) {
    return `https://register.epo.org/smartSearch?lng=en&query=EP${base}${check}`
  }

  const appNo =
    (typeof meta.epoAppNumber === 'string' && meta.epoAppNumber) ||
    (typeof meta.applicationNumber === 'string' && meta.applicationNumber) ||
    null

  if (meta.source === 'epo_ops' && appNo) {
    let number = appNo
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/\.[A-Z]\d*$/i, '')
      .replace(/([A-Z]{2}\d+)[A-Z]\d*$/i, '$1')
    // EP23717053.1 → EP237170531
    number = number.replace(/^EP(\d+)\.(\d)$/i, 'EP$1$2')
    const query = number.startsWith('EP') ? number : `EP${number}`
    return `https://register.epo.org/smartSearch?lng=en&query=${encodeURIComponent(query)}`
  }

  return null
}
