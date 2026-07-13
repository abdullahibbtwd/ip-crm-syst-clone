/** Document not yet published / images inquiry 404 — safe to retry later. */
export class EpoDocumentNotAvailableError extends Error {
  readonly statusCode = 404;

  constructor(message: string) {
    super(message);
    this.name = 'EpoDocumentNotAvailableError';
  }
}

/** Auth / entitlement failure — do not retry automatically. */
export class EpoDocumentAuthError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'EpoDocumentAuthError';
    this.statusCode = statusCode;
  }
}
