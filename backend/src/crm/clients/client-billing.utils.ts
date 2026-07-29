import { ClientType } from '../../../generated/prisma/client';

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
] as const;

export type SupportedInvoiceCurrency =
  (typeof SUPPORTED_INVOICE_CURRENCIES)[number];

export const BILLING_INCOMPLETE_CODE = 'BILLING_INCOMPLETE';

export type BillingMissingField =
  | 'billingEmail'
  | 'billingAddress'
  | 'vatNo'
  | 'preferredCurrency';

export type ClientBillingSnapshot = {
  type: ClientType | string;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  internalCode?: string | null;
  vatNo?: string | null;
  billingName?: string | null;
  billingEmail?: string | null;
  preferredCurrency?: string | null;
  paymentTermsDays?: number | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingRegion?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
};

export type BillingReadiness = {
  ready: boolean;
  missingFields: BillingMissingField[];
  billToName: string;
  billToEmail: string | null;
  billToVatNo: string | null;
  preferredCurrency: string;
  paymentTermsDays: number;
  billToAddressLines: string[];
};

function trimOrNull(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function resolveBillToName(client: ClientBillingSnapshot): string {
  return (
    trimOrNull(client.billingName) ||
    trimOrNull(client.companyName) ||
    [client.firstName, client.lastName].filter(Boolean).join(' ').trim() ||
    client.internalCode ||
    'Client'
  );
}

export function formatBillingAddressLines(
  client: ClientBillingSnapshot,
): string[] {
  const lines: string[] = [];
  const line1 = trimOrNull(client.billingAddressLine1);
  const line2 = trimOrNull(client.billingAddressLine2);
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);
  const cityLine = [
    trimOrNull(client.billingPostalCode),
    trimOrNull(client.billingCity),
  ]
    .filter(Boolean)
    .join(' ');
  if (cityLine) lines.push(cityLine);
  const region = trimOrNull(client.billingRegion);
  if (region) lines.push(region);
  const country = trimOrNull(client.billingCountry);
  if (country) lines.push(country);
  return lines;
}

export function assessBillingReadiness(
  client: ClientBillingSnapshot,
): BillingReadiness {
  const missingFields: BillingMissingField[] = [];
  const billToName = resolveBillToName(client);
  const billToEmail = trimOrNull(client.billingEmail);
  const billToVatNo = trimOrNull(client.vatNo);
  const preferredCurrency = (
    trimOrNull(client.preferredCurrency) || 'EUR'
  ).toUpperCase();
  const paymentTermsDays =
    client.paymentTermsDays && client.paymentTermsDays > 0
      ? client.paymentTermsDays
      : 30;
  const billToAddressLines = formatBillingAddressLines(client);

  if (!billToEmail) missingFields.push('billingEmail');
  if (billToAddressLines.length === 0) missingFields.push('billingAddress');
  if (
    !SUPPORTED_INVOICE_CURRENCIES.includes(
      preferredCurrency as SupportedInvoiceCurrency,
    )
  ) {
    missingFields.push('preferredCurrency');
  }
  if (client.type === ClientType.company || client.type === 'company') {
    if (!billToVatNo) missingFields.push('vatNo');
  }

  return {
    ready: missingFields.length === 0,
    missingFields,
    billToName,
    billToEmail,
    billToVatNo,
    preferredCurrency: SUPPORTED_INVOICE_CURRENCIES.includes(
      preferredCurrency as SupportedInvoiceCurrency,
    )
      ? preferredCurrency
      : 'EUR',
    paymentTermsDays,
    billToAddressLines,
  };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
