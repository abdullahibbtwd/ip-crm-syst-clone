export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit?: number) => [...notificationKeys.all, 'list', limit ?? 30] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}
