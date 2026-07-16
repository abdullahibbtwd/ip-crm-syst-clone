import { NotFoundException } from '@nestjs/common';
import { CorrespondenceStatus } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { PortalMessagesService } from './portal-messages.service';

describe('PortalMessagesService', () => {
  const prisma = {
    portalBroadcastCopy: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    correspondence: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new PortalMessagesService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('listForClient merges broadcasts and correspondence sorted by date', async () => {
    prisma.portalBroadcastCopy.findMany.mockResolvedValue([
      {
        id: 'b1',
        broadcastId: 'br1',
        subject: 'Broadcast',
        bodyText: 'Hello',
        bodyHtml: '<p>Hello</p>',
        sentAt: new Date('2026-01-02T00:00:00.000Z'),
        readAt: null,
      },
    ]);
    prisma.correspondence.findMany.mockResolvedValue([
      {
        id: 'c1',
        subject: 'Letter',
        bodyText: 'Body',
        correspondenceDate: new Date('2026-01-03T00:00:00.000Z'),
        portalReadAt: null,
        direction: 'incoming',
        matter: { id: 'm1', title: 'Matter', matterType: 'trademark', status: 'open' },
        documentVersion: null,
      },
    ]);
    prisma.portalBroadcastCopy.count.mockResolvedValue(1);
    prisma.correspondence.count.mockResolvedValue(0);

    const result = await service.listForClient('client1');

    expect(result.total).toBe(2);
    expect(result.unreadCount).toBe(1);
    expect(result.items[0].kind).toBe('correspondence');
    expect(result.items[1].kind).toBe('broadcast');
  });

  it('countUnread sums broadcast and correspondence unread counts', async () => {
    prisma.portalBroadcastCopy.count.mockResolvedValue(2);
    prisma.correspondence.count.mockResolvedValue(3);
    await expect(service.countUnread('client1')).resolves.toBe(5);
    expect(prisma.correspondence.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isClientVisible: true,
          portalReadAt: null,
          status: { not: CorrespondenceStatus.draft },
        }),
      }),
    );
  });

  it('findOneForClient marks broadcast as read', async () => {
    prisma.portalBroadcastCopy.findFirst.mockResolvedValue({
      id: 'b1',
      broadcastId: 'br1',
      subject: 'Broadcast',
      bodyText: 'Hello',
      bodyHtml: null,
      sentAt: new Date('2026-01-01T00:00:00.000Z'),
      readAt: null,
    });
    prisma.portalBroadcastCopy.update.mockResolvedValue({});

    const result = await service.findOneForClient('client1', 'broadcast:b1');

    expect(prisma.portalBroadcastCopy.update).toHaveBeenCalled();
    expect(result.kind).toBe('broadcast');
    expect(result.readAt).toBeTruthy();
  });

  it('findOneForClient marks correspondence as read', async () => {
    prisma.portalBroadcastCopy.findFirst.mockResolvedValue(null);
    prisma.correspondence.findFirst.mockResolvedValue({
      id: 'c1',
      subject: 'Letter',
      bodyText: 'Body',
      correspondenceDate: new Date('2026-01-01T00:00:00.000Z'),
      portalReadAt: null,
      direction: 'incoming',
      matter: { id: 'm1', title: 'Matter', matterType: 'trademark', status: 'open' },
      documentVersion: null,
    });
    prisma.correspondence.update.mockResolvedValue({});

    const result = await service.findOneForClient('client1', 'correspondence:c1');

    expect(prisma.correspondence.update).toHaveBeenCalled();
    expect(result.kind).toBe('correspondence');
  });

  it('findOneForClient throws when message is missing', async () => {
    prisma.portalBroadcastCopy.findFirst.mockResolvedValue(null);
    prisma.correspondence.findFirst.mockResolvedValue(null);
    await expect(
      service.findOneForClient('client1', 'correspondence:missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
