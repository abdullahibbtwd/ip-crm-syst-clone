export const BROADCASTS_MODULE = 'broadcasts';

export const BROADCAST_EMAIL_QUEUE = 'broadcast-email';
export const BROADCAST_FANOUT_JOB = 'broadcast-fanout';
export const BROADCAST_SEND_JOB = 'broadcast-send-recipient';

export const BROADCAST_JOB_ATTEMPTS = 8;
export const BROADCAST_BACKOFF_MS = 60_000;

export const BROADCAST_AUDIENCES = [
  'active_clients',
  'pending_eu_renewals',
  'trademark_matters',
  'manual',
] as const;

export type BroadcastAudienceId = (typeof BROADCAST_AUDIENCES)[number];

export const BROADCAST_AUDIENCE_LABELS: Record<BroadcastAudienceId, string> = {
  active_clients: 'All active clients',
  pending_eu_renewals: 'Active clients with pending EU renewals',
  trademark_matters: 'Clients with active trademark matters',
  manual: 'Manually selected clients',
};
