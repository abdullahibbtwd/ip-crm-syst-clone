export const BILLING_MODULE = 'billing';

export const BILLING_RATE_ROLES = [
  'ip_attorney',
  'trademark_attorney',
  'paralegal',
  'coordinator',
  'managing_partner',
] as const;

export type BillingRateRoleSlug = (typeof BILLING_RATE_ROLES)[number];

/** When a user has multiple roles, pick the first in this order for rate lookup. */
export const BILLING_RATE_ROLE_PRIORITY: BillingRateRoleSlug[] = [
  'managing_partner',
  'ip_attorney',
  'trademark_attorney',
  'coordinator',
  'paralegal',
];

export const MIN_TIME_ENTRY_HOURS = 0.25;
export const TIME_ENTRY_HOUR_STEP = 0.25;
