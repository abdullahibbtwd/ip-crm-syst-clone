import { describe, expect, it } from 'vitest'
import { clientDisplayName } from './utils'

describe('crm utils', () => {
  it('clientDisplayName prefers company name for company clients', () => {
    expect(
      clientDisplayName({
        type: 'company',
        companyName: 'Acme Ltd',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).toBe('Acme Ltd')
  })

  it('clientDisplayName joins individual names', () => {
    expect(
      clientDisplayName({
        type: 'individual',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).toBe('Ada Lovelace')
  })
})
