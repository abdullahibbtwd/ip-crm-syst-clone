import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { BroadcastAudience } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastEmailProcessor } from './processors/broadcast-email.processor';

describe('BroadcastsService', () => {
  let service: BroadcastsService;
  let prisma: Record<string, any>;
  let queue: { add: jest.Mock };

  beforeEach(() => {
    prisma = {
      broadcast: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      client: { findMany: jest.fn() },
      broadcastRecipient: { count: jest.fn() },
    };
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new BroadcastsService(
      prisma as unknown as PrismaService,
      { send: jest.fn() } as never,
      queue as never,
    );
  });

  it('listBroadcasts / getBroadcast', async () => {
    prisma.broadcast.findMany.mockResolvedValue([]);
    await expect(service.listBroadcasts()).resolves.toEqual([]);

    prisma.broadcast.findUnique.mockResolvedValue(null);
    await expect(service.getBroadcast('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('previewAudience resolves active clients with emails', async () => {
    prisma.client.findMany.mockResolvedValue([
      {
        id: 'c1',
        type: 'company',
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        contacts: [
          { role: 'primary', email: 'ops@acme.com', firstName: 'Ops' },
        ],
      },
    ]);

    const result = await service.previewAudience(
      BroadcastAudience.active_clients,
    );
    expect(result.count).toBe(1);
    expect(result.recipients[0].email).toBe('ops@acme.com');
  });

  it('createAndEnqueue validates manual audience and empty recipients', async () => {
    await expect(
      service.createAndEnqueue(
        {
          subject: 'Hi',
          bodyText: 'Body',
          audience: BroadcastAudience.manual,
        } as never,
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.client.findMany.mockResolvedValue([]);
    await expect(
      service.createAndEnqueue(
        {
          subject: 'Hi',
          bodyText: 'Body',
          audience: BroadcastAudience.active_clients,
        } as never,
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createAndEnqueue queues fan-out', async () => {
    prisma.client.findMany.mockResolvedValue([
      {
        id: 'c1',
        type: 'company',
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        contacts: [{ role: 'primary', email: 'a@x.com' }],
      },
    ]);
    prisma.broadcast.create.mockResolvedValue({
      id: 'b1',
      subject: 'Hi',
      createdBy: { id: 'u1' },
    });

    const result = await service.createAndEnqueue(
      {
        subject: ' Hi ',
        bodyText: ' Body ',
        audience: BroadcastAudience.active_clients,
      } as never,
      'u1',
    );

    expect(result.id).toBe('b1');
    expect(queue.add).toHaveBeenCalled();
  });
});

describe('BroadcastEmailProcessor', () => {
  it('routes fanout and send jobs', async () => {
    const broadcasts = {
      fanOut: jest.fn(),
      sendRecipient: jest.fn(),
    };
    const processor = new BroadcastEmailProcessor(broadcasts as never);

    await processor.process({
      name: 'broadcast-fanout',
      data: { broadcastId: 'b1' },
    } as never);
    await processor.process({
      name: 'broadcast-send-recipient',
      data: { broadcastId: 'b1', recipientId: 'r1' },
    } as never);
    await processor.process({ name: 'broadcast-fanout', data: {} } as never);

    expect(broadcasts.fanOut).toHaveBeenCalledWith('b1');
    expect(broadcasts.sendRecipient).toHaveBeenCalled();
  });
});
