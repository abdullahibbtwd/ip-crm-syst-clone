const FILING_AUTHORITY: Record<string, string> = {
  BG: 'BPO',
  EU: 'EUIPO',
  EUTM: 'EUIPO',
  EP: 'EPO',
  US: 'USPTO',
  GB: 'UKIPO',
  DE: 'DPMA',
  FR: 'INPI',
};

export function filingAuthorityForJurisdiction(jurisdiction: string): string {
  const code = jurisdiction.trim().toUpperCase();
  return FILING_AUTHORITY[code] ?? code;
}

export function filingTimelineTitle(
  jurisdiction: string,
  applicationNumber: string,
): string {
  const authority = filingAuthorityForJurisdiction(jurisdiction);
  return `Filed application with ${authority}. Application No: ${applicationNumber}.`;
}
