import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEADLINE_SCAN_QUEUE,
  NOTIFICATION_EMAIL_QUEUE,
  SEND_EMAIL_JOB,
  type DispatchNotificationInput,
  type SendEmailJobData,
} from './notifications.constants';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    @InjectQueue(NOTIFICATION_EMAIL_QUEUE)
    private readonly emailQueue: Queue<SendEmailJobData>,
  ) {}

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
