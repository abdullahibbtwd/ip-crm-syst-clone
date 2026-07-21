import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTaskDate, formatTaskDueLabel } from './utils'

describe('task utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formatTaskDate formats ISO dates', () => {
    expect(formatTaskDate('2026-01-15T00:00:00Z')).toMatch(/15 Jan 2026/)
  })

  it('formatTaskDueLabel handles missing due date', () => {
    expect(formatTaskDueLabel(null)).toBe('No due date')
  })

  it('formatTaskDueLabel marks today and tomorrow', () => {
    expect(formatTaskDueLabel('2026-07-21T00:00:00Z')).toBe('Due today')
    expect(formatTaskDueLabel('2026-07-22T00:00:00Z')).toBe('Due tomorrow')
  })

  it('formatTaskDueLabel marks overdue tasks', () => {
    expect(formatTaskDueLabel('2026-07-19T00:00:00Z')).toBe('2 days overdue')
  })

  it('formatTaskDueLabel shows formatted date for future tasks', () => {
    expect(formatTaskDueLabel('2026-08-01T00:00:00Z')).toMatch(/^Due 1 Aug 2026$/)
  })
})
