import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RENEWAL_STATUS_LABELS, renewalUrgency } from './utils'

describe('renewal utils', () => {
  const today = new Date('2026-07-21T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(today)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renewalUrgency treats completed and lapsed as completed', () => {
    expect(renewalUrgency('2026-12-01T00:00:00Z', 'completed')).toBe('completed')
    expect(renewalUrgency('2026-12-01T00:00:00Z', 'lapsed')).toBe('completed')
  })

  it('renewalUrgency maps due dates to urgency buckets', () => {
    expect(renewalUrgency('2026-07-18T00:00:00Z', 'upcoming')).toBe('overdue')
    expect(renewalUrgency('2026-07-21T00:00:00Z', 'upcoming')).toBe('today')
    expect(renewalUrgency('2026-07-25T00:00:00Z', 'instructed')).toBe('urgent')
    expect(renewalUrgency('2026-08-15T00:00:00Z', 'filed')).toBe('soon')
    expect(renewalUrgency('2026-10-01T00:00:00Z', 'upcoming')).toBe('ok')
  })

  it('RENEWAL_STATUS_LABELS exposes stable English labels', () => {
    expect(RENEWAL_STATUS_LABELS.upcoming).toBe('Upcoming')
    expect(RENEWAL_STATUS_LABELS.lapsed).toBe('Lapsed')
  })
})
