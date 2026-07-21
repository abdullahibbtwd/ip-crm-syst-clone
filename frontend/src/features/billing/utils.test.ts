import { describe, expect, it } from 'vitest'
import {
  formatBillingDate,
  formatHours,
  formatMoney,
  previewTimeAmount,
} from './utils'

describe('billing utils', () => {
  it('formatMoney formats EUR by default', () => {
    expect(formatMoney(1250)).toMatch(/€1,250/)
  })

  it('formatMoney supports other currencies', () => {
    expect(formatMoney(99.5, 'USD')).toContain('99.5')
    expect(formatMoney(99.5, 'USD')).toMatch(/US?\$/)
  })

  it('formatBillingDate formats ISO strings', () => {
    expect(formatBillingDate('2026-03-05T00:00:00Z')).toMatch(/05 Mar 2026/)
  })

  it('formatHours trims trailing .0', () => {
    expect(formatHours(2)).toBe('2h')
    expect(formatHours(1.5)).toBe('1.5h')
  })

  it('previewTimeAmount returns zero for non-billable entries', () => {
    expect(previewTimeAmount(2, 200, false)).toBe(0)
  })

  it('previewTimeAmount multiplies hours by rate', () => {
    expect(previewTimeAmount(1.25, 200, true)).toBe(250)
    expect(previewTimeAmount(0.333, 300, true)).toBe(99.9)
  })
})
