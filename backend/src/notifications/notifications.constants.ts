export const NOTIFICATIONS_MODULE = 'notifications';

export const NOTIFICATION_EMAIL_QUEUE = 'notification-email';
export const DEADLINE_SCAN_QUEUE = 'deadline-scan';

export const DEADLINE_SCAN_JOB = 'scan-deadlines';
export const SEND_EMAIL_JOB = 'send-email';

export type SendEmailJobData = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  notificationId?: string;
};

export type DispatchNotificationInput = {
  userId: string;
  type:
    | 'deadline_reminder'
    | 'deadline_escalation'
    | 'task_assigned'
    | 'renewal_instruction_received'
    | 'partner_instruction_update'
    | 'client_approval_update'
    | 'watch_alert_created'
    | 'watch_alert_triaged'
    | 'general';
  title: string;
  body?: string;
  resource?: string;
  resourceId?: string;
  linkUrl?: string;
  emailTo?: string;
  emailSubject?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
};
