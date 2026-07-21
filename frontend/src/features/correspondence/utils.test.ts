import { describe, expect, it } from 'vitest'
import type { Correspondence } from './types'
import {
  correspondenceEpoRegisterLink,
  defaultStatusForDirection,
  isEpoDocumentAutoFetched,
  isEpoDocumentFetching,
} from './utils'

function correspondence(
  overrides: Partial<Correspondence> = {},
): Correspondence {
  return {
    id: 'c1',
    matterId: 'm1',
    direction: 'incoming',
    category: 'correspondence',
    correspondenceDate: '2026-01-01T00:00:00Z',
    sender: 'EPO',
    recipient: 'Firm',
    subject: 'Test',
    status: 'received',
    source: 'manual',
    messageId: null,
    bodyText: null,
    metadata: null,
    isClientVisible: false,
    documentVersionId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: null,
    documentVersion: null,
    ...overrides,
  }
}

describe('correspondence utils', () => {
  it('defaultStatusForDirection maps outgoing to draft', () => {
    expect(defaultStatusForDirection('outgoing')).toBe('draft')
    expect(defaultStatusForDirection('incoming')).toBe('received')
  })

  it('isEpoDocumentFetching detects in-progress EPO fetches', () => {
    expect(
      isEpoDocumentFetching(
        correspondence({
          metadata: {
            source: 'epo_ops',
            epoDocumentFetchStatus: 'pending',
          },
        }),
      ),
    ).toBe(true)

    expect(
      isEpoDocumentFetching(
        correspondence({
          documentVersionId: 'doc-1',
          metadata: { source: 'epo_ops', epoDocumentFetchStatus: 'pending' },
        }),
      ),
    ).toBe(false)

    expect(
      isEpoDocumentFetching(
        correspondence({
          metadata: {
            source: 'epo_ops',
            epoDocumentFetchStatus: 'ready',
          },
        }),
      ),
    ).toBe(false)
  })

  it('isEpoDocumentAutoFetched reads metadata flag', () => {
    expect(
      isEpoDocumentAutoFetched(
        correspondence({ metadata: { epoDocumentAutoFetched: true } }),
      ),
    ).toBe(true)
    expect(isEpoDocumentAutoFetched(correspondence())).toBe(false)
  })

  it('correspondenceEpoRegisterLink prefers stored smartSearch links', () => {
    const link = 'https://register.epo.org/smartSearch?lng=en&query=EP12345678'
    expect(
      correspondenceEpoRegisterLink(
        correspondence({ metadata: { epoRegisterLink: link } }),
      ),
    ).toBe(link)
  })

  it('correspondenceEpoRegisterLink builds query from EPO metadata', () => {
    expect(
      correspondenceEpoRegisterLink(
        correspondence({
          metadata: {
            source: 'epo_ops',
            epoAppNumber: 'EP23717053.1',
          },
        }),
      ),
    ).toBe('https://register.epo.org/smartSearch?lng=en&query=EP237170531')
  })
})
