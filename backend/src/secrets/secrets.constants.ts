export const SYSTEM_SECRET_CATEGORY = {
  SSO: 'sso',
  INTEGRATION: 'integration',
  MFA_POLICY: 'mfa_policy',
} as const

export type SystemSecretCategory =
  (typeof SYSTEM_SECRET_CATEGORY)[keyof typeof SYSTEM_SECRET_CATEGORY]

export const INTEGRATION_SECRET_KEYS = {
  EPO_CONSUMER_KEY: 'epo.consumer_key',
  EPO_CONSUMER_SECRET: 'epo.consumer_secret',
  EPO_API_BASE_URL: 'epo.api_base_url',
  EPO_AUTH_URL: 'epo.auth_url',
  XERO_CLIENT_ID: 'xero.client_id',
  XERO_CLIENT_SECRET: 'xero.client_secret',
  XERO_ACCESS_TOKEN: 'xero.access_token',
  XERO_TENANT_ID: 'xero.tenant_id',
  XERO_LAST_SYNC_AT: 'xero.last_sync_at',
  QUICKBOOKS_CLIENT_ID: 'quickbooks.client_id',
  QUICKBOOKS_CLIENT_SECRET: 'quickbooks.client_secret',
  QUICKBOOKS_ACCESS_TOKEN: 'quickbooks.access_token',
  QUICKBOOKS_REALM_ID: 'quickbooks.realm_id',
  QUICKBOOKS_LAST_SYNC_AT: 'quickbooks.last_sync_at',
} as const

export const SSO_SECRET_KEYS = {
  MICROSOFT_CLIENT_ID: 'microsoft.client_id',
  MICROSOFT_CLIENT_SECRET: 'microsoft.client_secret',
  MICROSOFT_TENANT_ID: 'microsoft.tenant_id',
  GOOGLE_CLIENT_ID: 'google.client_id',
  GOOGLE_CLIENT_SECRET: 'google.client_secret',
} as const

export const MFA_POLICY_KEYS = {
  REQUIRE_INTERNAL: 'require_internal',
} as const

export const SECRETS_MODULE = 'secrets'
