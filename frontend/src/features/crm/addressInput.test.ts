import { describe, expect, it } from 'vitest'
import {
  clientAddressesEqual,
  correspondenceAddressPayload,
  emptyClientAddressInput,
} from './addressInput'

describe('correspondenceAddressPayload', () => {
  it('copies the registered address when marked the same', () => {
    const registered = {
      ...emptyClientAddressInput(),
      addressLine1: '1 High St',
      city: 'Sofia',
      country: 'BG',
    }

    expect(
      correspondenceAddressPayload(registered, emptyClientAddressInput(), true),
    ).toEqual({
      addressLine1: '1 High St',
      city: 'Sofia',
      country: 'BG',
    })
  })

  it('keeps a distinct correspondence address when unmarked', () => {
    const registered = { ...emptyClientAddressInput(), city: 'Sofia' }
    const correspondence = { ...emptyClientAddressInput(), city: 'Plovdiv' }

    expect(correspondenceAddressPayload(registered, correspondence, false)).toEqual({
      city: 'Plovdiv',
    })
  })
})

describe('clientAddressesEqual', () => {
  it('treats empty addresses as equal', () => {
    expect(clientAddressesEqual(undefined, undefined)).toBe(true)
    expect(clientAddressesEqual(emptyClientAddressInput(), {})).toBe(true)
  })
})
