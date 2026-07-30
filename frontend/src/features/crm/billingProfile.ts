export const SUPPORTED_INVOICE_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'BGN',
  'RON',
  'TRY',
  'PLN',
  'CZK',
  'HUF',
  'SEK',
  'NOK',
  'DKK',
  'JPY',
  'CNY',
  'CAD',
  'AUD',
] as const

export type SupportedInvoiceCurrency =
  (typeof SUPPORTED_INVOICE_CURRENCIES)[number]

export type BillingMissingField =
  | 'billingEmail'
  | 'billingAddress'
  | 'vatNo'
  | 'preferredCurrency'

export type BillingReadiness = {
  ready: boolean
  missingFields: BillingMissingField[]
  billToName: string
  billToEmail: string | null
  billToVatNo: string | null
  preferredCurrency: string
  paymentTermsDays: number
  billToAddressLines: string[]
}

export const BILLING_INCOMPLETE_CODE = 'BILLING_INCOMPLETE'

export type ClientBillingFields = {
  billingName: string
  billingEmail: string
  vatNo: string
  preferredCurrency: string
  paymentTermsDays: number
  billingAddressLine1: string
  billingAddressLine2: string
  billingCity: string
  billingRegion: string
  billingPostalCode: string
  billingCountry: string
}
