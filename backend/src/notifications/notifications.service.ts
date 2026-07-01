import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { parseLimit } from '../crm/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, limit?: number, cursor?: string) {
    const take = parseLimit(limit, 30);

    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items: items.map(serializeNotification),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Notification not found');
    if (row.readAt) return serializeNotification(row);

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return serializeNotification(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}

function serializeNotification(row: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  resource: string | null;
  resourceId: string | null;
  linkUrl: string | null;
  readAt: Date | null;
  emailSentAt: Date | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    resource: row.resource,
    resourceId: row.resourceId,
    linkUrl: row.linkUrl,
    readAt: row.readAt,
    emailSentAt: row.emailSentAt,
    metadata: row.metadata,
    createdAt: row.createdAt,
    unread: row.readAt == null,
  };
}
