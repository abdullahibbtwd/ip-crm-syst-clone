import { describe, expect, it } from 'vitest'
import {
  REGISTRY_SOURCE_LABELS,
  formatNiceClasses,
  formatSimilarityScore,
  formatWatchJurisdictions,
  registrySourceLabel,
} from './utils'

describe('watch utils', () => {
  it('registrySourceLabel returns known registry labels', () => {
    expect(registrySourceLabel('EUIPO')).toBe(REGISTRY_SOURCE_LABELS.EUIPO)
    expect(registrySourceLabel('BPO')).toBe('BPO (Bulgaria)')
  })

  it('formatNiceClasses sorts and joins class numbers', () => {
    expect(formatNiceClasses([])).toBe('—')
    expect(formatNiceClasses([25, 9, 35])).toBe('9, 25, 35')
  })

  it('formatWatchJurisdictions maps codes through jurisdiction labels', () => {
    expect(formatWatchJurisdictions([])).toBe('—')
    expect(formatWatchJurisdictions(['EP', 'BG'])).toContain('EPO')
    expect(formatWatchJurisdictions(['EP', 'BG'])).toContain('Bulgaria')
  })

  it('formatSimilarityScore converts scores to percentages', () => {
    expect(formatSimilarityScore(0.724)).toBe('72%')
    expect(formatSimilarityScore(null)).toBe('—')
    expect(formatSimilarityScore(undefined)).toBe('—')
    expect(formatSimilarityScore(Number.NaN)).toBe('—')
  })
})
