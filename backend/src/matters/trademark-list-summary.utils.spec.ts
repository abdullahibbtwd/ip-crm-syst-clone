import { extractTrademarkListSummary } from './trademark-list-summary.utils'

describe('extractTrademarkListSummary', () => {
  it('reads prosecution stage, territory, classes, and mark type', () => {
    const summary = extractTrademarkListSummary({
      territory: 'national',
      markType: 'wordmark',
      niceClasses: [35, '42'],
      prosecution: { stage: 'filing' },
    })

    expect(summary).toMatchObject({
      territory: 'national',
      prosecutionStage: 'filing',
      niceClasses: ['35', '42'],
      markType: 'wordmark',
    })
  })

  it('prefers prosecution application number over create-file attributes', () => {
    const summary = extractTrademarkListSummary({
      applicationNumber: 'OLD-1',
      applicationDate: '2020-01-01',
      prosecution: {
        stage: 'formal_exam',
        applicationNumber: 'BG-2026-001',
        applicationDate: '2026-03-01',
      },
    })

    expect(summary?.incomingNumber).toBe('BG-2026-001')
    expect(summary?.incomingDate).toBe('2026-03-01')
  })

  it('falls back to PoA incoming when filing number is missing', () => {
    const summary = extractTrademarkListSummary({
      prosecution: {
        stage: 'prep',
        poaIncomingNumber: 'VH-123',
        poaDate: '2026-02-10',
      },
    })

    expect(summary?.incomingNumber).toBe('VH-123')
    expect(summary?.incomingDate).toBe('2026-02-10')
  })

  it('uses IP right registration when attributes omit it', () => {
    const summary = extractTrademarkListSummary(
      { territory: 'eu' },
      {
        applicationNumber: 'EU123',
        registrationNumber: 'REG-9',
        filingDate: new Date('2025-01-15'),
        registrationDate: new Date('2025-06-01'),
      },
    )

    expect(summary?.registrationNumber).toBe('REG-9')
    expect(summary?.registrationDate).toBe('2025-06-01')
  })

  it('defaults prosecution stage to prep when missing', () => {
    expect(extractTrademarkListSummary({ territory: 'eu' })?.prosecutionStage).toBe(
      'prep',
    )
  })
})
