export const EMAIL_INTEGRATION_MODULE = 'email_integration';

export const EMAIL_SYNC_QUEUE = 'email-sync';
export const EMAIL_SYNC_JOB = 'sync-mailbox';
export const EMAIL_SYNC_CONNECTION_JOB = 'sync-connection';
export const MAILBOX_TOKEN_REFRESH_JOB = 'refresh-mailbox-tokens';

export const OUTBOUND_EMAIL_QUEUE = 'outbound-email';
export const OUTBOUND_EMAIL_JOB = 'send-outbound-email';

export const MAILBOX_PROVIDERS = ['microsoft', 'google'] as const;
export type MailboxProviderId = (typeof MAILBOX_PROVIDERS)[number];

export const MAILBOX_PROVIDER_LABELS: Record<MailboxProviderId, string> = {
  microsoft: 'Microsoft 365',
  google: 'Google Workspace',
};

/** Max messages pulled per manual "Fetch emails" click. */
export const MANUAL_MAILBOX_FETCH_LIMIT = 5;

/** Max messages per scheduled / full sync pass. */
export const SCHEDULED_MAILBOX_FETCH_LIMIT = 25;

/** Staging .eml prefix in MinIO (`mailbox/{connectionId}/{msgId}.eml`). */
export const MAILBOX_STAGING_PREFIX = 'mailbox/';

/** Auto-delete staging .eml objects older than this many days. */
export const MAILBOX_STAGING_RETENTION_DAYS = 30;

/**
 * BullMQ retries for sync-connection / outbound jobs.
 * Exponential backoff from 1m → 2m → 4m → … (capped by attempts).
 */
export const EMAIL_SYNC_JOB_ATTEMPTS = 8;
export const EMAIL_SYNC_BACKOFF_MS = 60_000;

export const OUTBOUND_EMAIL_JOB_ATTEMPTS = 8;
export const OUTBOUND_EMAIL_BACKOFF_MS = 60_000;

/** Refresh access tokens this many ms before expiry. */
export const MAILBOX_TOKEN_REFRESH_SKEW_MS = 15 * 60 * 1000;

export const MICROSOFT_MAILBOX_SCOPES =
  'openid email profile offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send';

export const GOOGLE_MAILBOX_SCOPES =
  'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

/** Seeded document template slug for office-action reply drafts. */
export const OFFICE_ACTION_REPLY_TEMPLATE_SLUG = 'office-action-response-email';
