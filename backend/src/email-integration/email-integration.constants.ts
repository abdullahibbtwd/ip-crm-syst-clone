export const EMAIL_INTEGRATION_MODULE = 'email_integration';

export const EMAIL_SYNC_QUEUE = 'email-sync';
export const EMAIL_SYNC_JOB = 'sync-mailbox';
export const EMAIL_SYNC_CONNECTION_JOB = 'sync-connection';

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
