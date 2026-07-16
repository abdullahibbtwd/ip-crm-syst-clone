import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    userId: 'u1',
    type: 'deadline_reminder',
    title: 'Due soon',
    body: null,
    resource: 'deadline',
    resourceId: 'd1',
    linkUrl: '/deadlines',
    readAt: null,
    emailSentAt: null,
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it('listForUser paginates with nextCursor', async () => {
    prisma.notification.findMany.mockResolvedValue([row({ id: 'a' }), row({ id: 'b' })]);
    const result = await service.listForUser('u1', 1);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('a');
    expect(result.items[0].unread).toBe(true);
  });

  it('getUnreadCount queries unread rows', async () => {
    prisma.notification.count.mockResolvedValue(3);
    await expect(service.getUnreadCount('u1')).resolves.toBe(3);
  });

  it('markRead throws when missing', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead('u1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('markRead updates unread notifications', async () => {
    prisma.notification.findFirst.mockResolvedValue(row());
    prisma.notification.update.mockResolvedValue(
      row({ readAt: new Date('2026-01-01') }),
    );

    const result = await service.markRead('u1', 'n1');
    expect(prisma.notification.update).toHaveBeenCalled();
    expect(result.unread).toBe(false);
  });

  it('markAllRead returns updated count', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    await expect(service.markAllRead('u1')).resolves.toEqual({ updated: 4 });
  });
});
