export const REGISTRY_MODULE = 'registry';

export const REGISTRY_SCAN_QUEUE = 'registry-scan';
export const REGISTRY_SCAN_JOB = 'scan-epo-watch';
export const REGISTRY_SCAN_CONCURRENCY = 3;

export const EPO_STATUS_SCAN_QUEUE = 'epo-status-scan';
export const EPO_STATUS_SCAN_JOB = 'scan-epo-status';
export const EPO_STATUS_SCAN_CONCURRENCY = 3;

/** Background OPS published-document PDF fetch (one at a time to respect rate limits). */
export const EPO_DOCUMENT_FETCH_QUEUE = 'epo-document-fetch';
export const EPO_DOCUMENT_FETCH_JOB = 'fetch-document';
export const EPO_DOCUMENT_FETCH_CONCURRENCY = 1;
/** Delay before retrying when images are not published yet (404). */
export const EPO_DOCUMENT_NOT_AVAILABLE_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
export const EPO_DOCUMENT_FETCH_MAX_ATTEMPTS = 5;
