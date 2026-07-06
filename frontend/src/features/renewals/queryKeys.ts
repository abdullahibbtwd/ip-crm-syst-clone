export const renewalKeys = {
  all: ['renewals'] as const,
  lists: () => [...renewalKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>, scope: 'firm' | 'my' = 'firm') =>
    [...renewalKeys.lists(), scope, filters] as const,
  matterIpRight: (matterId: string, ipRightId: string) =>
    [...renewalKeys.all, 'matter', matterId, ipRightId] as const,
  detail: (id: string) => [...renewalKeys.all, 'detail', id] as const,
}
