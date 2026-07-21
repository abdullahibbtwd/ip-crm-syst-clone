import { describe, expect, it } from 'vitest'
import { formatJurisdictions, parseTagsInput, tagsToInput } from './utils'

describe('matter utils', () => {
  it('formatJurisdictions joins codes or returns dash', () => {
    expect(formatJurisdictions(['EP', 'BG'])).toBe('EP, BG')
    expect(formatJurisdictions([])).toBe('-')
  })

  it('parseTagsInput splits on commas, semicolons, and whitespace', () => {
    expect(parseTagsInput('alpha, beta; gamma delta')).toEqual([
      'alpha',
      'beta',
      'gamma',
      'delta',
    ])
    expect(parseTagsInput('  one   two  ')).toEqual(['one', 'two'])
  })

  it('tagsToInput serializes arrays and strings', () => {
    expect(tagsToInput(['a', 'b'])).toBe('a, b')
    expect(tagsToInput('already text')).toBe('already text')
    expect(tagsToInput(null)).toBe('')
  })
})
