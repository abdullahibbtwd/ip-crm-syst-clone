import { ConfigService } from '@nestjs/config';
import { UnlinkedEmailStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MANUAL_MAILBOX_FETCH_LIMIT } from './email-integration.constants';
import { EmailSyncService } from './email-sync.service';

describe('EmailSyncService', () => {
  let service: EmailSyncService;
  let prisma: Record<string, any>;
  let config: { get: jest.Mock };
  let connections: {
    listActiveConnections: jest.Mock;
    getAccessToken: jest.Mock;
    markSyncSuccess: jest.Mock;
    markSyncError: jest.Mock;
  };
  let microsoftMail: { fetchNewMessages: jest.Mock };
  let googleMail: { fetchNewMessages: jest.Mock };
  let emlParser: { parseBuffer: jest.Mock };
  let suggestions: { suggest: jest.Mock };
  let storage: { putObject: jest.Mock };

  beforeEach(() => {
    prisma = {
      mailboxConnection: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      unlinkedEmail: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'EMAIL_SYNC_ENABLED') return 'false';
        return fallback;
      }),
    };
    connections = {
      listActiveConnections: jest.fn(),
      getAccessToken: jest.fn(),
      markSyncSuccess: jest.fn(),
      markSyncError: jest.fn(),
    };
    microsoftMail = { fetchNewMessages: jest.fn() };
    googleMail = { fetchNewMessages: jest.fn() };
    emlParser = {
      parseBuffer: jest.fn().mockResolvedValue({
        bodyText: 'Hello',
        sender: 'sender@example.com',
        subject: 'Subject',
      }),
    };
    suggestions = {
      suggest: jest.fn().mockResolvedValue({
        suggestedMatterId: 'm1',
        suggestionReason: 'sender match',
      }),
    };
    storage = { putObject: jest.fn() };

    service = new EmailSyncService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      connections as never,
      microsoftMail as never,
      googleMail as never,
      emlParser as never,
      suggestions as never,
      storage as never,
    );
  });

  it('isEnabled reflects config flag', () => {
    expect(service.isEnabled()).toBe(false);
    config.get.mockImplementation((key: string) =>
      key === 'EMAIL_SYNC_ENABLED' ? 'true' : undefined,
    );
    expect(service.isEnabled()).toBe(true);
  });

  it('syncAllConnections skips when disabled', async () => {
    await expect(service.syncAllConnections()).resolves.toEqual({
      synced: 0,
      ingested: 0,
    });
    expect(connections.listActiveConnections).not.toHaveBeenCalled();
  });

  it('syncConnection returns 0 for missing or inactive connections', async () => {
    prisma.mailboxConnection.findUnique.mockResolvedValue(null);
    await expect(service.syncConnection('c1')).resolves.toBe(0);

    prisma.mailboxConnection.findUnique.mockResolvedValue({
      id: 'c1',
      provider: 'google',
      status: 'revoked',
      lastSyncAt: null,
    });
    await expect(service.syncConnection('c1')).resolves.toBe(0);
  });

  it('syncConnection ingests new google messages', async () => {
    prisma.mailboxConnection.findUnique.mockResolvedValue({
      id: 'c1',
      provider: 'google',
      status: 'active',
      lastSyncAt: new Date('2026-01-01'),
    });
    connections.getAccessToken.mockResolvedValue('token');
    googleMail.fetchNewMessages.mockResolvedValue([
      {
        externalMessageId: 'ext-1',
        internetMessageId: '<msg-1>',
        rawMime: Buffer.from('raw'),
        sender: 'sender@example.com',
        recipient: 'inbox@firm.com',
        subject: 'Subject',
        receivedAt: new Date('2026-01-02'),
        hasAttachments: false,
      },
    ]);
    prisma.unlinkedEmail.findFirst.mockResolvedValue(null);
    prisma.unlinkedEmail.create.mockResolvedValue({ id: 'ue1' });

    await expect(service.syncConnection('c1')).resolves.toBe(1);

    expect(googleMail.fetchNewMessages).toHaveBeenCalled();
    expect(prisma.unlinkedEmail.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UnlinkedEmailStatus.pending,
          suggestedMatterId: 'm1',
        }),
      }),
    );
    expect(connections.markSyncSuccess).toHaveBeenCalled();
  });

  it('fetchForUser runs manual sync for active connections', async () => {
    prisma.mailboxConnection.findMany.mockResolvedValue([{ id: 'c1' }]);
    prisma.mailboxConnection.findUnique.mockResolvedValue({
      id: 'c1',
      provider: 'microsoft',
      status: 'active',
      lastSyncAt: null,
    });
    connections.getAccessToken.mockResolvedValue('token');
    microsoftMail.fetchNewMessages.mockResolvedValue([]);

    await expect(service.fetchForUser('u1')).resolves.toEqual({
      ingested: 0,
      limit: MANUAL_MAILBOX_FETCH_LIMIT,
    });

    expect(microsoftMail.fetchNewMessages).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ latestOnly: true }),
    );
    expect(connections.markSyncSuccess).not.toHaveBeenCalled();
  });
});
