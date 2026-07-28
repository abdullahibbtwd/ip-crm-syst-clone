import type { RegistryAddressSnapshot } from '../registry-address.types';

export type RegistryBibliographicData = {
  publicationNumber: string;
  title: string | null;
  applicant: string | null;
  applicantAddress: RegistryAddressSnapshot | null;
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

/** Publication reference used for OPS images / fullimage retrieval. */
export type EpoPublicationRef = {
  /** e.g. EP1000000.A1 */
  epodoc: string;
  country: string;
  docNumber: string;
  kind: string | null;
};

export type RegistryLegalStatus = {
  publicationNumber: string;
  events: RegistryLegalEvent[];
  /** Prefer this for EPO Register links when present. */
  applicationRef?: EpoApplicationRef | null;
  /** Prefer A1/B1 publication ref when present (for document fetch). */
  publicationRef?: EpoPublicationRef | null;
};

export type EpoFetchedDocument = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  pageCount: number;
  publicationNumber: string;
  imagePath: string;
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

  /**
   * Fetch the published full-document as a merged PDF via OPS images
   * (inquiry → per-page PDF → merge). Requires a publication number with kind
   * when possible (e.g. EP1000000.A1).
   */
  getDocument(publicationNumber: string): Promise<EpoFetchedDocument>;
}

export const REGISTRY_CONNECTOR = Symbol('REGISTRY_CONNECTOR');
