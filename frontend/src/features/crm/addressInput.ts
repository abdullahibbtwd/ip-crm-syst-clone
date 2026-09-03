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

const ADDRESS_FIELDS: (keyof ClientAddressInput)[] = [
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
  'country',
  'phone',
  'fax',
]

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

type AddressLike = {
  [K in keyof ClientAddressInput]?: string | null
}

export function toClientAddressInput(address?: AddressLike | null): ClientAddressInput {
  return {
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    city: address?.city ?? '',
    region: address?.region ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? '',
    phone: address?.phone ?? '',
    fax: address?.fax ?? '',
  }
}

export function clientAddressesEqual(
  a: AddressLike | null | undefined,
  b: AddressLike | null | undefined,
): boolean {
  return ADDRESS_FIELDS.every(
    (field) => (a?.[field] ?? '').trim() === (b?.[field] ?? '').trim(),
  )
}

export function correspondenceAddressPayload(
  registered: ClientAddressInput,
  correspondence: ClientAddressInput,
  sameAsRegistered: boolean,
): ClientAddressInput | undefined {
  return toClientAddressPayload(sameAsRegistered ? registered : correspondence)
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
