import type {
  IntakeConditionPreset,
  RetentionAction,
  RetentionConditionJson,
  RetentionEntityType,
} from './types'

/** @deprecated Use i18n keys `compliance.retention.entityTypes.*` in UI */
export const ENTITY_TYPE_LABELS: Record<RetentionEntityType, string> = {
  intake_leads: 'Intake leads',
  audit_logs: 'Audit logs',
}

/** @deprecated Use i18n keys `compliance.retention.actions.*` in UI */
export const ACTION_LABELS: Record<RetentionAction, string> = {
  anonymize: 'Anonymize',
  delete: 'Delete',
}

export const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABELS) as RetentionEntityType[]

type TranslateFn = (key: string, options?: Record<string, unknown>) => string

export function formatRetentionDuration(
  days: number,
  t?: TranslateFn,
): string {
  if (t) {
    if (days % 365 === 0) {
      const years = days / 365
      return t('retention.duration.daysWithYears', { days, count: years })
    }
    if (days % 30 === 0) {
      const months = days / 30
      return t('retention.duration.daysWithMonths', { days, count: months })
    }
    if (days >= 365) {
      const years = Math.round((days / 365) * 10) / 10
      return t('retention.duration.daysApproxYears', { days, years })
    }
    if (days >= 30) {
      const months = Math.round((days / 30) * 10) / 10
      return t('retention.duration.daysApproxMonths', { days, months })
    }
    return t('retention.duration.days', { days })
  }

  if (days % 365 === 0) {
    const years = days / 365
    return `${days} days (${years} ${years === 1 ? 'year' : 'years'})`
  }
  if (days % 30 === 0) {
    const months = days / 30
    return `${days} days (${months} ${months === 1 ? 'month' : 'months'})`
  }
  if (days >= 365) {
    const years = Math.round((days / 365) * 10) / 10
    return `${days} days (~${years} years)`
  }
  if (days >= 30) {
    const months = Math.round((days / 30) * 10) / 10
    return `${days} days (~${months} months)`
  }
  return `${days} days`
}

export function conditionPresetFromJson(
  entityType: string,
  condition: RetentionConditionJson | Record<string, unknown> | null | undefined,
): IntakeConditionPreset {
  if (entityType !== 'intake_leads') return 'none'
  const c = (condition ?? {}) as RetentionConditionJson
  if (c.status === 'rejected') return 'rejected'
  if (
    Array.isArray(c.statusNotIn) &&
    c.statusNotIn.includes('converted') &&
    c.statusNotIn.includes('rejected')
  ) {
    return 'not_converted'
  }
  return 'none'
}

export function conditionJsonFromPreset(
  entityType: RetentionEntityType,
  preset: IntakeConditionPreset,
): RetentionConditionJson {
  if (entityType === 'audit_logs') return {}
  if (preset === 'rejected') return { status: 'rejected' }
  if (preset === 'not_converted') return { statusNotIn: ['converted', 'rejected'] }
  return {}
}

export function describeCondition(
  entityType: string,
  condition: RetentionConditionJson | Record<string, unknown> | null | undefined,
  t?: TranslateFn,
): string {
  if (entityType === 'audit_logs') {
    return t?.('retention.conditions.allRecords') ?? 'All records'
  }
  const preset = conditionPresetFromJson(entityType, condition)
  if (preset === 'rejected') {
    return t?.('retention.conditions.rejected') ?? 'Status = rejected'
  }
  if (preset === 'not_converted') {
    return t?.('retention.conditions.notConverted') ?? 'Not converted (excl. rejected)'
  }
  return t?.('retention.conditions.noStatusFilter') ?? 'No status filter'
}
