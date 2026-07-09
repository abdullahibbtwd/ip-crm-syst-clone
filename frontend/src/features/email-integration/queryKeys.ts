export const emailIntegrationKeys = {
  all: ['email-integration'] as const,
  providers: () => [...emailIntegrationKeys.all, 'providers'] as const,
  connections: () => [...emailIntegrationKeys.all, 'connections'] as const,
  queue: () => [...emailIntegrationKeys.all, 'queue'] as const,
  queueStats: () => [...emailIntegrationKeys.all, 'queue-stats'] as const,
}
