export type ClientAddressInput = {
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
  phone?: string
  fax?: string
}

export function emptyClientAddressInput(): ClientAddressInput {
  return {
    addressLine1: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    phone: '',
    fax: '',
  }
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function toClientAddressPayload(
  address: ClientAddressInput,
): ClientAddressInput | undefined {
  const payload: ClientAddressInput = {
    addressLine1: trimOptional(address.addressLine1),
    addressLine2: trimOptional(address.addressLine2),
    city: trimOptional(address.city),
    region: trimOptional(address.region),
    postalCode: trimOptional(address.postalCode),
    country: trimOptional(address.country),
    phone: trimOptional(address.phone),
    fax: trimOptional(address.fax),
  }

  const hasData = Object.values(payload).some(Boolean)
  return hasData ? payload : undefined
}
