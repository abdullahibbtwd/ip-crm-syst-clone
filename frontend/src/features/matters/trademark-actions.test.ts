import { describe, expect, it } from 'vitest'
import { goodsRowsFromAttributes, historyFromAttributes, secondaryHistoryFromAttributes } from './trademark-actions'

describe('goodsRowsFromAttributes', () => {
  it('prefers goodsAndServices rows when present', () => {
    expect(
      goodsRowsFromAttributes({
        niceClasses: ['35'],
        goodsAndServices: [{ classNumber: 9, description: 'software' }],
      }),
    ).toEqual([{ classNumber: 9, description: 'software' }])
  })

  it('falls back to niceClasses tags', () => {
    expect(goodsRowsFromAttributes({ niceClasses: ['9', '42'] })).toEqual([
      { classNumber: 9, description: '' },
      { classNumber: 42, description: '' },
    ])
  })

  it('returns an empty list when nothing is stored', () => {
    expect(goodsRowsFromAttributes({})).toEqual([])
  })
})

describe('historyFromAttributes', () => {
  it('reads secondary actions newest first and skips scope corrections', () => {
    const rows = secondaryHistoryFromAttributes({
      trademarkActions: [
        { id: 'a1', kind: 'scope_correction', occurredAt: '2026-08-01T00:00:00.000Z' },
        { id: 'a2', kind: 'transfer', occurredAt: '2026-08-02T00:00:00.000Z' },
        { id: 'a3', kind: 'license', occurredAt: '2026-08-03T00:00:00.000Z' },
      ],
    })
    expect(rows.map((row) => row.id)).toEqual(['a3', 'a2'])
  })

  it('builds a legacy id when none was stored', () => {
    const rows = historyFromAttributes({
      trademarkActions: [{ kind: 'pledge', occurredAt: '2026-08-10T00:00:00.000Z' }],
    })
    expect(rows[0]?.id).toBe('legacy-pledge-2026-08-10T00:00:00.000Z')
  })
})
