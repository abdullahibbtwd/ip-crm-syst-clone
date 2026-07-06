import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_EMAIL_QUEUE,
  SEND_EMAIL_JOB,
  type DispatchNotificationInput,
  type SendEmailJobData,
} from './notifications.constants';
import { NotificationsGateway } from './notifications.gateway';
import { ManagingPartnerAudienceService } from './managing-partner-audience.service';

export type DispatchDeadlineNotificationInput = DispatchNotificationInput & {
  /** Attorney / docketing assignee on the deadline row (for MP copy context only). */
  assigneeName?: string;
};

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly managingPartnerAudience: ManagingPartnerAudienceService,
    @InjectQueue(NOTIFICATION_EMAIL_QUEUE)
    private readonly emailQueue: Queue<SendEmailJobData>,
  ) {}

  /**
   * Deadline alerts: assignee gets their worklist item; every active managing_partner
   * user gets a firm-wide copy (role-based — not tied to deadline assignment).
   */
  async dispatchDeadline(input: DispatchDeadlineNotificationInput) {
    await this.dispatch(input);
    await this.ensureManagingPartnerDeadlineCopies(input);
  }

  /**
   * Fan-out to managing partners only — idempotent per milestone / escalation / create.
   * Used for backfill when assignee reminders were sent before MP copies existed.
   */
  async ensureManagingPartnerDeadlineCopies(
    input: DispatchDeadlineNotificationInput,
  ): Promise<number> {
    const partners = await this.managingPartnerAudience.listActiveManagingPartners();

    if (partners.length === 0) {
      this.logger.warn(
        'No active managing_partner users found — deadline MP fan-out skipped',
      );
      return 0;
    }

    const recipients = partners.filter((partner) => partner.id !== input.userId);
    if (recipients.length === 0) return 0;

    const assigneeNote = input.assigneeName
      ? ` Attorney: ${input.assigneeName}.`
      : '';

    let sent = 0;

    for (const partner of recipients) {
      const exists = await this.managingPartnerCopyExists(partner.id, input);
      if (exists) continue;

      await this.dispatch({
        userId: partner.id,
        type: input.type,
        title: input.title,
        body: input.body
          ? `${input.body}${assigneeNote}`
          : assigneeNote.trim() || undefined,
        resource: input.resource,
        resourceId: input.resourceId,
        linkUrl: '/deadlines',
        emailTo: partner.email,
        emailSubject: input.emailSubject
          ? `[Firm] ${input.emailSubject}`
          : `[Firm] ${input.title}`,
        metadata: {
          ...input.metadata,
          audience: 'managing_partner',
          primaryAssigneeId: input.userId,
        },
        sendEmail: input.sendEmail,
      });
      sent += 1;
    }

    if (sent > 0) {
      this.logger.log(
        `Deadline notification copied to ${sent} managing partner(s)`,
      );
    }

    return sent;
  }

  private async managingPartnerCopyExists(
    partnerUserId: string,
    input: DispatchDeadlineNotificationInput,
  ): Promise<boolean> {
    if (!input.resourceId) return false;

    const metadata = input.metadata ?? {};
    const milestone =
      typeof metadata.milestone === 'string' ? metadata.milestone : undefined;
    const source =
      typeof metadata.source === 'string' ? metadata.source : undefined;
    const escalationLevel =
      typeof metadata.escalationLevel === 'number'
        ? metadata.escalationLevel
        : undefined;

    const metadataFilters: Prisma.NotificationWhereInput[] = [
      { metadata: { path: ['audience'], equals: 'managing_partner' } },
    ];

    if (milestone) {
      metadataFilters.push({
        metadata: { path: ['milestone'], equals: milestone },
      });
    } else if (source) {
      metadataFilters.push({
        metadata: { path: ['source'], equals: source },
      });
    } else if (escalationLevel !== undefined) {
      metadataFilters.push({
        metadata: { path: ['escalationLevel'], equals: escalationLevel },
      });
    } else {
      metadataFilters.push({
        title: input.title,
      });
    }

    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: partnerUserId,
        type: input.type as NotificationType,
        resource: input.resource ?? 'deadline',
        resourceId: input.resourceId,
        AND: metadataFilters,
      },
      select: { id: true },
    });

    return existing != null;
  }

  async dispatch(input: DispatchNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as NotificationType,
        title: input.title,
        body: input.body,
        resource: input.resource,
        resourceId: input.resourceId,
        linkUrl: input.linkUrl,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId: input.userId, readAt: null },
    });

    const payload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      resource: notification.resource,
      resourceId: notification.resourceId,
      linkUrl: notification.linkUrl,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      unread: true,
    };

    this.gateway.emitToUser(input.userId, 'notification', payload);
    this.gateway.emitToUser(input.userId, 'unread_count', { count: unreadCount });

    const shouldEmail = input.sendEmail !== false && Boolean(input.emailTo);
    if (shouldEmail && input.emailTo) {
      await this.emailQueue.add(SEND_EMAIL_JOB, {
        to: input.emailTo,
        subject: input.emailSubject ?? input.title,
        text: input.body ?? input.title,
        notificationId: notification.id,
      });
    }

    return notification;
  }
}
