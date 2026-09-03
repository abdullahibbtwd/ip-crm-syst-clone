import { describe, expect, it } from 'vitest'
import {
  compactPoaFields,
  formatPoaObjectLine,
  legalEntityNameFromClient,
} from './poaFields'

describe('poaFields', () => {
  it('formats a bilingual trademark object line', () => {
    expect(formatPoaObjectLine('trademark', '54434', 'Test')).toBe(
      'Марка no. 54434 - Test Trademark no. 54434 - Test',
    )
  })

  it('uses company name and legal form, not person names', () => {
    expect(
      legalEntityNameFromClient({
        type: 'company',
        companyName: 'Acme',
        legalForm: 'EOOD',
        firstName: 'test',
        lastName: 'test',
      }),
    ).toBe('Acme, EOOD')
  })

  it('drops empty merge overrides', () => {
    expect(compactPoaFields({ mol: 'Ivan', address: '  ' })).toEqual({ mol: 'Ivan' })
  })
})
