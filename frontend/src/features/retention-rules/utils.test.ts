import { describe, expect, it } from 'vitest'
import {
  conditionJsonFromPreset,
  conditionPresetFromJson,
  describeCondition,
  formatRetentionDuration,
} from './utils'

describe('retention rule utils', () => {
  it('formatRetentionDuration shows years and months when divisible', () => {
    expect(formatRetentionDuration(365)).toBe('365 days (1 year)')
    expect(formatRetentionDuration(730)).toBe('730 days (2 years)')
    expect(formatRetentionDuration(60)).toBe('60 days (2 months)')
  })

  it('formatRetentionDuration approximates partial periods', () => {
    expect(formatRetentionDuration(400)).toMatch(/~1\.1 years/)
    expect(formatRetentionDuration(45)).toMatch(/~1\.5 months/)
    expect(formatRetentionDuration(14)).toBe('14 days')
  })

  it('conditionPresetFromJson detects intake presets', () => {
    expect(conditionPresetFromJson('audit_logs', {})).toBe('none')
    expect(conditionPresetFromJson('intake_leads', { status: 'rejected' })).toBe(
      'rejected',
    )
    expect(
      conditionPresetFromJson('intake_leads', {
        statusNotIn: ['converted', 'rejected'],
      }),
    ).toBe('not_converted')
  })

  it('conditionJsonFromPreset round-trips presets', () => {
    expect(conditionJsonFromPreset('audit_logs', 'none')).toEqual({})
    expect(conditionJsonFromPreset('intake_leads', 'rejected')).toEqual({
      status: 'rejected',
    })
    expect(conditionJsonFromPreset('intake_leads', 'not_converted')).toEqual({
      statusNotIn: ['converted', 'rejected'],
    })
  })

  it('describeCondition returns human-readable filters', () => {
    expect(describeCondition('audit_logs', {})).toBe('All records')
    expect(describeCondition('intake_leads', { status: 'rejected' })).toBe(
      'Status = rejected',
    )
    expect(
      describeCondition('intake_leads', {
        statusNotIn: ['converted', 'rejected'],
      }),
    ).toBe('Not converted (excl. rejected)')
  })
})
