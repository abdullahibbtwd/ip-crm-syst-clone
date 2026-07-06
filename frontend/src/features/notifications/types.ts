export type NotificationType =
  | 'deadline_reminder'
  | 'deadline_escalation'
  | 'task_assigned'
  | 'renewal_instruction_received'
  | 'general'

export type Notification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  resource: string | null
  resourceId: string | null
  linkUrl: string | null
  readAt: string | null
  emailSentAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  unread: boolean
}

export type NotificationListResponse = {
  items: Notification[]
  nextCursor: string | null
}
