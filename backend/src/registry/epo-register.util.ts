/** Pure helpers for EPO Register links (no Nest deps). */

export function epoRegisterUrl(applicationNumber: string): string {
  const number = normalizeEpoAppNumber(applicationNumber);
  const query = number.startsWith('EP') ? number : `EP${number}`;
  return `https://register.epo.org/smartSearch?lng=en&query=${encodeURIComponent(query)}`;
}

export function epoRegisterUrlFromParts(
  baseNumber: string,
  checkDigit: string,
): string {
  const full = `${baseNumber.replace(/\D/g, '')}${checkDigit.replace(/\D/g, '')}`;
  return epoRegisterUrl(`EP${full}`);
}

export function normalizeEpoAppNumber(applicationNumber: string): string {
  const raw = applicationNumber
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\.[A-Z]\d*$/i, '')
    .replace(/([A-Z]{2}\d+)[A-Z]\d*$/i, '$1');
  // EP23717053.1 → EP237170531
  const withCheck = raw.replace(/^EP(\d+)\.(\d)$/i, 'EP$1$2');
  if (/^\d+$/.test(withCheck)) return `EP${withCheck}`;
  return withCheck;
}
