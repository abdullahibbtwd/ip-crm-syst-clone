const FILING_AUTHORITY: Record<string, string> = {
  BG: 'BPO',
  BPO: 'BPO',
  EU: 'EUIPO',
  EUTM: 'EUIPO',
  EM: 'EUIPO',
  EP: 'EPO',
  EPO: 'EPO',
  WO: 'WIPO',
  WIPO: 'WIPO',
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
