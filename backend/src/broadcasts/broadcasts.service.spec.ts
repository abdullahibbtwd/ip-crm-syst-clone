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
  let email: { send: jest.Mock };

  const clientRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'c1',
    type: 'company',
    companyName: 'Acme',
    firstName: null,
    lastName: null,
    contacts: [{ role: 'primary', email: 'ops@acme.com', firstName: 'Ops' }],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      broadcast: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      client: { findMany: jest.fn() },
      renewalWindow: { findMany: jest.fn() },
      matter: { findMany: jest.fn() },
      broadcastRecipient: {
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      portalBroadcastCopy: { upsert: jest.fn() },
    };
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    email = { send: jest.fn().mockResolvedValue(undefined) };
    service = new BroadcastsService(
      prisma as unknown as PrismaService,
      email as never,
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

  it('getBroadcast returns broadcast with recipients', async () => {
    prisma.broadcast.findUnique.mockResolvedValue({
      id: 'b1',
      subject: 'Hi',
      recipients: [],
    });
    await expect(service.getBroadcast('b1')).resolves.toMatchObject({
      id: 'b1',
    });
  });

  it('previewAudience resolves pending EU renewals', async () => {
    prisma.renewalWindow.findMany.mockResolvedValue([{ clientId: 'c1' }]);
    prisma.client.findMany.mockResolvedValue([clientRow()]);

    const result = await service.previewAudience(
      BroadcastAudience.pending_eu_renewals,
    );
    expect(result.count).toBe(1);
    expect(prisma.renewalWindow.findMany).toHaveBeenCalled();
  });

  it('previewAudience resolves trademark matters', async () => {
    prisma.matter.findMany.mockResolvedValue([{ clientId: 'c1' }]);
    prisma.client.findMany.mockResolvedValue([clientRow()]);

    const result = await service.previewAudience(
      BroadcastAudience.trademark_matters,
    );
    expect(result.count).toBe(1);
  });

  it('previewAudience deduplicates emails and skips clients without contacts', async () => {
    prisma.client.findMany.mockResolvedValue([
      clientRow({
        contacts: [{ role: 'primary', email: 'shared@x.com' }],
      }),
      {
        id: 'c2',
        type: 'company',
        companyName: 'Beta',
        firstName: null,
        lastName: null,
        contacts: [{ role: 'primary', email: 'shared@x.com' }],
      },
      {
        id: 'c3',
        type: 'company',
        companyName: 'No Email Co',
        firstName: null,
        lastName: null,
        contacts: [],
      },
    ]);

    const result = await service.previewAudience(
      BroadcastAudience.active_clients,
    );
    expect(result.count).toBe(1);
    expect(result.recipients[0].email).toBe('shared@x.com');
  });

  it('fanOut no-ops when broadcast is missing', async () => {
    prisma.broadcast.findUnique.mockResolvedValue(null);
    await service.fanOut('missing');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('fanOut enqueues send jobs for pending recipients', async () => {
    prisma.broadcast.findUnique.mockResolvedValue({
      id: 'b1',
      recipients: [{ id: 'r1' }, { id: 'r2' }],
    });
    prisma.broadcast.update.mockResolvedValue({});

    await service.fanOut('b1');

    expect(prisma.broadcast.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { status: 'sending' },
    });
    expect(queue.add).toHaveBeenCalledTimes(2);
  });

  it('sendRecipient sends email and upserts portal copy', async () => {
    prisma.broadcastRecipient.findUnique.mockResolvedValue({
      id: 'r1',
      broadcastId: 'b1',
      clientId: 'c1',
      email: 'client@x.com',
      status: 'pending',
      broadcast: {
        subject: 'Subject',
        bodyText: 'Text',
        bodyHtml: '<p>Text</p>',
      },
    });
    prisma.broadcastRecipient.update.mockResolvedValue({});
    prisma.broadcast.update.mockResolvedValue({});
    prisma.broadcastRecipient.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await service.sendRecipient({ broadcastId: 'b1', recipientId: 'r1' });

    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@x.com', subject: 'Subject' }),
    );
    expect(prisma.portalBroadcastCopy.upsert).toHaveBeenCalled();
    expect(prisma.broadcast.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { sentCount: { increment: 1 } },
    });
  });

  it('sendRecipient skips already-sent and mismatched recipients', async () => {
    prisma.broadcastRecipient.findUnique.mockResolvedValue({
      id: 'r1',
      broadcastId: 'other',
      status: 'pending',
      broadcast: { subject: 'S', bodyText: 'T' },
    });
    await service.sendRecipient({ broadcastId: 'b1', recipientId: 'r1' });
    expect(email.send).not.toHaveBeenCalled();

    prisma.broadcastRecipient.findUnique.mockResolvedValue({
      id: 'r1',
      broadcastId: 'b1',
      status: 'sent',
      broadcast: { subject: 'S', bodyText: 'T' },
    });
    await service.sendRecipient({ broadcastId: 'b1', recipientId: 'r1' });
    expect(email.send).not.toHaveBeenCalled();
  });

  it('sendRecipient marks failure and completes broadcast when all failed', async () => {
    prisma.broadcastRecipient.findUnique.mockResolvedValue({
      id: 'r1',
      broadcastId: 'b1',
      clientId: null,
      email: 'bad@x.com',
      status: 'pending',
      broadcast: { subject: 'S', bodyText: 'T', bodyHtml: null },
    });
    email.send.mockRejectedValue(new Error('SMTP down'));
    prisma.broadcastRecipient.update.mockResolvedValue({});
    prisma.broadcast.update.mockResolvedValue({});
    prisma.broadcastRecipient.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    await expect(
      service.sendRecipient({ broadcastId: 'b1', recipientId: 'r1' }),
    ).rejects.toThrow('SMTP down');

    expect(prisma.broadcastRecipient.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({ status: 'failed' }),
    });
    expect(prisma.broadcast.update).toHaveBeenLastCalledWith({
      where: { id: 'b1' },
      data: expect.objectContaining({ status: 'failed' }),
    });
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
