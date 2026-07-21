import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  daysUntilDue,
  deadlineJurisdiction,
  deadlineUrgency,
  isDueToday,
  jurisdictionLabel,
} from './utils'

describe('deadline utils', () => {
  const today = new Date('2026-07-21T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(today)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('daysUntilDue counts calendar days', () => {
    expect(daysUntilDue('2026-07-24T00:00:00Z', today)).toBe(3)
    expect(daysUntilDue('2026-07-18T00:00:00Z', today)).toBe(-3)
  })

  it('isDueToday detects same-day deadlines', () => {
    expect(isDueToday('2026-07-21T00:00:00Z', today)).toBe(true)
    expect(isDueToday('2026-07-22T00:00:00Z', today)).toBe(false)
  })

  it('deadlineUrgency maps status and due date', () => {
    expect(deadlineUrgency('2026-07-21T00:00:00Z', 'completed')).toBe('completed')
    expect(deadlineUrgency('2026-08-01T00:00:00Z', 'missed')).toBe('overdue')
    expect(deadlineUrgency('2026-07-21T00:00:00Z', 'pending')).toBe('today')
    expect(deadlineUrgency('2026-07-25T00:00:00Z', 'pending')).toBe('urgent')
    expect(deadlineUrgency('2026-08-15T00:00:00Z', 'pending')).toBe('soon')
    expect(deadlineUrgency('2026-10-01T00:00:00Z', 'pending')).toBe('ok')
  })

  it('jurisdictionLabel resolves known codes', () => {
    expect(jurisdictionLabel('EP')).toContain('EPO')
    expect(jurisdictionLabel('XX')).toBe('XX')
    expect(jurisdictionLabel(null)).toBe('-')
  })

  it('deadlineJurisdiction prefers explicit jurisdiction', () => {
    expect(
      deadlineJurisdiction({ jurisdiction: 'BG', rule: { jurisdiction: 'EP' } }),
    ).toBe('BG')
    expect(deadlineJurisdiction({ rule: { jurisdiction: 'EU' } })).toBe('EU')
    expect(deadlineJurisdiction({})).toBeNull()
  })
})
