import i18n from '@/i18n'
import type { DeadlineEventType, DeadlineRuleTriggerType } from './types'

export const TRIGGER_TYPES: DeadlineRuleTriggerType[] = [
  'matter_created',
  'office_action',
  'renewal_due',
]

export const EVENT_TYPES: DeadlineEventType[] = [
  'filing',
  'examination_response',
  'renewal',
  'opposition',
  'grace_period',
]

/** @deprecated Prefer eventTypeLabel() at render time */
export const TRIGGER_TYPE_LABELS: Record<DeadlineRuleTriggerType, string> = {
  matter_created: 'Matter created',
  office_action: 'Office action',
  renewal_due: 'Renewal due',
}

/** @deprecated Prefer eventTypeLabel() at render time */
export const EVENT_TYPE_LABELS: Record<DeadlineEventType, string> = {
  filing: 'Filing',
  examination_response: 'Examination response',
  renewal: 'Renewal',
  opposition: 'Opposition',
  grace_period: 'Grace period',
}

export function triggerTypeLabel(type: DeadlineRuleTriggerType): string {
  return i18n.t(`deadlineRules.triggerType.${type}`, {
    ns: 'settings',
    defaultValue: TRIGGER_TYPE_LABELS[type],
  })
}

export function eventTypeLabel(type: DeadlineEventType): string {
  return i18n.t(`deadlineRules.eventType.${type}`, {
    ns: 'settings',
    defaultValue: EVENT_TYPE_LABELS[type],
  })
}

export function formatDaysOffset(days: number, isBusinessDays: boolean) {
  const unit =
    Math.abs(days) === 1
      ? i18n.t(
          isBusinessDays
            ? 'deadlineRules.offset.businessDay'
            : 'deadlineRules.offset.calendarDay',
          { ns: 'settings' },
        )
      : i18n.t(
          isBusinessDays
            ? 'deadlineRules.offset.businessDays'
            : 'deadlineRules.offset.calendarDays',
          { ns: 'settings' },
        )

  if (days === 0) {
    return i18n.t('deadlineRules.offset.sameDay', { ns: 'settings', unit })
  }
  if (days > 0) {
    return i18n.t('deadlineRules.offset.plus', { ns: 'settings', days, unit })
  }
  return i18n.t('deadlineRules.offset.minus', { ns: 'settings', days, unit })
}
