export const WATCH_MODULE = 'watch';

export const WATCH_CANONICAL_JURISDICTIONS = ['BG', 'EU', 'EP'] as const;

export type WatchCanonicalJurisdiction =
  (typeof WATCH_CANONICAL_JURISDICTIONS)[number];

export const REGISTRY_DEFAULT_JURISDICTION: Record<string, string> = {
  BPO: 'BG',
  EUIPO: 'EU',
  WIPO: 'EP',
  EPO: 'EP',
};
