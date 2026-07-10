export type RegistryBibliographicData = {
  publicationNumber: string;
  title: string | null;
  applicant: string | null;
  publicationDate: string | null;
};

export type RegistrySearchHit = {
  publicationNumber: string;
  title: string | null;
  applicant: string | null;
  publicationDate: string | null;
};

export type RegistryLegalEventKind =
  | 'office_action'
  | 'grant'
  | 'refusal'
  | 'other';

export type RegistryLegalEvent = {
  /** Stable id for dedupe: code|date|description */
  eventId: string;
  code: string;
  date: string | null;
  description: string | null;
  kind: RegistryLegalEventKind;
};

/** Application number parts extracted from OPS application-reference. */
export type EpoApplicationRef = {
  /** 8-digit base (e.g. 23717053) */
  baseNumber: string;
  /** Check digit from @doc-id last char (e.g. 1) */
  checkDigit: string;
  /** base + check digit (e.g. 237170531) */
  fullAppNumber: string;
  /** EP + fullAppNumber (e.g. EP237170531) */
  epodoc: string;
};

export type RegistryLegalStatus = {
  publicationNumber: string;
  events: RegistryLegalEvent[];
  /** Prefer this for EPO Register links when present. */
  applicationRef?: EpoApplicationRef | null;
};

export interface RegistryConnector {
  readonly name: string;

  /** Whether consumer credentials are present in env. */
  isConfigured(): boolean;

  /** OAuth client-credentials access token (cached until near expiry). */
  getAccessToken(): Promise<string>;

  /** Fetch bibliographic data for a publication number (e.g. EP3000000). */
  getBibliographicData(docNumber: string): Promise<RegistryBibliographicData>;

  /** Search published data (CQL / free-text query). Used by watch scan. */
  searchPublishedData(query: string): Promise<RegistrySearchHit[]>;

  /** Prosecution / legal status history for a patent number. */
  getLegalStatus(docNumber: string): Promise<RegistryLegalStatus>;
}

export const REGISTRY_CONNECTOR = Symbol('REGISTRY_CONNECTOR');
