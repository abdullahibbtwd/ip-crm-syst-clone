export type AddressParts = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type AddressMatchLevel = 'exact' | 'partial' | 'mismatch' | 'missing';

export type AddressComparison = {
  match: AddressMatchLevel;
  score: number;
  differingFields: string[];
};

const FIELD_KEYS = [
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
  'country',
] as const;

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeField(
  key: typeof FIELD_KEYS[number],
  value: string | null | undefined,
): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (key === 'country') return trimmed.toUpperCase();
  if (key === 'postalCode') return trimmed.replace(/\s+/g, '').toUpperCase();
  return normalizeToken(trimmed);
}

export function hasAddressContent(parts: AddressParts | null | undefined): boolean {
  if (!parts) return false;
  return FIELD_KEYS.some((key) => normalizeField(key, parts[key]).length > 0);
}

export function formatAddress(parts: AddressParts | null | undefined): string {
  if (!parts) return '';
  const lines = [
    parts.addressLine1,
    parts.addressLine2,
    [parts.postalCode, parts.city].filter(Boolean).join(' '),
    parts.region,
    parts.country,
  ].filter((line) => line?.trim());
  return lines.join('\n');
}

export function compareAddresses(
  left: AddressParts | null | undefined,
  right: AddressParts | null | undefined,
): AddressComparison {
  const leftHas = hasAddressContent(left);
  const rightHas = hasAddressContent(right);

  if (!leftHas || !rightHas) {
    return { match: 'missing', score: 0, differingFields: [] };
  }

  const differingFields: string[] = [];
  let matches = 0;
  let comparable = 0;

  for (const key of FIELD_KEYS) {
    const a = normalizeField(key, left?.[key]);
    const b = normalizeField(key, right?.[key]);
    if (!a && !b) continue;
    comparable += 1;
    if (a === b) {
      matches += 1;
    } else {
      differingFields.push(key);
    }
  }

  if (comparable === 0) {
    return { match: 'missing', score: 0, differingFields: [] };
  }

  const score = matches / comparable;

  if (score === 1) {
    return { match: 'exact', score: 1, differingFields: [] };
  }

  const countryMatch =
    normalizeField('country', left?.country) === normalizeField('country', right?.country);
  const cityMatch =
    normalizeField('city', left?.city) === normalizeField('city', right?.city);

  if (score >= 0.75 || (countryMatch && cityMatch && score >= 0.5)) {
    return { match: 'partial', score, differingFields };
  }

  return { match: 'mismatch', score, differingFields };
}
