import { describe, expect, it } from 'vitest'
import type { ConflictHit } from './types'
import { formatSimilarity, groupConflictHits, intakeDisplayName } from './utils'

describe('intake utils', () => {
  it('intakeDisplayName uses company or full name', () => {
    expect(
      intakeDisplayName({
        enquirerType: 'company',
        companyName: 'Widget Co',
        fullName: null,
      }),
    ).toBe('Widget Co')

    expect(
      intakeDisplayName({
        enquirerType: 'individual',
        companyName: null,
        fullName: 'Jane Doe',
      }),
    ).toBe('Jane Doe')
  })

  it('formatSimilarity converts score to percentage', () => {
    expect(formatSimilarity(0.876)).toBe('88%')
  })

  it('groupConflictHits groups by entity type', () => {
    const hits: ConflictHit[] = [
      {
        entityType: 'client',
        entityId: 'c1',
        label: 'Acme',
        matchField: 'companyName',
        similarity: 0.9,
      },
      {
        entityType: 'matter',
        entityId: 'm1',
        label: 'M-100',
        matchField: 'title',
        similarity: 0.8,
      },
      {
        entityType: 'client',
        entityId: 'c2',
        label: 'Beta',
        matchField: 'companyName',
        similarity: 0.7,
      },
    ]

    const groups = groupConflictHits(hits)
    expect(groups.get('client')).toHaveLength(2)
    expect(groups.get('matter')).toHaveLength(1)
  })
})
