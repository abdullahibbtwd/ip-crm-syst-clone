export const SSO_PROVIDERS = ['microsoft', 'google'] as const;

export type SsoProvider = (typeof SSO_PROVIDERS)[number];

export type SsoProviderInfo = {
  id: SsoProvider;
  name: string;
  enabled: boolean;
  redirectUri?: string;
};

export const SSO_PROVIDER_LABELS: Record<SsoProvider, string> = {
  microsoft: 'Microsoft 365',
  google: 'Google Workspace',
};
